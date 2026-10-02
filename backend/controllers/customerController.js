import Customer from '../models/Customer.js';
import Invoice from '../models/Invoice.js';

// @desc    Get all customers or search
// @route   GET /api/customers
// @access  Private
export const getCustomers = async (req, res) => {
  const keyword = req.query.keyword
    ? {
        $or: [
          { name: { $regex: req.query.keyword, $options: 'i' } },
          { mobile: { $regex: req.query.keyword, $options: 'i' } }
        ]
      }
    : {};

  try {
    const customers = await Customer.find(keyword).sort({ createdAt: -1 }).lean();
    
    // Aggregate GST metrics for customers from Invoices
    const customerMobiles = customers.map(c => c.mobile);
    const invoiceTotals = await Invoice.aggregate([
      { $match: { 'customer.mobile': { $in: customerMobiles } } },
      {
        $group: {
          _id: '$customer.mobile',
          totalTaxable: { $sum: '$subtotal' },
          totalGst: { $sum: '$totalGst' }
        }
      }
    ]);

    const totalsMap = {};
    invoiceTotals.forEach(item => {
      const gst = item.totalGst || 0;
      totalsMap[item._id] = {
        totalTaxable: Number((item.totalTaxable || 0).toFixed(2)),
        totalGst: Number(gst.toFixed(2)),
        totalCgst: Number((gst / 2).toFixed(2)),
        totalSgst: Number((gst / 2).toFixed(2))
      };
    });

    const enrichedCustomers = customers.map(c => ({
      ...c,
      totalTaxable: totalsMap[c.mobile]?.totalTaxable || 0,
      totalGst: totalsMap[c.mobile]?.totalGst || 0,
      totalCgst: totalsMap[c.mobile]?.totalCgst || 0,
      totalSgst: totalsMap[c.mobile]?.totalSgst || 0
    }));

    res.json({ success: true, data: enrichedCustomers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get customer by mobile number (instant POS autofill)
// @route   GET /api/customers/mobile/:mobile
// @access  Private
export const getCustomerByMobile = async (req, res) => {
  try {
    const customer = await Customer.findOne({ mobile: req.params.mobile });
    if (customer) {
      res.json({ success: true, data: customer });
    } else {
      res.status(404).json({ success: false, message: 'Customer not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a new customer
// @route   POST /api/customers
// @access  Private
export const createCustomer = async (req, res) => {
  const { name, mobile, email, address } = req.body;

  try {
    const customerExists = await Customer.findOne({ mobile });
    if (customerExists) {
      return res.status(400).json({ success: false, message: 'Customer with this mobile number already exists' });
    }

    const customer = await Customer.create({
      name,
      mobile,
      email,
      address
    });

    res.status(201).json({ success: true, data: customer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update customer details
// @route   PUT /api/customers/:id
// @access  Private
export const updateCustomer = async (req, res) => {
  const { name, mobile, email, address, loyaltyPoints } = req.body;

  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    if (mobile && mobile !== customer.mobile) {
      const mobileExists = await Customer.findOne({ mobile });
      if (mobileExists) {
        return res.status(400).json({ success: false, message: 'Mobile number already registered to another customer' });
      }
      customer.mobile = mobile;
    }

    customer.name = name || customer.name;
    customer.email = email !== undefined ? email : customer.email;
    customer.address = address !== undefined ? address : customer.address;
    customer.loyaltyPoints = loyaltyPoints !== undefined ? loyaltyPoints : customer.loyaltyPoints;

    const updatedCustomer = await customer.save();
    res.json({ success: true, data: updatedCustomer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get customer purchase history (Invoices)
// @route   GET /api/customers/:id/history
// @access  Private
export const getCustomerHistory = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const invoices = await Invoice.find({ 'customer.mobile': customer.mobile }).sort({ createdAt: -1 });
    res.json({ success: true, data: invoices });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
