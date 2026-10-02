import Supplier from '../models/Supplier.js';
import PurchaseRecord from '../models/PurchaseRecord.js';
import Product from '../models/Product.js';

// @desc    Get all suppliers or search
// @route   GET /api/suppliers
// @access  Private
export const getSuppliers = async (req, res) => {
  const keyword = req.query.keyword
    ? {
        $or: [
          { name: { $regex: req.query.keyword, $options: 'i' } },
          { contactPerson: { $regex: req.query.keyword, $options: 'i' } },
          { mobile: { $regex: req.query.keyword, $options: 'i' } }
        ]
      }
    : {};

  try {
    const suppliers = await Supplier.find(keyword).sort({ name: 1 });
    res.json({ success: true, data: suppliers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a new supplier
// @route   POST /api/suppliers
// @access  Private
export const createSupplier = async (req, res) => {
  const { name, contactPerson, mobile, email, address, gstin } = req.body;

  try {
    const supplier = await Supplier.create({
      name,
      contactPerson,
      mobile,
      email,
      address,
      gstin
    });

    res.status(201).json({ success: true, data: supplier });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update supplier details
// @route   PUT /api/suppliers/:id
// @access  Private
export const updateSupplier = async (req, res) => {
  const { name, contactPerson, mobile, email, address, gstin, outstandingBalance } = req.body;

  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    supplier.name = name || supplier.name;
    supplier.contactPerson = contactPerson !== undefined ? contactPerson : supplier.contactPerson;
    supplier.mobile = mobile || supplier.mobile;
    supplier.email = email !== undefined ? email : supplier.email;
    supplier.address = address !== undefined ? address : supplier.address;
    supplier.gstin = gstin !== undefined ? gstin : supplier.gstin;
    supplier.outstandingBalance = outstandingBalance !== undefined ? outstandingBalance : supplier.outstandingBalance;

    const updatedSupplier = await supplier.save();
    res.json({ success: true, data: updatedSupplier });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete supplier
// @route   DELETE /api/suppliers/:id
// @access  Private/Admin
export const deleteSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (supplier) {
      // Don't delete if they have an active outstanding balance
      if (supplier.outstandingBalance !== 0) {
        return res.status(400).json({ success: false, message: 'Cannot delete supplier with active outstanding balance of ₹' + supplier.outstandingBalance });
      }
      await Supplier.deleteOne({ _id: req.params.id });
      res.json({ success: true, message: 'Supplier deleted successfully' });
    } else {
      res.status(404).json({ success: false, message: 'Supplier not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Record a new stock purchase from a supplier & increment inventory
// @route   POST /api/suppliers/purchases
// @access  Private
export const createPurchaseRecord = async (req, res) => {
  const { supplierId, invoiceNumber, purchaseDate, items, amountPaid } = req.body;

  try {
    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    let subtotal = 0;
    let totalGst = 0;
    const verifiedItems = [];

    // 1. Process items, check product existences, compile totals
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({ success: false, message: `Product ${item.product} not found` });
      }

      const qty = Number(item.quantity);
      const price = Number(item.purchasePrice);
      const gstRate = Number(item.gstRate || product.gstRate || 18);

      const itemTotal = price * qty;
      const itemTaxable = itemTotal / (1 + (gstRate / 100));
      const itemGst = itemTotal - itemTaxable;

      subtotal += itemTaxable;
      totalGst += itemGst;

      verifiedItems.push({
        product: product._id,
        quantity: qty,
        purchasePrice: price,
        gstRate,
        imeiList: item.imeiList || []
      });

      // 2. Dynamically increment stock in our database
      product.stock += qty;
      if (product.hasIMEI && item.imeiList && item.imeiList.length > 0) {
        // Append new IMEIs if provided
        product.imeiList = [...(product.imeiList || []), ...item.imeiList];
      }
      
      // Update historical purchase price if needed
      product.purchasePrice = price;
      await product.save();
    }

    const totalAmount = subtotal + totalGst;
    const paid = Number(amountPaid || 0);
    const balanceDue = totalAmount - paid;

    let status = 'Unpaid';
    if (paid >= totalAmount) {
      status = 'Paid';
    } else if (paid > 0) {
      status = 'Partial';
    }

    // 3. Create purchase record
    const purchase = await PurchaseRecord.create({
      supplier: supplier._id,
      invoiceNumber,
      purchaseDate: purchaseDate || new Date(),
      items: verifiedItems,
      subtotal,
      totalGst,
      totalAmount,
      amountPaid: paid,
      balanceDue,
      status
    });

    // 4. Update supplier credit accounts outstanding balance
    supplier.outstandingBalance += balanceDue;
    await supplier.save();

    res.status(201).json({ success: true, data: purchase });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all purchase invoices
// @route   GET /api/suppliers/purchases
// @access  Private
export const getPurchaseRecords = async (req, res) => {
  try {
    const purchases = await PurchaseRecord.find({})
      .populate('supplier', 'name contactPerson mobile')
      .populate('items.product', 'name sku modelNumber')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: purchases });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update / Edit an existing supplier purchase bill
// @route   PUT /api/suppliers/purchases/:id
// @access  Private
export const updatePurchaseRecord = async (req, res) => {
  const { invoiceNumber, purchaseDate, items, amountPaid } = req.body;

  try {
    const purchase = await PurchaseRecord.findById(req.params.id);
    if (!purchase) {
      return res.status(404).json({ success: false, message: 'Purchase bill not found' });
    }

    const supplier = await Supplier.findById(purchase.supplier);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    // 1. Revert previous stock & balance
    for (const oldItem of purchase.items) {
      const prod = await Product.findById(oldItem.product);
      if (prod) {
        prod.stock = Math.max(0, prod.stock - oldItem.quantity);
        if (prod.hasIMEI && oldItem.imeiList && oldItem.imeiList.length > 0) {
          prod.imeiList = (prod.imeiList || []).filter(im => !oldItem.imeiList.includes(im));
        }
        await prod.save();
      }
    }

    // Deduct old balance due from supplier
    supplier.outstandingBalance = Math.max(0, supplier.outstandingBalance - purchase.balanceDue);

    // 2. Process new / updated items
    let subtotal = 0;
    let totalGst = 0;
    const verifiedItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({ success: false, message: `Product ${item.product} not found` });
      }

      const qty = Number(item.quantity);
      const price = Number(item.purchasePrice);
      const gstRate = Number(item.gstRate !== undefined ? item.gstRate : (product.gstRate || 18));

      const itemTotal = price * qty;
      const itemTaxable = itemTotal / (1 + (gstRate / 100));
      const itemGst = itemTotal - itemTaxable;

      subtotal += itemTaxable;
      totalGst += itemGst;

      const itemImeis = item.imeiList 
        ? (Array.isArray(item.imeiList) ? item.imeiList : String(item.imeiList).split(',').map(i => i.trim()).filter(Boolean)) 
        : [];

      verifiedItems.push({
        product: product._id,
        quantity: qty,
        purchasePrice: price,
        gstRate,
        imeiList: itemImeis
      });

      // Apply new stock
      product.stock += qty;
      if (product.hasIMEI && itemImeis.length > 0) {
        product.imeiList = [...new Set([...(product.imeiList || []), ...itemImeis])];
      }
      product.purchasePrice = price;
      await product.save();
    }

    const totalAmount = subtotal + totalGst;
    const paid = amountPaid !== undefined ? Number(amountPaid) : purchase.amountPaid;
    const balanceDue = Math.max(0, totalAmount - paid);

    let status = 'Unpaid';
    if (paid >= totalAmount) {
      status = 'Paid';
    } else if (paid > 0) {
      status = 'Partial';
    }

    // 3. Update purchase document
    if (invoiceNumber) purchase.invoiceNumber = invoiceNumber;
    if (purchaseDate) purchase.purchaseDate = purchaseDate;
    purchase.items = verifiedItems;
    purchase.subtotal = Number(subtotal.toFixed(2));
    purchase.totalGst = Number(totalGst.toFixed(2));
    purchase.totalAmount = Number(totalAmount.toFixed(2));
    purchase.amountPaid = paid;
    purchase.balanceDue = Number(balanceDue.toFixed(2));
    purchase.status = status;

    await purchase.save();

    // 4. Update supplier credit balance
    supplier.outstandingBalance += purchase.balanceDue;
    await supplier.save();

    res.json({ success: true, data: purchase, message: 'Supplier bill updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single supplier profile by ID with purchase history
// @route   GET /api/suppliers/:id
// @access  Private
export const getSupplierById = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    const purchases = await PurchaseRecord.find({ supplier: supplier._id })
      .populate('items.product', 'name sku modelNumber')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        supplier,
        purchases
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Record a payment against a supplier purchase bill
// @route   POST /api/suppliers/purchases/:id/payment
// @access  Private
export const recordBillPayment = async (req, res) => {
  const { paymentAmount } = req.body;

  try {
    const payVal = Number(paymentAmount);
    if (isNaN(payVal) || payVal <= 0) {
      return res.status(400).json({ success: false, message: 'Payment amount must be greater than zero' });
    }

    const purchase = await PurchaseRecord.findById(req.params.id);
    if (!purchase) {
      return res.status(404).json({ success: false, message: 'Purchase bill not found' });
    }

    const supplier = await Supplier.findById(purchase.supplier);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier account not found' });
    }

    // Update bill payment metrics
    const actualPay = Math.min(payVal, purchase.balanceDue);
    purchase.amountPaid += actualPay;
    purchase.balanceDue = Math.max(0, purchase.totalAmount - purchase.amountPaid);

    if (purchase.balanceDue <= 0) {
      purchase.status = 'Paid';
    } else if (purchase.amountPaid > 0) {
      purchase.status = 'Partial';
    }

    await purchase.save();

    // Update supplier outstanding balance
    supplier.outstandingBalance = Math.max(0, supplier.outstandingBalance - actualPay);
    await supplier.save();

    res.json({
      success: true,
      data: purchase,
      message: `Payment of ₹${actualPay} recorded successfully.`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

