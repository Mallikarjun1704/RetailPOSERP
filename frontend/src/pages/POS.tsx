import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Product, Customer, InvoiceItem, Invoice } from '../types';
import { 
  Search, 
  Trash2, 
  ShoppingCart, 
  User, 
  Phone, 
  Tag, 
  CreditCard, 
  Receipt, 
  Plus, 
  Minus,
  Sparkles,
  Printer,
  ChevronDown
} from 'lucide-react';
import confetti from 'canvas-confetti';

const POS: React.FC = () => {
  const { user } = useAuth();
  // Cart state
  const [cart, setCart] = useState<(any)[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [selectedImeiList, setSelectedImeiList] = useState<{ [prodId: string]: string }>({});

  // Customer state
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [customerFound, setCustomerFound] = useState(false);

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [appliedCouponDetails, setAppliedCouponDetails] = useState<any>(null);
  const [couponError, setCouponError] = useState('');

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'UPI' | 'EMI'>('Cash');
  const [paymentDetails, setPaymentDetails] = useState('');
  const [extraDiscount, setExtraDiscount] = useState<number>(0);

  // Invoice success modal states
  const [invoiceSuccess, setInvoiceSuccess] = useState<Invoice | null>(null);
  const [checkoutError, setCheckoutError] = useState('');

  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  // 1. Search products dynamically on input change
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (productSearch.trim().length > 1) {
        try {
          const { data } = await api.get(`/products/pos/search?q=${productSearch}`);
          if (data.success) {
            setSearchResults(data.data);
          }
        } catch (error) {
          console.error(error);
        }
      } else {
        setSearchResults([]);
      }
    }, 200);

    return () => clearTimeout(delayDebounce);
  }, [productSearch]);

  // 2. Lookup customer by phone number
  const handleCustomerLookup = async () => {
    if (customerMobile.length !== 10) return;
    try {
      const { data } = await api.get(`/customers/mobile/${customerMobile}`);
      if (data.success && data.data) {
        const cust: Customer = data.data;
        setCustomerName(cust.name);
        setCustomerEmail(cust.email || '');
        setCustomerAddress(cust.address || '');
        setLoyaltyPoints(cust.loyaltyPoints);
        setCustomerFound(true);
      }
    } catch {
      // Customer not found, reset details so cashier can write new customer
      setCustomerFound(false);
      setLoyaltyPoints(0);
    }
  };

  // 3. Add product to cart
  const addToCart = (product: Product) => {
    // Check if simple product already in cart
    const existingIndex = cart.findIndex(item => item.product === product._id);

    if (existingIndex > -1 && !product.hasIMEI) {
      const updatedCart = [...cart];
      const newQty = updatedCart[existingIndex].quantity + 1;
      
      if (newQty > product.stock) {
        showError(`Insufficient stock. Only ${product.stock} items left.`);
        return;
      }
      
      updatedCart[existingIndex].quantity = newQty;
      setCart(updatedCart);
      setSearchResults([]);
      setProductSearch('');
    } else {
      // Add as new cart row
      const newCartItem = {
        product: product._id,
        name: product.name,
        sku: product.sku,
        brandName: typeof product.brand === 'object' ? product.brand.name : '',
        categoryName: typeof product.category === 'object' ? product.category.name : '',
        quantity: 1,
        mrp: product.mrp,
        sellingPrice: product.sellingPrice,
        discount: 0,
        gstRate: product.gstRate,
        hasIMEI: product.hasIMEI,
        imeiList: product.imeiList,
        imei: product.hasIMEI ? product.imeiList[0] || '' : '' // Select first available by default
      };

      setCart([...cart, newCartItem]);
      setSearchResults([]);
      setProductSearch('');
    }
  };

  // 4. Update quantity
  const updateQuantity = (index: number, val: number) => {
    const updatedCart = [...cart];
    const newQty = updatedCart[index].quantity + val;

    if (newQty < 1) return;

    // Check stock bounds
    const productId = updatedCart[index].product;
    api.get(`/products/${productId}`).then(({ data }) => {
      if (data.success && newQty > data.data.stock) {
        showError(`Insufficient stock. Only ${data.data.stock} items left.`);
      } else {
        updatedCart[index].quantity = newQty;
        setCart(updatedCart);
      }
    });
  };

  // 5. Update selected IMEI on mobile purchases
  const handleImeiChange = (index: number, imei: string) => {
    const updatedCart = [...cart];
    updatedCart[index].imei = imei;
    setCart(updatedCart);
  };

  // 6. Delete row
  const deleteFromCart = (index: number) => {
    const updated = [...cart];
    updated.splice(index, 1);
    setCart(updated);
    // Recalculate coupons if deleted items affected scopes
    if (appliedCouponDetails) {
      removeCoupon();
    }
  };

  // 7. Calculate calculations
  const calculateTotals = () => {
    let subtotal = 0; // Taxable values total
    let gstTotal = 0;
    let itemDiscounts = 0;

    cart.forEach(item => {
      const priceAfterItemDiscount = item.sellingPrice - item.discount;
      const gstFactor = 1 + (item.gstRate / 100);
      const unitTaxable = priceAfterItemDiscount / gstFactor;
      const unitGst = priceAfterItemDiscount - unitTaxable;

      subtotal += unitTaxable * item.quantity;
      gstTotal += unitGst * item.quantity;
      itemDiscounts += item.discount * item.quantity;
    });

    const couponDeduction = couponDiscount;
    const finalAmount = Math.max(0, subtotal + gstTotal - couponDeduction - extraDiscount);

    return {
      subtotal: Number(subtotal.toFixed(2)),
      gst: Number(gstTotal.toFixed(2)),
      discounts: Number((itemDiscounts + couponDeduction).toFixed(2)),
      final: Math.round(finalAmount)
    };
  };

  const totals = calculateTotals();

  // 8. Validate Coupon
  const applyCoupon = async () => {
    if (!couponCode) return;
    setCouponError('');
    try {
      const { data } = await api.post('/coupons/validate', {
        code: couponCode,
        cartItems: cart.map(item => ({
          product: item.product,
          sellingPrice: item.sellingPrice,
          quantity: item.quantity,
          discount: item.discount
        })),
        subtotal: totals.subtotal + totals.gst // apply to gross items total
      });

      if (data.success) {
        setCouponDiscount(data.data.discountAmount);
        setAppliedCouponDetails(data.data);
      }
    } catch (err: any) {
      setCouponError(err.response?.data?.message || 'Invalid Coupon Code');
      setCouponDiscount(0);
      setAppliedCouponDetails(null);
    }
  };

  const removeCoupon = () => {
    setCouponCode('');
    setCouponDiscount(0);
    setAppliedCouponDetails(null);
    setCouponError('');
  };

  // 9. Checkout & place transaction
  const showError = (msg: string) => {
    setCheckoutError(msg);
    setTimeout(() => setCheckoutError(''), 4000);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      showError('Cart is empty. Add items before processing sale.');
      return;
    }
    if (!customerMobile || customerMobile.length !== 10) {
      showError('Valid 10-digit customer mobile number is mandatory.');
      return;
    }
    if (!customerName) {
      showError('Customer name is mandatory.');
      return;
    }

    try {
      const checkoutPayload = {
        customerMobile,
        customerName,
        customerEmail,
        customerAddress,
        paymentMethod,
        paymentDetails,
        extraDiscount,
        items: cart.map(item => ({
          product: item.product,
          quantity: item.quantity,
          sellingPrice: item.sellingPrice,
          discount: item.discount + (appliedCouponDetails ? (couponDiscount / cart.length) : 0), // split coupon discount mathematically
          couponCode: appliedCouponDetails ? appliedCouponDetails.code : '',
          imei: item.imei || ''
        }))
      };

      const { data } = await api.post('/billing/checkout', checkoutPayload);
      if (data.success) {
        // Trigger success sound/visual
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 }
        });
        
        setInvoiceSuccess(data.data);
        clearAllState();
      }
    } catch (error: any) {
      showError(error.response?.data?.message || 'Checkout failed.');
    }
  };

  const clearAllState = () => {
    setCart([]);
    setCustomerMobile('');
    setCustomerName('');
    setCustomerEmail('');
    setCustomerAddress('');
    setLoyaltyPoints(0);
    setCustomerFound(false);
    removeCoupon();
    setPaymentMethod('Cash');
    setPaymentDetails('');
    setExtraDiscount(0);
  };

  const printInvoice = () => {
    if (!invoiceSuccess) return;
    const token = localStorage.getItem('token');
    const printUrl = `http://127.0.0.1:5000/api/billing/invoices/${invoiceSuccess._id}/pdf?token=${token}`;
    
    // In Electron, we can open PDF in new hidden print window, or let browser open it
    window.open(printUrl, '_blank');
  };

  return (
    <div className="flex-1 flex bg-slate-100 dark:bg-slate-950 h-screen overflow-hidden transition-colors duration-200">
      
      {/* CHECKOUT ERROR TOAST */}
      {checkoutError && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-3.5 bg-rose-500 text-white rounded-2xl shadow-2xl shadow-rose-500/30 text-sm font-bold flex items-center gap-3 animate-scaleUp">
          <span className="text-base">⚠</span>
          <span>{checkoutError}</span>
          <button onClick={() => setCheckoutError('')} className="ml-2 text-white/70 hover:text-white font-black text-xs">✕</button>
        </div>
      )}

      {/* LEFT: Grid POS shopping list */}
      <section className="flex-1 flex flex-col p-6 overflow-hidden">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">POS Terminal</h2>
            <p className="text-xs text-slate-500">Scan barcodes or add items directly to retail invoice.</p>
          </div>
        </header>

        {/* 1. Barcode/Product Search Box */}
        <div className="relative mb-4 z-20">
          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by: Name / Barcode / SKU / IMEI..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 shadow-sm outline-none transition-all dark:text-white"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          </div>

          {/* Autocomplete Droplist */}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 mt-2 rounded-2xl shadow-xl overflow-hidden max-h-[300px] overflow-y-auto">
              {searchResults.map(product => (
                <button
                  key={product._id}
                  onClick={() => addToCart(product)}
                  className="w-full px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-left flex justify-between items-center border-b border-slate-100 dark:border-slate-800/80 transition-colors"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">{product.name}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">SKU: {product.sku} | STOCK: {product.stock}</span>
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <span className="text-sm font-black text-brand-500">₹{product.sellingPrice.toLocaleString('en-IN')}</span>
                    {product.hasIMEI && <span className="text-[9px] font-bold px-2 py-0.5 bg-cyan-500/10 text-cyan-500 rounded-full">IMEI Tracked</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 2. Cart grid */}
        <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl shadow-sm overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  <th className="pos-grid-header">Item Description</th>
                  <th className="pos-grid-header text-center">Qty</th>
                  <th className="pos-grid-header text-right">Selling Price</th>
                  <th className="pos-grid-header text-right">Item Tax</th>
                  <th className="pos-grid-header text-right">Total Price</th>
                  <th className="pos-grid-header text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {cart.length > 0 ? (
                  cart.map((item, idx) => (
                    <tr key={idx} className="pos-grid-row">
                      {/* Name, SKU, IMEI selection */}
                      <td className="px-4 py-4 max-w-[280px]">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-semibold text-slate-900 dark:text-white">{item.brandName} - {item.name}</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase">SKU: {item.sku}</span>
                          
                          {/* IMEI tracker dropdown for mobile products */}
                          {item.hasIMEI && (
                            <div className="mt-2 flex items-center gap-1.5">
                              <span className="text-[9px] font-bold uppercase text-cyan-500 bg-cyan-500/10 px-2 py-0.5 rounded-full shrink-0">IMEI:</span>
                              <div className="relative inline-block">
                                <select
                                  value={item.imei}
                                  onChange={(e) => handleImeiChange(idx, e.target.value)}
                                  className="appearance-none bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 pl-2 pr-6 py-1 rounded-lg text-[10px] font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
                                >
                                  {item.imeiList.map((im: string) => (
                                    <option key={im} value={im}>{im}</option>
                                  ))}
                                </select>
                                <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                              </div>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Quantity adjusts */}
                      <td className="px-4 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => updateQuantity(idx, -1)} 
                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500"
                            disabled={item.hasIMEI} // Quantities are 1-per-serial in retail rules
                          >
                            <Minus size={12} />
                          </button>
                          <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(idx, 1)} 
                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500"
                            disabled={item.hasIMEI}
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </td>

                      {/* Selling price */}
                      <td className="px-4 py-4 text-right">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">₹{item.sellingPrice.toLocaleString('en-IN')}</span>
                      </td>

                      {/* Line GST */}
                      <td className="px-4 py-4 text-right">
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{item.gstRate}%</span>
                          <span className="text-[10px] text-slate-400">CGST/SGST split</span>
                        </div>
                      </td>

                      {/* Line final */}
                      <td className="px-4 py-4 text-right">
                        <span className="text-sm font-black text-slate-900 dark:text-white">₹{((item.sellingPrice - item.discount) * item.quantity).toLocaleString('en-IN')}</span>
                      </td>

                      {/* Deletes */}
                      <td className="px-4 py-4 text-center">
                        <button 
                          onClick={() => deleteFromCart(idx)} 
                          className="p-2 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-rose-500 rounded-xl transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-20 text-slate-400 dark:text-slate-600">
                      <ShoppingCart size={40} className="mx-auto mb-3 opacity-30" />
                      <span className="text-sm font-semibold">Your shopping cart is currently empty.</span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* RIGHT: Customer profile details, Coupons & Checkout summaries */}
      <section className="w-[380px] border-l border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/50 p-6 flex flex-col justify-between shrink-0 h-screen overflow-y-auto">
        
        <div className="flex flex-col gap-6">
          {/* 1. Customer Section */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/80 rounded-2xl">
            <div className="flex items-center gap-2 mb-3.5">
              <User size={16} className="text-brand-500" />
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 uppercase tracking-wider">Customer Details</h3>
            </div>
            
            <div className="flex flex-col gap-3">
              <div className="relative">
                <input
                  ref={mobileInputRef}
                  type="text"
                  maxLength={10}
                  placeholder="Mobile number (10-digit)*"
                  value={customerMobile}
                  onChange={(e) => setCustomerMobile(e.target.value)}
                  onBlur={handleCustomerLookup}
                  className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-brand-500 text-slate-900 dark:text-white"
                  required
                />
                <Phone size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>

              <input
                type="text"
                placeholder="Customer Name*"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-brand-500 text-slate-900 dark:text-white"
                required
              />

              {customerFound && (
                <div className="px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex justify-between">
                  <span>Loyalty Account Active</span>
                  <span>Balance: {loyaltyPoints} pts</span>
                </div>
              )}
            </div>
          </div>

          {/* 2. Coupons & Pricing offers */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/80 rounded-2xl">
            <div className="flex items-center gap-2 mb-3.5">
              <Tag size={16} className="text-accent-500" />
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 uppercase tracking-wider">Coupon Offers</h3>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Apply coupon code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                disabled={!!appliedCouponDetails}
                className="flex-1 px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-accent-500 text-slate-900 dark:text-white font-bold tracking-widest"
              />
              {appliedCouponDetails ? (
                <button 
                  onClick={removeCoupon}
                  className="px-3 bg-rose-500 hover:bg-rose-600 rounded-xl text-xs text-white font-bold transition-colors"
                >
                  Remove
                </button>
              ) : (
                <button 
                  onClick={applyCoupon}
                  className="px-4 bg-accent-600 hover:bg-accent-500 rounded-xl text-xs text-white font-bold transition-colors"
                >
                  Apply
                </button>
              )}
            </div>
            {couponError && <span className="text-[10px] text-rose-500 font-bold mt-1.5 block">{couponError}</span>}
            {appliedCouponDetails && (
              <span className="text-[10px] text-emerald-500 font-bold mt-1.5 block">
                Success! Coupon applied: -₹{couponDiscount}
              </span>
            )}
          </div>

          {/* 3. Payment Selector */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/80 rounded-2xl">
            <div className="flex items-center gap-2 mb-3">
              <CreditCard size={16} className="text-amber-500" />
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 uppercase tracking-wider">Payment Method</h3>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              {['Cash', 'Card', 'UPI', 'EMI'].map(mode => (
                <button
                  key={mode}
                  onClick={() => setPaymentMethod(mode as any)}
                  className={`
                    py-2 rounded-xl text-xs font-bold transition-all border
                    ${paymentMethod === mode
                      ? 'bg-brand-500 border-brand-500 text-white shadow-md shadow-brand-500/10'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }
                  `}
                >
                  {mode}
                </button>
              ))}
            </div>

            {paymentMethod !== 'Cash' && (
              <input
                type="text"
                placeholder={paymentMethod === 'UPI' ? "UPI Transaction ID" : paymentMethod === 'EMI' ? "EMI Provider (e.g. HDFC)" : "Card Authorization code"}
                value={paymentDetails}
                onChange={(e) => setPaymentDetails(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] outline-none text-slate-900 dark:text-white"
              />
            )}
          </div>
        </div>

        {/* 4. Grand Invoice Calculations Block */}
        <div className="mt-6 border-t border-slate-200 dark:border-slate-800 pt-6">
          <div className="flex flex-col gap-2.5 text-xs text-slate-500 mb-4">
            <div className="flex justify-between">
              <span>Gross Taxable Amount:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">₹{totals.subtotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax (GST Breakdown):</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">₹{totals.gst.toLocaleString('en-IN')}</span>
            </div>
            {totals.discounts > 0 && (
              <div className="flex justify-between text-rose-500 font-bold">
                <span>Total Coupon Discounts:</span>
                <span>- ₹{totals.discounts.toLocaleString('en-IN')}</span>
              </div>
            )}
          </div>

          {/* Grand summary panel */}
          <div className="p-4 bg-slate-950 text-white rounded-2xl mb-4 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Payable</span>
              <span className="text-xs text-slate-500">(Rounded Off)</span>
            </div>
            <span className="text-2xl font-black font-sans text-brand-400">₹{totals.final.toLocaleString('en-IN')}.00</span>
          </div>

          <button
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className="w-full py-4 bg-brand-500 hover:bg-brand-600 disabled:bg-slate-300 disabled:dark:bg-slate-800 rounded-2xl font-bold text-white text-sm shadow-xl shadow-brand-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Receipt size={16} />
            <span>Process Sale & Print</span>
          </button>
        </div>

      </section>

      {/* 5. INVOICE SUCCESS POPUP DIALOG */}
      {invoiceSuccess && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-[500px] bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl flex flex-col border border-slate-200 dark:border-slate-800 animate-scaleUp">
            
            <div className="flex flex-col items-center text-center gap-2 mb-6">
              <div className="p-3.5 bg-emerald-500 text-white rounded-full shadow-lg shadow-emerald-500/30">
                <Sparkles size={24} />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">Transaction Complete!</h3>
              <p className="text-xs text-slate-400">Invoice {invoiceSuccess.invoiceNumber} logged successfully.</p>
            </div>

            {/* Quick Summary details */}
            <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl mb-6 text-sm flex flex-col gap-2.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Billed Customer:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{invoiceSuccess.customer.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Grand Total:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">₹{invoiceSuccess.finalAmount.toLocaleString('en-IN')}.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Loyalty Earned:</span>
                <span className="font-bold text-emerald-500">+{invoiceSuccess.loyaltyPointsEarned} pts</span>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={printInvoice}
                className="flex-1 py-3 bg-brand-500 hover:bg-brand-600 rounded-2xl text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
              >
                <Printer size={16} />
                <span>Open Print Window</span>
              </button>
              <button
                onClick={() => setInvoiceSuccess(null)}
                className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl font-bold text-sm transition-colors"
              >
                Start New Bill
              </button>
            </div>
            
          </div>
        </div>
      )}

    </div>
  );
};

export default POS;
