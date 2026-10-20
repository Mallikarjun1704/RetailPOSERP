export interface User {
  _id: string;
  name: string;
  username: string;
  role: 'admin' | 'staff';
  token?: string;
  isActive?: boolean;
}

export interface Category {
  _id: string;
  name: string;
  description?: string;
}

export interface Brand {
  _id: string;
  name: string;
  description?: string;
}

export interface Product {
  _id: string;
  name: string;
  modelNumber?: string;
  sku: string;
  barcode?: string;
  category: Category | string;
  brand: Brand | string;
  description?: string;
  mrp: number;
  purchasePrice: number;
  sellingPrice: number;
  gstRate: number;
  stock: number;
  lowStockThreshold: number;
  hasIMEI: boolean;
  imeiList: string[];
  warrantyMonths: number;
  image?: string;
}

export interface Customer {
  _id: string;
  name: string;
  mobile: string;
  email?: string;
  address?: string;
  loyaltyPoints: number;
  purchaseCount: number;
  totalSpent: number;
  totalCgst?: number;
  totalSgst?: number;
  totalTaxable?: number;
  totalGst?: number;
}

export interface Coupon {
  _id: string;
  code: string;
  description?: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minPurchaseAmount: number;
  maxDiscountAmount: number | null;
  startDate?: string;
  expiryDate: string;
  isActive: boolean;
  brandScope?: Brand | string | null;
  categoryScope?: Category | string | null;
  productScope?: Product | string | null;
}

export interface InvoiceItem {
  product: string;
  name: string;
  sku: string;
  brandName: string;
  categoryName: string;
  quantity: number;
  mrp: number;
  sellingPrice: number;
  discount: number;
  couponCode?: string;
  gstRate: number;
  gstAmount: number;
  taxableAmount: number;
  finalPrice: number;
  imei?: string;
}

export interface Invoice {
  _id: string;
  invoiceNumber: string;
  customer: {
    customerId?: string;
    name: string;
    mobile: string;
    email?: string;
    address?: string;
  };
  items: InvoiceItem[];
  subtotal: number;
  totalGst: number;
  totalDiscount: number;
  finalAmount: number;
  paymentMethod: 'Cash' | 'Card' | 'UPI' | 'EMI';
  paymentDetails?: string;
  giftItem?: string;
  cashier: {
    userId: string;
    name: string;
  };
  status: 'Paid' | 'Refunded';
  loyaltyPointsEarned: number;
  createdAt: string;
}

export interface Supplier {
  _id: string;
  name: string;
  contactPerson?: string;
  mobile: string;
  email?: string;
  address?: string;
  gstin?: string;
  outstandingBalance: number;
}

export interface PurchaseItem {
  product: string;
  quantity: number;
  purchasePrice: number;
  sellingPrice?: number;
  gstRate: number;
  imeiList?: string[];
}

export interface PurchaseRecord {
  _id: string;
  supplier: Supplier;
  invoiceNumber: string;
  purchaseDate: string;
  items: {
    product: Product;
    quantity: number;
    purchasePrice: number;
    sellingPrice?: number;
    gstRate: number;
    imeiList: string[];
  }[];
  subtotal: number;
  totalGst: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  status: 'Paid' | 'Partial' | 'Unpaid';
  createdAt: string;
}

export interface DashboardStats {
  todaySales: number;
  monthlySales: number;
  monthlyRevenue: number;
  todayProfit: number;
  monthlyProfit: number;
  totalSales: number;
  totalProfit: number;
  lowStockAlerts: number;
  totalProducts?: number;
  totalStock?: number;
  recentInvoices: Invoice[];
}
