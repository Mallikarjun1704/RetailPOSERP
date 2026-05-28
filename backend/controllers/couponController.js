import Coupon from '../models/Coupon.js';
import Product from '../models/Product.js';

// @desc    Get all coupons
// @route   GET /api/coupons
// @access  Private
export const getCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find({})
      .populate('brandScope', 'name')
      .populate('categoryScope', 'name')
      .populate('productScope', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: coupons });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a new coupon
// @route   POST /api/coupons
// @access  Private
export const createCoupon = async (req, res) => {
  const { code, description, discountType, discountValue, minPurchaseAmount, maxDiscountAmount, startDate, expiryDate, isActive, brandScope, categoryScope, productScope } = req.body;

  try {
    const couponExists = await Coupon.findOne({ code: code.toUpperCase() });
    if (couponExists) {
      return res.status(400).json({ success: false, message: 'Coupon code already exists' });
    }

    const coupon = new Coupon({
      code: code.toUpperCase(),
      description,
      discountType,
      discountValue,
      minPurchaseAmount: minPurchaseAmount || 0,
      maxDiscountAmount: maxDiscountAmount || null,
      startDate: startDate || undefined,
      expiryDate,
      isActive: isActive !== undefined ? isActive : true,
      brandScope: brandScope || null,
      categoryScope: categoryScope || null,
      productScope: productScope || null
    });

    const createdCoupon = await coupon.save();
    res.status(201).json({ success: true, data: createdCoupon });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update a coupon
// @route   PUT /api/coupons/:id
// @access  Private
export const updateCoupon = async (req, res) => {
  const { description, discountType, discountValue, minPurchaseAmount, maxDiscountAmount, startDate, expiryDate, isActive, brandScope, categoryScope, productScope } = req.body;

  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }

    coupon.description = description !== undefined ? description : coupon.description;
    coupon.discountType = discountType !== undefined ? discountType : coupon.discountType;
    coupon.discountValue = discountValue !== undefined ? discountValue : coupon.discountValue;
    coupon.minPurchaseAmount = minPurchaseAmount !== undefined ? minPurchaseAmount : coupon.minPurchaseAmount;
    coupon.maxDiscountAmount = maxDiscountAmount !== undefined ? maxDiscountAmount : coupon.maxDiscountAmount;
    coupon.startDate = startDate !== undefined ? startDate : coupon.startDate;
    coupon.expiryDate = expiryDate !== undefined ? expiryDate : coupon.expiryDate;
    coupon.isActive = isActive !== undefined ? isActive : coupon.isActive;
    coupon.brandScope = brandScope !== undefined ? brandScope : coupon.brandScope;
    coupon.categoryScope = categoryScope !== undefined ? categoryScope : coupon.categoryScope;
    coupon.productScope = productScope !== undefined ? productScope : coupon.productScope;

    const updatedCoupon = await coupon.save();
    res.json({ success: true, data: updatedCoupon });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a coupon
// @route   DELETE /api/coupons/:id
// @access  Private/Admin
export const deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (coupon) {
      await Coupon.deleteOne({ _id: req.params.id });
      res.json({ success: true, message: 'Coupon deleted successfully' });
    } else {
      res.status(404).json({ success: false, message: 'Coupon not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Validate a coupon code and calculate discount for current cart
// @route   POST /api/coupons/validate
// @access  Private
export const validateCoupon = async (req, res) => {
  const { code, cartItems, subtotal } = req.body;

  try {
    const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });
    
    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Invalid or inactive coupon code' });
    }

    const now = new Date();
    if (coupon.startDate > now || coupon.expiryDate < now) {
      return res.status(400).json({ success: false, message: 'Coupon has expired or is not active yet' });
    }

    if (subtotal < coupon.minPurchaseAmount) {
      return res.status(400).json({ 
        success: false, 
        message: `Minimum purchase amount of ₹${coupon.minPurchaseAmount} required for this coupon` 
      });
    }

    let discountAmount = 0;

    // Check scope restrictions
    const hasScope = coupon.brandScope || coupon.categoryScope || coupon.productScope;

    if (!hasScope) {
      // General store-wide coupon
      if (coupon.discountType === 'percentage') {
        discountAmount = (subtotal * coupon.discountValue) / 100;
      } else {
        discountAmount = coupon.discountValue;
      }
    } else {
      // Scope-specific coupon: calculate discount only on matching products in the cart
      let eligibleSubtotal = 0;

      for (const item of cartItems) {
        // Fetch detailed product info to resolve brand/category IDs
        const product = await Product.findById(item.product);
        if (!product) continue;

        let isEligible = true;

        if (coupon.productScope && coupon.productScope.toString() !== product._id.toString()) {
          isEligible = false;
        }
        if (coupon.brandScope && coupon.brandScope.toString() !== product.brand.toString()) {
          isEligible = false;
        }
        if (coupon.categoryScope && coupon.categoryScope.toString() !== product.category.toString()) {
          isEligible = false;
        }

        if (isEligible) {
          // Multiply item selling price * quantity
          eligibleSubtotal += (item.sellingPrice * item.quantity);
        }
      }

      if (eligibleSubtotal === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'No eligible items in cart for this coupon' 
        });
      }

      if (coupon.discountType === 'percentage') {
        discountAmount = (eligibleSubtotal * coupon.discountValue) / 100;
      } else {
        // Fixed amount discount. Cannot exceed eligible item totals
        discountAmount = Math.min(coupon.discountValue, eligibleSubtotal);
      }
    }

    // Apply cap if max discount is set
    if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
      discountAmount = coupon.maxDiscountAmount;
    }

    // Discount cannot exceed subtotal
    discountAmount = Math.min(discountAmount, subtotal);

    res.json({
      success: true,
      data: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount: Number(discountAmount.toFixed(2))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
