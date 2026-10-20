import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true
  },
  modelNumber: {
    type: String,
    trim: true
  },
  sku: {
    type: String,
    required: [true, 'SKU is required'],
    unique: true,
    trim: true
  },
  barcode: {
    type: String,
    unique: true,
    sparse: true, // Allows null or empty barcodes without triggering unique collision
    trim: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Category is required']
  },
  brand: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Brand',
    required: [true, 'Brand is required']
  },
  description: {
    type: String,
    trim: true
  },
  mrp: {
    type: Number,
    required: false,
    min: [0, 'MRP cannot be negative']
  },
  purchasePrice: {
    type: Number,
    required: [true, 'Purchase price is required'],
    min: [0, 'Purchase price cannot be negative']
  },
  sellingPrice: {
    type: Number,
    required: [true, 'Selling price is required'],
    min: [0, 'Selling price cannot be negative']
  },
  gstRate: {
    type: Number,
    required: [true, 'GST rate is required'],
    default: 18 // standard 18% GST
  },
  stock: {
    type: Number,
    required: [true, 'Stock quantity is required'],
    default: 0,
    min: [0, 'Stock cannot be negative']
  },
  lowStockThreshold: {
    type: Number,
    default: 5
  },
  hasIMEI: {
    type: Boolean,
    default: false
  },
  imeiList: [{
    type: String,
    trim: true
  }],
  warrantyMonths: {
    type: Number,
    default: 12
  },
  image: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Search indexes
productSchema.index({ name: 'text', modelNumber: 'text', sku: 'text', barcode: 'text' });

const Product = mongoose.model('Product', productSchema);
export default Product;
