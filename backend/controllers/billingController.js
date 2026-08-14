import Invoice from '../models/Invoice.js';
import Product from '../models/Product.js';
import Customer from '../models/Customer.js';
import PDFDocument from 'pdfkit';

// Helper to generate dynamic invoice numbers: INV-YYYYMMDD-HHMMSS
const generateInvoiceNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const uniqueNum = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
  return `INV-${year}${month}${day}-${uniqueNum}`;
};

// @desc    Process cart checkout & generate invoice
// @route   POST /api/billing/checkout
// @access  Private
export const checkout = async (req, res) => {
  const { customerMobile, customerName, customerEmail, customerAddress, items, paymentMethod, paymentDetails, extraDiscount, giftItem } = req.body;

  try {
    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    // 1. Resolve or create customer profile
    let customer = await Customer.findOne({ mobile: customerMobile });
    if (!customer) {
      customer = await Customer.create({
        name: customerName,
        mobile: customerMobile,
        email: customerEmail || '',
        address: customerAddress || '',
        loyaltyPoints: 0
      });
    }

    let calculatedSubtotal = 0; // sum of taxable values
    let calculatedTotalGst = 0;
    let calculatedTotalDiscount = Number(extraDiscount || 0);
    const invoiceItems = [];

    // 2. Validate products and decrement stock levels
    for (const item of items) {
      const product = await Product.findById(item.product).populate('brand').populate('category');
      if (!product) {
        return res.status(404).json({ success: false, message: `Product with ID ${item.product} not found` });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({ success: false, message: `Insufficient stock for product: ${product.name} (Available: ${product.stock})` });
      }

      // Handle serial / IMEI locks
      if (product.hasIMEI) {
        if (!item.imei) {
          return res.status(400).json({ success: false, message: `Product ${product.name} requires an IMEI number selection` });
        }

        const imeiIndex = product.imeiList.indexOf(item.imei);
        if (imeiIndex === -1) {
          return res.status(400).json({ success: false, message: `Selected IMEI ${item.imei} is not available in stock` });
        }

        // Drop the sold IMEI from stock list
        product.imeiList.splice(imeiIndex, 1);
        product.stock = product.imeiList.length;
      } else {
        // Drop simple quantity count
        product.stock -= item.quantity;
      }

      await product.save();

      // GST calculations (sellingPrice has GST inclusive in Indian Retail POS.
      // So let's back-calculate Taxable Value and GST Amount!)
      // Product price = Taxable + GST
      // Product price = Taxable + (Taxable * gstRate / 100)
      // Product price = Taxable * (1 + gstRate / 100)
      // Taxable = Product price / (1 + gstRate / 100)

      const sellingPriceAfterItemDiscount = item.sellingPrice - (item.discount || 0);
      const itemGstFactor = 1 + (product.gstRate / 100);
      const unitTaxable = sellingPriceAfterItemDiscount / itemGstFactor;
      const unitGst = sellingPriceAfterItemDiscount - unitTaxable;

      const lineTaxable = unitTaxable * item.quantity;
      const lineGst = unitGst * item.quantity;
      const lineFinal = sellingPriceAfterItemDiscount * item.quantity;

      calculatedSubtotal += lineTaxable;
      calculatedTotalGst += lineGst;
      calculatedTotalDiscount += (item.discount || 0) * item.quantity;

      invoiceItems.push({
        product: product._id,
        name: product.name,
        sku: product.sku,
        brandName: product.brand.name,
        categoryName: product.category.name,
        quantity: item.quantity,
        mrp: product.mrp,
        sellingPrice: item.sellingPrice,
        discount: item.discount || 0,
        couponCode: item.couponCode || '',
        gstRate: product.gstRate,
        gstAmount: Number(lineGst.toFixed(2)),
        taxableAmount: Number(lineTaxable.toFixed(2)),
        finalPrice: Number(lineFinal.toFixed(2)),
        imei: item.imei || ''
      });
    }

    // Grand total
    const finalPayable = calculatedSubtotal + calculatedTotalGst - extraDiscount;
    const loyaltyPointsEarned = Math.floor(finalPayable / 100); // 1 point per 100 rupees spent

    // 3. Create the Invoice
    const invoice = await Invoice.create({
      invoiceNumber: generateInvoiceNumber(),
      customer: {
        customerId: customer._id,
        name: customer.name,
        mobile: customer.mobile,
        email: customer.email,
        address: customer.address
      },
      items: invoiceItems,
      subtotal: Number(calculatedSubtotal.toFixed(2)),
      totalGst: Number(calculatedTotalGst.toFixed(2)),
      totalDiscount: Number(calculatedTotalDiscount.toFixed(2)),
      finalAmount: Math.round(finalPayable), // round off to nearest rupee
      paymentMethod,
      paymentDetails: paymentDetails || '',
      giftItem: giftItem || '',
      cashier: {
        userId: req.user._id,
        name: req.user.name
      },
      loyaltyPointsEarned
    });

    // 4. Update Customer purchase aggregate stats
    customer.purchaseCount += 1;
    customer.totalSpent += invoice.finalAmount;
    customer.loyaltyPoints += loyaltyPointsEarned;
    await customer.save();

    res.status(201).json({ success: true, data: invoice });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all invoices
// @route   GET /api/billing/invoices
// @access  Private
export const getInvoices = async (req, res) => {
  const keyword = req.query.keyword
    ? {
      $or: [
        { invoiceNumber: { $regex: req.query.keyword, $options: 'i' } },
        { 'customer.name': { $regex: req.query.keyword, $options: 'i' } },
        { 'customer.mobile': { $regex: req.query.keyword, $options: 'i' } }
      ]
    }
    : {};

  try {
    const invoices = await Invoice.find(keyword).sort({ createdAt: -1 });
    res.json({ success: true, data: invoices });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single invoice detail
// @route   GET /api/billing/invoices/:id
// @access  Private
export const getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (invoice) {
      res.json({ success: true, data: invoice });
    } else {
      res.status(404).json({ success: false, message: 'Invoice not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Generate professional GST Invoice PDF using PDFKit
// @route   GET /api/billing/invoices/:id/pdf
// @access  Private
export const generateInvoicePDF = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const doc = new PDFDocument({ margin: 30, size: 'A4' });

    // Set headers for file stream
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=Invoice-${invoice.invoiceNumber}.pdf`);

    doc.pipe(res);

    // --- Header Section ---
    doc.fillColor('#0f172a').fontSize(20).font('Helvetica-Bold').text('TECH MART SALES & SERVICE', 30, 30);
    doc.fontSize(8).font('Helvetica').fillColor('#64748b');
    doc.text('Smartphones, Televisions & Home Appliances Hub', 30, 52);
    doc.text('GSTIN: 29AENP27677M12ZZ | Ph: 8050336783 & 9900642249', 30, 63);
    doc.text('Ganj circle, Koppal, karnataka-583231', 30, 74);

    // --- Invoice Metadata ---
    doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold').text('TAX INVOICE', 400, 30, { align: 'right' });
    doc.fontSize(9).font('Helvetica').fillColor('#475569');
    doc.text(`Invoice No: ${invoice.invoiceNumber}`, 400, 48, { align: 'right' });
    doc.text(`Date: ${new Date(invoice.createdAt).toLocaleDateString('en-IN')}`, 400, 60, { align: 'right' });
    doc.text(`Payment: ${invoice.paymentMethod}`, 400, 72, { align: 'right' });

    doc.moveTo(30, 95).lineTo(565, 95).strokeColor('#cbd5e1').stroke();

    // --- Customer Section ---
    doc.fillColor('#1e293b').fontSize(10).font('Helvetica-Bold').text('Billed To:', 30, 110);
    doc.fontSize(9).font('Helvetica').fillColor('#475569');
    doc.text(`Customer Name: ${invoice.customer.name}`, 30, 124);
    doc.text(`Mobile: ${invoice.customer.mobile}`, 30, 136);
    if (invoice.customer.email) doc.text(`Email: ${invoice.customer.email}`, 30, 148);
    if (invoice.customer.address) doc.text(`Address: ${invoice.customer.address}`, 30, 160);

    doc.moveTo(30, 180).lineTo(565, 180).strokeColor('#cbd5e1').stroke();

    // --- Table Headers ---
    let y = 195;
    doc.fillColor('#1e293b').fontSize(9).font('Helvetica-Bold');
    doc.text('S.No', 30, y);
    doc.text('Product / Details', 65, y);
    doc.text('Qty', 280, y, { width: 30, align: 'center' });
    doc.text('MRP (Rs)', 320, y, { width: 50, align: 'right' });
    doc.text('Taxable (Rs)', 380, y, { width: 50, align: 'right' });
    doc.text('GST %', 440, y, { width: 35, align: 'center' });
    doc.text('Total (Rs)', 485, y, { width: 80, align: 'right' });

    doc.moveTo(30, 210).lineTo(565, 210).strokeColor('#94a3b8').lineWidth(1.5).stroke();

    // --- Table Rows ---
    y = 220;
    invoice.items.forEach((item, index) => {
      doc.fillColor('#334155').fontSize(8.5).font('Helvetica');
      doc.text(String(index + 1), 30, y);

      // Multi-brand product string
      doc.font('Helvetica-Bold').fillColor('#0f172a').text(`${item.brandName ? item.brandName + ' - ' : ''}${item.name}`, 65, y);

      const halfGst = (item.gstAmount / 2).toFixed(2);

      if (item.imei) {
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#0284c7');
        doc.text(`IMEI / Serial No: ${item.imei}`, 65, y + 11);
        doc.font('Helvetica').fontSize(7.5).fillColor('#64748b');
        doc.text(`SKU: ${item.sku} | (CGST: Rs. ${halfGst} | SGST: Rs. ${halfGst})`, 65, y + 21);
      } else {
        doc.font('Helvetica').fontSize(7.5).fillColor('#64748b');
        doc.text(`SKU: ${item.sku} | (CGST: Rs. ${halfGst} | SGST: Rs. ${halfGst})`, 65, y + 11);
      }

      doc.fontSize(8.5).fillColor('#334155');
      doc.text(String(item.quantity), 280, y, { width: 30, align: 'center' });
      doc.text(`${item.mrp.toFixed(2)}`, 320, y, { width: 50, align: 'right' });
      doc.text(`${item.taxableAmount.toFixed(2)}`, 380, y, { width: 50, align: 'right' });
      doc.text(`${item.gstRate}%`, 440, y, { width: 35, align: 'center' });
      doc.text(`${item.finalPrice.toFixed(2)}`, 485, y, { width: 80, align: 'right' });

      y += item.imei ? 36 : 30;
    });

    doc.moveTo(30, y).lineTo(565, y).strokeColor('#cbd5e1').lineWidth(1).stroke();

    // --- Summary Section ---
    y += 15;
    doc.fillColor('#475569').fontSize(9).font('Helvetica-Bold');
    doc.text('Taxable Amount Total (Subtotal):', 300, y, { width: 150, align: 'left' });
    doc.text(`Rs. ${invoice.subtotal.toFixed(2)}`, 450, y, { width: 115, align: 'right' });

    y += 15;
    doc.text('Total Tax (GST):', 300, y, { width: 150, align: 'left' });
    doc.text(`Rs. ${invoice.totalGst.toFixed(2)}`, 450, y, { width: 115, align: 'right' });

    if (invoice.totalDiscount > 0) {
      y += 15;
      doc.fillColor('#b91c1c');
      doc.text('Discount Applied:', 300, y, { width: 150, align: 'left' });
      doc.text(`- Rs. ${invoice.totalDiscount.toFixed(2)}`, 450, y, { width: 115, align: 'right' });
    }

    if (invoice.giftItem) {
      doc.fillColor('#059669').fontSize(9).font('Helvetica-Bold');
      doc.text(`Complimentary Gift / Offer: ${invoice.giftItem}`, 30, y);
    }

    y += 20;
    doc.rect(300, y - 5, 265, 25).fill('#f1f5f9');
    doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold');
    doc.text('Grand Total (Round Off):', 305, y, { width: 150 });
    doc.text(`Rs. ${invoice.finalAmount.toLocaleString('en-IN')}.00`, 450, y, { width: 110, align: 'right' });

    // --- Footer Section ---
    doc.fillColor('#64748b').fontSize(8.5).font('Helvetica-Oblique');
    doc.text('Thank you for shopping with TECH MART SALES & SERVICE!', 30, 720, { align: 'center' });
    doc.fontSize(7).text('This is a computer-generated GST tax invoice and does not require signatures.', 30, 735, { align: 'center' });
    doc.text('Warranty as per manufacturer terms. Exchange rules apply within 7 days with original invoice & packing.', 30, 745, { align: 'center' });

    doc.end();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
