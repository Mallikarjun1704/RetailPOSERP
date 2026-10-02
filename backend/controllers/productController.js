import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Brand from '../models/Brand.js';

// @desc    Get all products (with pagination, filters, search)
// @route   GET /api/products
// @access  Private
export const getProducts = async (req, res) => {
  const pageSize = req.query.limit ? Number(req.query.limit) : 10;
  const page = Number(req.query.pageNumber) || 1;

  const keyword = req.query.keyword
    ? {
        $or: [
          { name: { $regex: req.query.keyword, $options: 'i' } },
          { modelNumber: { $regex: req.query.keyword, $options: 'i' } },
          { sku: { $regex: req.query.keyword, $options: 'i' } },
          { barcode: { $regex: req.query.keyword, $options: 'i' } },
          { imeiList: { $in: [new RegExp(req.query.keyword, 'i')] } }
        ]
      }
    : {};

  const categoryFilter = req.query.category ? { category: req.query.category } : {};
  const brandFilter = req.query.brand ? { brand: req.query.brand } : {};
  const lowStockFilter = req.query.lowStock === 'true' 
    ? { $expr: { $lte: ['$stock', '$lowStockThreshold'] } } 
    : {};

  try {
    const query = { ...keyword, ...categoryFilter, ...brandFilter, ...lowStockFilter };
    const count = await Product.countDocuments(query);
    const products = await Product.find(query)
      .populate('category', 'name')
      .populate('brand', 'name')
      .sort({ createdAt: -1 })
      .limit(pageSize)
      .skip(pageSize * (page - 1));

    res.json({ success: true, data: { products, page, pages: Math.ceil(count / pageSize), total: count } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get product by ID
// @route   GET /api/products/:id
// @access  Private
export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('category', 'name')
      .populate('brand', 'name');
    if (product) {
      res.json({ success: true, data: product });
    } else {
      res.status(404).json({ success: false, message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a new product
// @route   POST /api/products
// @access  Private
export const createProduct = async (req, res) => {
  const { name, modelNumber, sku, barcode, category, brand, description, mrp, purchasePrice, sellingPrice, gstRate, stock, lowStockThreshold, hasIMEI, imeiList, warrantyMonths, image } = req.body;

  try {
    const finalSku = sku || `SKU-${Date.now()}${Math.floor(Math.random() * 1000)}`;

    const skuExists = await Product.findOne({ sku: finalSku });
    if (skuExists) {
      return res.status(400).json({ success: false, message: 'SKU already exists' });
    }

    if (barcode) {
      const barcodeExists = await Product.findOne({ barcode });
      if (barcodeExists) {
        return res.status(400).json({ success: false, message: 'Barcode already exists' });
      }
    }

    // Verify category and brand exist
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(400).json({ success: false, message: 'Invalid category' });
    }

    const brandExists = await Brand.findById(brand);
    if (!brandExists) {
      return res.status(400).json({ success: false, message: 'Invalid brand' });
    }

    const product = new Product({
      name,
      modelNumber: modelNumber || '',
      sku: finalSku,
      barcode: barcode || undefined,
      category,
      brand,
      description,
      mrp: mrp !== undefined && mrp !== null ? mrp : purchasePrice,
      purchasePrice,
      sellingPrice: sellingPrice !== undefined && sellingPrice !== null ? sellingPrice : purchasePrice,
      gstRate,
      stock: (imeiList && imeiList.length > 0) ? imeiList.length : (stock || 0),
      lowStockThreshold: lowStockThreshold || 5,
      hasIMEI: hasIMEI || false,
      imeiList: hasIMEI ? (imeiList || []) : [],
      warrantyMonths: warrantyMonths || 12,
      image: image || ''
    });

    const createdProduct = await product.save();
    res.status(201).json({ success: true, data: createdProduct });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private
export const updateProduct = async (req, res) => {
  const { name, modelNumber, sku, barcode, category, brand, description, mrp, purchasePrice, sellingPrice, gstRate, stock, lowStockThreshold, hasIMEI, imeiList, warrantyMonths, image } = req.body;

  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Validation for unique SKU/Barcode
    if (sku && sku !== product.sku) {
      const skuExists = await Product.findOne({ sku });
      if (skuExists) {
        return res.status(400).json({ success: false, message: 'SKU already exists' });
      }
      product.sku = sku;
    }

    if (barcode && barcode !== product.barcode) {
      const barcodeExists = await Product.findOne({ barcode });
      if (barcodeExists) {
        return res.status(400).json({ success: false, message: 'Barcode already exists' });
      }
      product.barcode = barcode;
    } else if (barcode === '') {
      product.barcode = undefined;
    }

    product.name = name || product.name;
    product.modelNumber = modelNumber || product.modelNumber;
    product.category = category || product.category;
    product.brand = brand || product.brand;
    product.description = description || product.description;
    product.mrp = mrp !== undefined ? mrp : product.mrp;
    product.purchasePrice = purchasePrice !== undefined ? purchasePrice : product.purchasePrice;
    product.sellingPrice = sellingPrice !== undefined ? sellingPrice : product.sellingPrice;
    product.gstRate = gstRate !== undefined ? gstRate : product.gstRate;
    product.lowStockThreshold = lowStockThreshold !== undefined ? lowStockThreshold : product.lowStockThreshold;
    product.warrantyMonths = warrantyMonths !== undefined ? warrantyMonths : product.warrantyMonths;
    product.image = image !== undefined ? image : product.image;

    // Handle IMEI & Stock changes
    if (hasIMEI !== undefined) {
      product.hasIMEI = hasIMEI;
    }

    if (product.hasIMEI) {
      if (imeiList !== undefined) {
        product.imeiList = imeiList;
        if (imeiList.length > 0) {
          product.stock = imeiList.length;
        } else if (stock !== undefined) {
          product.stock = stock;
        }
      } else if (stock !== undefined) {
        product.stock = stock;
      }
    } else {
      product.stock = stock !== undefined ? stock : product.stock;
      product.imeiList = [];
    }

    const updatedProduct = await product.save();
    res.json({ success: true, data: updatedProduct });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/Admin
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (product) {
      await Product.deleteOne({ _id: req.params.id });
      res.json({ success: true, message: 'Product deleted' });
    } else {
      res.status(404).json({ success: false, message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Quick Search for POS auto-complete
// @route   GET /api/products/pos/search
// @access  Private
export const searchProductsPOS = async (req, res) => {
  const query = req.query.q;
  const includeOutOfStock = req.query.includeOutOfStock === 'true';

  if (!query || query.trim() === '') {
    return res.json({ success: true, data: [] });
  }

  try {
    const searchRegex = new RegExp(query, 'i');
    
    const filter = {
      $or: [
        { barcode: query },
        { sku: query },
        { name: { $regex: searchRegex } },
        { modelNumber: { $regex: searchRegex } },
        { imeiList: query }
      ]
    };

    if (!includeOutOfStock) {
      filter.stock = { $gt: 0 };
    }

    const products = await Product.find(filter)
      .populate('category', 'name')
      .populate('brand', 'name')
      .limit(10);

    res.json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
