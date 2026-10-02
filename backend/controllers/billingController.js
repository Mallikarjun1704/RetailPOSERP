import Invoice from '../models/Invoice.js';
import Product from '../models/Product.js';
import Customer from '../models/Customer.js';
import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Resolve __dirname for ES module
const __filename_ctrl = fileURLToPath(import.meta.url);
const __dirname_ctrl = path.dirname(__filename_ctrl);

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

      // Handle serial / IMEI locks (optional)
      if (product.hasIMEI && item.imei) {
        const imeiIndex = product.imeiList.indexOf(item.imei);
        if (imeiIndex !== -1) {
          // Drop the sold IMEI from stock list
          product.imeiList.splice(imeiIndex, 1);
        }
      }
      // Drop quantity count from stock
      product.stock -= item.quantity;

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
  try {
    const invoices = await Invoice.find({}).sort({ createdAt: -1 });
    res.json({ success: true, data: invoices });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single invoice by ID
// @route   GET /api/billing/invoices/:id
// @access  Private
export const getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }
    res.json({ success: true, data: invoice });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update / Edit an existing invoice (items, price, IMEI, GST, customer)
// @route   PUT /api/billing/invoices/:id
// @access  Private
export const updateInvoice = async (req, res) => {
  const { customer, items, paymentMethod, paymentDetails, giftItem, extraDiscount } = req.body;

  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const previousFinalAmount = invoice.finalAmount;

    // 1. Update customer details if provided
    if (customer) {
      invoice.customer.name = customer.name || invoice.customer.name;
      invoice.customer.mobile = customer.mobile || invoice.customer.mobile;
      if (customer.email !== undefined) invoice.customer.email = customer.email;
      if (customer.address !== undefined) invoice.customer.address = customer.address;
    }

    // 2. Update items if provided
    if (items && Array.isArray(items) && items.length > 0) {
      let calculatedSubtotal = 0;
      let calculatedTotalGst = 0;
      let calculatedTotalDiscount = Number(extraDiscount !== undefined ? extraDiscount : invoice.totalDiscount || 0);
      const updatedInvoiceItems = [];

      for (const item of items) {
        const product = await Product.findById(item.product || item._id);

        const qty = Number(item.quantity || 1);
        const sellingPrice = Number(item.sellingPrice);
        const itemDiscount = Number(item.discount || 0);
        const gstRate = Number(item.gstRate !== undefined ? item.gstRate : (product?.gstRate || 18));

        const sellingPriceAfterItemDiscount = sellingPrice - itemDiscount;
        const itemGstFactor = 1 + (gstRate / 100);
        const unitTaxable = sellingPriceAfterItemDiscount / itemGstFactor;
        const unitGst = sellingPriceAfterItemDiscount - unitTaxable;

        const lineTaxable = unitTaxable * qty;
        const lineGst = unitGst * qty;
        const lineFinal = sellingPriceAfterItemDiscount * qty;

        calculatedSubtotal += lineTaxable;
        calculatedTotalGst += lineGst;
        calculatedTotalDiscount += itemDiscount * qty;

        updatedInvoiceItems.push({
          product: product ? product._id : item.product,
          name: item.name || product?.name || 'Item',
          sku: item.sku || product?.sku || 'SKU',
          brandName: item.brandName || (product?.brand?.name || ''),
          categoryName: item.categoryName || (product?.category?.name || ''),
          quantity: qty,
          mrp: Number(item.mrp || product?.mrp || sellingPrice),
          sellingPrice,
          discount: itemDiscount,
          couponCode: item.couponCode || '',
          gstRate,
          gstAmount: Number(lineGst.toFixed(2)),
          taxableAmount: Number(lineTaxable.toFixed(2)),
          finalPrice: Number(lineFinal.toFixed(2)),
          imei: item.imei ? item.imei.trim() : ''
        });
      }

      invoice.items = updatedInvoiceItems;
      invoice.subtotal = Number(calculatedSubtotal.toFixed(2));
      invoice.totalGst = Number(calculatedTotalGst.toFixed(2));
      invoice.totalDiscount = Number(calculatedTotalDiscount.toFixed(2));
      const finalPayable = calculatedSubtotal + calculatedTotalGst - (Number(extraDiscount) || 0);
      invoice.finalAmount = Math.round(finalPayable);
    }

    if (paymentMethod) invoice.paymentMethod = paymentMethod;
    if (paymentDetails !== undefined) invoice.paymentDetails = paymentDetails;
    if (giftItem !== undefined) invoice.giftItem = giftItem;

    const updatedInvoice = await invoice.save();

    // Update customer totalSpent difference if customer exists
    if (invoice.customer?.mobile) {
      const cust = await Customer.findOne({ mobile: invoice.customer.mobile });
      if (cust) {
        cust.totalSpent += (invoice.finalAmount - previousFinalAmount);
        await cust.save();
      }
    }

    res.json({ success: true, data: updatedInvoice, message: 'Invoice updated successfully' });
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

    // --- Watermark (Faint background branding) ---
    doc.save();
    doc.fillOpacity(0.06);
    doc.rotate(-25, { origin: [297.5, 330] });
    doc.fontSize(36).font('Helvetica-Bold').fillColor('#64748b');
    doc.text('TECHMART SALES & SERVICE', 0, 310, { align: 'center', width: 595 });
    doc.restore();
    doc.fillOpacity(1.0);

    // --- TM Logo in Header ---
    const logoPath = path.join(__dirname_ctrl, '..', 'assets', 'tm_logo.png');
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 30, 20, { width: 60, height: 60 });
    }

    // --- Header Section (shifted right to accommodate logo) ---
    const headerTextX = 100;
    doc.fillColor('#0f172a').fontSize(20).font('Helvetica-Bold').text('TECH MART SALES & SERVICE', headerTextX, 30);
    doc.fontSize(8).font('Helvetica').fillColor('#64748b');
    doc.text('Smartphones & Home Appliances Hub', headerTextX, 50);
    doc.text('GSTIN: 29AENPZ7677M1ZZ | Email: techmart.koppal@gmail.com', headerTextX, 61);
    doc.text('Ph: 9945836783 & 8050336783 & 9900642249', headerTextX, 71);
    doc.text('opposite Suco Bank, Basaveshwar(Ganj) Circle, Hospet Road, Koppal-583231', headerTextX, 81);

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
    doc.text('Sl. No.', 30, y);
    doc.text('Product / Details', 75, y);
    doc.text('Qty', 320, y, { width: 40, align: 'center' });
    doc.text('Price per unit (Rs)', 370, y, { width: 90, align: 'right' });
    doc.text('Total Amount (Rs)', 470, y, { width: 95, align: 'right' });

    doc.moveTo(30, 210).lineTo(565, 210).strokeColor('#94a3b8').lineWidth(1.5).stroke();

    // --- Table Rows ---
    y = 220;
    invoice.items.forEach((item, index) => {
      doc.fillColor('#334155').fontSize(8.5).font('Helvetica');
      doc.text(String(index + 1), 30, y);

      // Multi-brand product string
      doc.font('Helvetica-Bold').fillColor('#0f172a').text(`${item.brandName ? item.brandName + ' - ' : ''}${item.name}`, 75, y);

      if (item.imei) {
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#0284c7');
        doc.text(`IMEI / Serial No: ${item.imei}`, 75, y + 11);
      }

      doc.fontSize(8.5).fillColor('#334155');
      doc.text(String(item.quantity), 320, y, { width: 40, align: 'center' });
      doc.text(`${(item.sellingPrice - (item.discount || 0)).toFixed(2)}`, 370, y, { width: 90, align: 'right' });
      doc.text(`${item.finalPrice.toFixed(2)}`, 470, y, { width: 95, align: 'right' });

      y += item.imei ? 28 : 18;
    });

    doc.moveTo(30, y).lineTo(565, y).strokeColor('#cbd5e1').lineWidth(1).stroke();

    // --- Summary Section ---
    y += 15;
    doc.fillColor('#475569').fontSize(9).font('Helvetica-Bold');
    doc.text('Taxable Amount Total (Subtotal):', 300, y, { width: 150, align: 'left' });
    doc.text(`Rs. ${invoice.subtotal.toFixed(2)}`, 450, y, { width: 115, align: 'right' });

    const cgstAmount = (invoice.totalGst / 2).toFixed(2);
    const sgstAmount = (invoice.totalGst / 2).toFixed(2);

    y += 15;
    doc.text('CGST (9%):', 300, y, { width: 150, align: 'left' });
    doc.text(`Rs. ${cgstAmount}`, 450, y, { width: 115, align: 'right' });

    y += 15;
    doc.text('SGST (9%):', 300, y, { width: 150, align: 'left' });
    doc.text(`Rs. ${sgstAmount}`, 450, y, { width: 115, align: 'right' });

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
    doc.rect(300, y - 5, 265, 25).strokeColor('#cbd5e1').lineWidth(1).stroke();
    doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold');
    doc.text('Total Amount (Round Off):', 305, y, { width: 150 });
    doc.text(`Rs. ${invoice.finalAmount.toLocaleString('en-IN')}.00`, 450, y, { width: 110, align: 'right' });

    // --- Note / Terms & Conditions Section ---
    const storeName = 'TECH MART SALES & SERVICE';
    const noteY = Math.max(y + 30, 480);

    doc.rect(30, noteY, 535, 78).strokeColor('#cbd5e1').lineWidth(1).stroke();
    // Accent bar on left edge of Note box
    doc.rect(30, noteY, 3, 78).fill('#3b82f6');

    doc.fillColor('#0f172a').fontSize(8.5).font('Helvetica-Bold');
    doc.text('Note / Terms & Conditions:', 42, noteY + 8);

    doc.fillColor('#475569').fontSize(7.5).font('Helvetica');
    const noteLines = [
      '1. Warranty for all products, smartphones and appliances is covered directly by respective manufacturer authorized service centers.',
      '2. Physical, liquid, or electrical burn damages are strictly not covered under warranty or exchange policies.',
      '3. Please inspect product physical condition, IMEI / serial numbers, and sealed contents upon taking delivery.',
      '4. This is a computer-generated GST tax invoice and does not require physical seal unless requested.'
    ];

    let currentNoteY = noteY + 22;
    noteLines.forEach((line) => {
      doc.text(line, 42, currentNoteY, { width: 515 });
      currentNoteY += 10.5;
    });

    // --- Signatures Section ---
    const sigY = Math.max(noteY + 95, 675);

    // Left bottom corner: Receiver's Signature
    doc.fillColor('#64748b').fontSize(8).font('Helvetica');
    doc.text('Goods received in good condition', 30, sigY + 8);
    doc.moveTo(30, sigY + 25).lineTo(200, sigY + 25).strokeColor('#94a3b8').lineWidth(0.8).stroke();
    doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold');
    doc.text("Receiver's Signature", 30, sigY + 30);
    doc.fillColor('#64748b').fontSize(7.5).font('Helvetica');
    doc.text(`Customer: ${invoice.customer.name}`, 30, sigY + 43);

    // Right bottom corner: Authorized Signature along with storeName
    doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold');
    doc.text(`For ${storeName}`, 365, sigY + 8, { align: 'right', width: 200 });
    doc.moveTo(365, sigY + 25).lineTo(565, sigY + 25).strokeColor('#94a3b8').lineWidth(0.8).stroke();
    doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold');
    doc.text('Authorized Signature', 365, sigY + 30, { align: 'right', width: 200 });

    // --- Footer Section ---
    doc.moveTo(30, 755).lineTo(565, 755).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
    doc.fillColor('#475569').fontSize(8).font('Helvetica-Bold');
    doc.text(`Thank you for shopping with ${storeName}!`, 30, 765, { align: 'center' });
    doc.fontSize(7).font('Helvetica').fillColor('#94a3b8');
    doc.text('Smartphones & Home Appliances Hub | Email: techmart.koppal@gmail.com | Koppal-583231', 30, 777, { align: 'center' });

    doc.end();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
