import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: true,
    unique: true
  },
  customer: {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer'
    },
    name: {
      type: String,
      required: [true, 'Customer name is required']
    },
    mobile: {
      type: String,
      required: [true, 'Customer mobile is required']
    },
    email: String,
    address: String
  },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    name: {
      type: String,
      required: true
    },
    sku: {
      type: String,
      required: true
    },
    brandName: String,
    categoryName: String,
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1']
    },
    mrp: {
      type: Number,
      required: true
    },
    sellingPrice: {
      type: Number,
      required: true
    },
    discount: {
      type: Number,
      default: 0
    },
    couponCode: String,
    gstRate: {
      type: Number,
      required: true
    },
    gstAmount: {
      type: Number,
      required: true
    },
    taxableAmount: {
      type: Number,
      required: true
    },
    finalPrice: {
      type: Number,
      required: true
    },
    imei: {
      type: String,
      trim: true
    }
  }],
  subtotal: {
    type: Number,
    required: true // sum of taxableAmounts
  },
  totalGst: {
    type: Number,
    required: true // sum of gstAmounts
  },
  totalDiscount: {
    type: Number,
    default: 0
  },
  finalAmount: {
    type: Number,
    required: true // subtotal + totalGst - extraDiscount
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Card', 'UPI', 'EMI'],
    required: true
  },
  paymentDetails: {
    type: String,
    trim: true
  },
  giftItem: {
    type: String,
    trim: true,
    default: ''
  },
  cashier: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: {
      type: String,
      required: true
    }
  },
  status: {
    type: String,
    enum: ['Paid', 'Refunded'],
    default: 'Paid'
  },
  loyaltyPointsEarned: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

const Invoice = mongoose.model('Invoice', invoiceSchema);
export default Invoice;
