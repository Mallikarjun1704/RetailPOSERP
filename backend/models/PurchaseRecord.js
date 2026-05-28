import mongoose from 'mongoose';

const purchaseRecordSchema = new mongoose.Schema({
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: [true, 'Supplier is required']
  },
  invoiceNumber: {
    type: String,
    required: [true, 'Supplier invoice number is required'],
    trim: true
  },
  purchaseDate: {
    type: Date,
    default: Date.now
  },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1']
    },
    purchasePrice: {
      type: Number,
      required: true,
      min: [0, 'Purchase price cannot be negative']
    },
    gstRate: {
      type: Number,
      default: 18
    },
    imeiList: [{
      type: String,
      trim: true
    }]
  }],
  subtotal: {
    type: Number,
    required: true
  },
  totalGst: {
    type: Number,
    required: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  amountPaid: {
    type: Number,
    default: 0
  },
  balanceDue: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['Paid', 'Partial', 'Unpaid'],
    default: 'Unpaid'
  }
}, {
  timestamps: true
});

const PurchaseRecord = mongoose.model('PurchaseRecord', purchaseRecordSchema);
export default PurchaseRecord;
