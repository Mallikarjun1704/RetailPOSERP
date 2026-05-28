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
      const gstRate = Number(item.gstRate || product.gstRate);

      const itemTaxable = price * qty;
      const itemGst = (itemTaxable * gstRate) / 100;

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
        // Append new IMEIs
        product.imeiList = [...product.imeiList, ...item.imeiList];
        // Enforce stock consistency with IMEI count
        product.stock = product.imeiList.length;
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
