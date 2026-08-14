import Invoice from '../models/Invoice.js';
import Product from '../models/Product.js';
import Brand from '../models/Brand.js';
import exceljs from 'exceljs';

// @desc    Get dashboard stats (today sales, monthly sales, revenue, profit, low stock)
// @route   GET /api/reports/dashboard-stats
// @access  Private
export const getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // 1. Fetch Today's Invoices
    const todayInvoices = await Invoice.find({
      createdAt: { $gte: today },
      status: 'Paid'
    });

    // 2. Fetch Monthly Invoices
    const monthlyInvoices = await Invoice.find({
      createdAt: { $gte: firstDayOfMonth },
      status: 'Paid'
    });

    // 2b. Fetch All Paid Invoices
    const allPaidInvoices = await Invoice.find({ status: 'Paid' });

    // 3. Compute sales figures
    const todaySales = todayInvoices.reduce((sum, inv) => sum + inv.finalAmount, 0);
    const monthlySales = monthlyInvoices.reduce((sum, inv) => sum + inv.finalAmount, 0);
    const monthlyRevenue = monthlyInvoices.reduce((sum, inv) => sum + inv.subtotal, 0);
    const totalSales = allPaidInvoices.reduce((sum, inv) => sum + inv.finalAmount, 0);

    // 4. Compute Net Profits (Sales Total Revenue - Wholesale Purchase Cost)
    let todayProfit = 0;
    for (const inv of todayInvoices) {
      for (const item of inv.items) {
        const product = await Product.findById(item.product);
        const costPerUnit = (product && product.purchasePrice > 0) 
          ? product.purchasePrice 
          : (item.sellingPrice ? item.sellingPrice * 0.7 : item.finalPrice / item.quantity * 0.7);
        const itemSellingTotal = item.finalPrice || (item.sellingPrice * item.quantity);
        const itemCostTotal = costPerUnit * item.quantity;
        todayProfit += Math.max(0, itemSellingTotal - itemCostTotal);
      }
    }

    let monthlyProfit = 0;
    for (const inv of monthlyInvoices) {
      for (const item of inv.items) {
        const product = await Product.findById(item.product);
        const costPerUnit = (product && product.purchasePrice > 0) 
          ? product.purchasePrice 
          : (item.sellingPrice ? item.sellingPrice * 0.7 : item.finalPrice / item.quantity * 0.7);
        const itemSellingTotal = item.finalPrice || (item.sellingPrice * item.quantity);
        const itemCostTotal = costPerUnit * item.quantity;
        monthlyProfit += Math.max(0, itemSellingTotal - itemCostTotal);
      }
    }

    let totalProfit = 0;
    for (const inv of allPaidInvoices) {
      for (const item of inv.items) {
        const product = await Product.findById(item.product);
        const costPerUnit = (product && product.purchasePrice > 0) 
          ? product.purchasePrice 
          : (item.sellingPrice ? item.sellingPrice * 0.7 : item.finalPrice / item.quantity * 0.7);
        const itemSellingTotal = item.finalPrice || (item.sellingPrice * item.quantity);
        const itemCostTotal = costPerUnit * item.quantity;
        totalProfit += Math.max(0, itemSellingTotal - itemCostTotal);
      }
    }

    // 5. Fetch Low Stock warnings
    const lowStockAlerts = await Product.countDocuments({
      $expr: { $lte: ['$stock', '$lowStockThreshold'] }
    });

    // 6. Recent invoices (last 5)
    const recentInvoices = await Invoice.find({})
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      data: {
        todaySales: Math.round(todaySales),
        monthlySales: Math.round(monthlySales),
        monthlyRevenue: Math.round(monthlyRevenue),
        todayProfit: Math.round(todayProfit),
        monthlyProfit: Math.round(monthlyProfit),
        totalSales: Math.round(totalSales),
        totalProfit: Math.round(totalProfit),
        lowStockAlerts,
        recentInvoices
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get dashboard chart data (last 30 days)
// @route   GET /api/reports/chart-data
// @access  Private
export const getDashboardChartData = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const invoices = await Invoice.find({
      createdAt: { $gte: thirtyDaysAgo },
      status: 'Paid'
    }).sort({ createdAt: 1 });

    // Aggregate by day
    const dailyData = {};
    
    // Seed the last 30 days with zeros
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      dailyData[dateStr] = { date: dateStr, sales: 0, profit: 0 };
    }

    // Populate actuals
    for (const inv of invoices) {
      const dateStr = new Date(inv.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      
      // Calculate profit for this invoice
      let invProfit = 0;
      for (const item of inv.items) {
        const product = await Product.findById(item.product);
        const costPerUnit = (product && product.purchasePrice > 0) 
          ? product.purchasePrice 
          : (item.sellingPrice ? item.sellingPrice * 0.7 : item.finalPrice / item.quantity * 0.7);
        const itemSellingTotal = item.finalPrice || (item.sellingPrice * item.quantity);
        invProfit += Math.max(0, itemSellingTotal - (costPerUnit * item.quantity));
      }

      if (dailyData[dateStr]) {
        dailyData[dateStr].sales += inv.finalAmount;
        dailyData[dateStr].profit += Math.round(invProfit);
      }
    }

    const chartData = Object.values(dailyData);
    res.json({ success: true, data: chartData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Generate filtered general sales & GST reports
// @route   POST /api/reports/sales-report
// @access  Private
export const getSalesReport = async (req, res) => {
  const { startDate, endDate, brandId } = req.body;

  try {
    const query = { status: 'Paid' };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // include end date entirely
        query.createdAt.$lte = end;
      }
    }

    let invoices = await Invoice.find(query).sort({ createdAt: -1 });

    // Filter by brand scope if requested
    if (brandId) {
      const brand = await Brand.findById(brandId);
      if (brand) {
        invoices = invoices.filter(inv => 
          inv.items.some(item => item.brandName === brand.name)
        );
      }
    }

    // Totals aggregates
    let totalSales = 0;
    let totalTaxable = 0;
    let totalGst = 0;
    let totalCostOfGoods = 0;

    for (const inv of invoices) {
      totalSales += inv.finalAmount;
      totalTaxable += inv.subtotal;
      totalGst += inv.totalGst;

      for (const item of inv.items) {
        const product = await Product.findById(item.product);
        const costPerUnit = (product && product.purchasePrice > 0) ? product.purchasePrice : (item.sellingPrice ? item.sellingPrice * 0.7 : item.finalPrice / item.quantity * 0.7);
        totalCostOfGoods += (costPerUnit * item.quantity);
      }
    }

    const totalProfit = totalSales - totalCostOfGoods;

    res.json({
      success: true,
      data: {
        invoices,
        summary: {
          invoiceCount: invoices.length,
          totalSales: Math.round(totalSales),
          totalTaxable: Math.round(totalTaxable),
          totalGst: Math.round(totalGst),
          totalProfit: Math.round(totalProfit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Export Sales & GST data to Excel Workbook
// @route   POST /api/reports/export-excel
// @access  Private
export const exportToExcel = async (req, res) => {
  const { startDate, endDate } = req.body;

  try {
    const query = { status: 'Paid' };
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const invoices = await Invoice.find(query).sort({ createdAt: 1 });

    const Workbook = exceljs.Workbook || exceljs;
    const workbook = new Workbook();
    
    // 1. Worksheet: Sales Summary
    const salesSheet = workbook.addWorksheet('Sales Report');
    salesSheet.columns = [
      { header: 'Invoice Number', key: 'invNo', width: 22 },
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Customer Name', key: 'custName', width: 20 },
      { header: 'Customer Mobile', key: 'custMobile', width: 16 },
      { header: 'Taxable Subtotal', key: 'subtotal', width: 18 },
      { header: 'GST Total', key: 'gst', width: 15 },
      { header: 'Discount', key: 'discount', width: 12 },
      { header: 'Net Amount', key: 'net', width: 16 },
      { header: 'Payment Mode', key: 'payMode', width: 15 }
    ];

    // Style headers
    salesSheet.getRow(1).font = { bold: true };
    salesSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2E8F0' }
    };

    invoices.forEach(inv => {
      salesSheet.addRow({
        invNo: inv.invoiceNumber,
        date: new Date(inv.createdAt).toLocaleDateString('en-IN'),
        custName: inv.customer.name,
        custMobile: inv.customer.mobile,
        subtotal: inv.subtotal,
        gst: inv.totalGst,
        discount: inv.totalDiscount,
        net: inv.finalAmount,
        payMode: inv.paymentMethod
      });
    });

    // 2. Worksheet: GST Item Breakdown (highly needed for IT return audits)
    const gstBreakdownSheet = workbook.addWorksheet('GST Tax Breakdown');
    gstBreakdownSheet.columns = [
      { header: 'Invoice Number', key: 'invNo', width: 22 },
      { header: 'Product Item', key: 'prodName', width: 25 },
      { header: 'SKU / Barcode', key: 'sku', width: 18 },
      { header: 'IMEI / Serial', key: 'imei', width: 18 },
      { header: 'Qty', key: 'qty', width: 8 },
      { header: 'Taxable Amount', key: 'taxable', width: 18 },
      { header: 'GST %', key: 'rate', width: 10 },
      { header: 'CGST (INR)', key: 'cgst', width: 14 },
      { header: 'SGST (INR)', key: 'sgst', width: 14 },
      { header: 'Line Total', key: 'total', width: 16 }
    ];

    gstBreakdownSheet.getRow(1).font = { bold: true };
    gstBreakdownSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2E8F0' }
    };

    invoices.forEach(inv => {
      inv.items.forEach(item => {
        const cgst = item.gstAmount / 2;
        const sgst = item.gstAmount / 2;
        gstBreakdownSheet.addRow({
          invNo: inv.invoiceNumber,
          prodName: `${item.brandName} ${item.name}`,
          sku: item.sku,
          imei: item.imei || 'N/A',
          qty: item.quantity,
          taxable: item.taxableAmount,
          rate: `${item.gstRate}%`,
          cgst: Number(cgst.toFixed(2)),
          sgst: Number(sgst.toFixed(2)),
          total: item.finalPrice
        });
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=RetailReport.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
