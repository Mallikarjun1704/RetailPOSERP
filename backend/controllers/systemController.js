import User from '../models/User.js';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Brand from '../models/Brand.js';
import Customer from '../models/Customer.js';
import Coupon from '../models/Coupon.js';
import Invoice from '../models/Invoice.js';
import Supplier from '../models/Supplier.js';
import PurchaseRecord from '../models/PurchaseRecord.js';

// @desc    Backup all MongoDB collections into a single downloadable JSON object
// @route   GET /api/system/backup
// @access  Private/Admin
export const backupSystem = async (req, res) => {
  try {
    const users = await User.find({});
    const products = await Product.find({});
    const categories = await Category.find({});
    const brands = await Brand.find({});
    const customers = await Customer.find({});
    const coupons = await Coupon.find({});
    const invoices = await Invoice.find({});
    const suppliers = await Supplier.find({});
    const purchases = await PurchaseRecord.find({});

    const backupData = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      source: 'RetailPOS Offline Desktop',
      data: {
        users,
        products,
        categories,
        brands,
        customers,
        coupons,
        invoices,
        suppliers,
        purchases
      }
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=RetailPOS_Backup_${Date.now()}.json`);
    res.send(JSON.stringify(backupData, null, 2));
  } catch (error) {
    res.status(500).json({ success: false, message: 'Backup execution failed: ' + error.message });
  }
};

// @desc    Restore database from an uploaded JSON backup file
// @route   POST /api/system/restore
// @access  Private/Admin
export const restoreSystem = async (req, res) => {
  const { backupData } = req.body;

  try {
    if (!backupData || !backupData.data || backupData.source !== 'RetailPOS Offline Desktop') {
      return res.status(400).json({ success: false, message: 'Invalid backup file structure or incompatible application origin.' });
    }

    const { users, products, categories, brands, customers, coupons, invoices, suppliers, purchases } = backupData.data;

    // Clear current collections
    await User.deleteMany({});
    await Product.deleteMany({});
    await Category.deleteMany({});
    await Brand.deleteMany({});
    await Customer.deleteMany({});
    await Coupon.deleteMany({});
    await Invoice.deleteMany({});
    await Supplier.deleteMany({});
    await PurchaseRecord.deleteMany({});

    // Restore dataset
    if (users && users.length > 0) await User.insertMany(users);
    if (categories && categories.length > 0) await Category.insertMany(categories);
    if (brands && brands.length > 0) await Brand.insertMany(brands);
    if (products && products.length > 0) await Product.insertMany(products);
    if (customers && customers.length > 0) await Customer.insertMany(customers);
    if (coupons && coupons.length > 0) await Coupon.insertMany(coupons);
    if (invoices && invoices.length > 0) await Invoice.insertMany(invoices);
    if (suppliers && suppliers.length > 0) await Supplier.insertMany(suppliers);
    if (purchases && purchases.length > 0) await PurchaseRecord.insertMany(purchases);

    res.json({ success: true, message: 'Database restored successfully! All tables repopulated.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Restore execution failed: ' + error.message });
  }
};
