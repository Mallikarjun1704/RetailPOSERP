# TECH MART RetailPOS ERP 🚀

An **offline-first, production-ready desktop application** built with the **MERN + Electron + Tailwind** stack. Specifically designed for multi-brand mobile, TV, refrigerator, and home appliances retail stores in India, it operates entirely on Windows local machines with **zero cloud dependencies** and **no internet requirement**.

---

## Key Features

1. **🔒 Secure JWT Role-Based Auth**: Admin vs Staff operators with a dynamic database bootstrap layout for initial installs.
2. **📈 Analytics Dashboard**: Today/monthly gross sales, taxable subtotals, CGST/SGST breakdowns, net profit margin indicators, and low-stock telemetry alerts.
3. **📦 Smart Inventory Management**: CRUD products, brands, and categories. Track sparse barcode SKU indices and comma-separated serial/IMEI catalogs for mobile phones.
4. **🎟️ Scoped Coupon Pricing**: Apply percentage or fixed-amount festival coupons scoped to general totals, specific brands, category sectors, or individual products.
5. **🛒 High-Performance POS Terminal**: Live stock levels, dynamic search auto-compeletion by barcode/SKU/IMEI, automated customer loyalty balance updates, and UPI/Cash/Card/EMI payment toggles.
6. **🧾 Tax Invoice Generation**: Produces compliant, professional tax receipts, splitting SGST/CGST dynamically, with loyalty reward logs and direct print streaming.
7. **📊 Reports Ledger**: date-range sales history aggregators, GST tables, and one-click compiling to professional `.xlsx` spreadsheets using `exceljs`.
8. **🤝 Supplier & Restocks Hub**: Inward restock log sheets to scan in supplies, bulk-register incoming IMEIs, auto-increment inventories, and manage supplier outstanding balances.
9. **🛡️ System Maintenance Utilities**: Export the entire database collections dump as a single offline `.json` backup file or restore logs completely with safety boundaries.

---

## 🛠️ System Architecture & Stack

- **Desktop Framework**: Electron.js
- **Frontend Renderer**: React (Vite + TypeScript) + Tailwind CSS + Lucide Icons + Recharts
- **Local API Backend**: Node.js + Express.js (Runs inside a spawned background thread managed by Electron)
- **Local Database**: MongoDB (Mongoose ODM)

---

## 🚀 Pre-requisites & Local Installation

This desktop application requires a **local MongoDB instance** running on the target computer.

### Step 1: Install MongoDB Locally
1. Download and install **MongoDB Community Server** for Windows from [MongoDB Official Page](https://www.mongodb.com/try/download/community).
2. Start the MongoDB service. (By default, MongoDB boots automatically on Windows on connection URI `mongodb://127.0.0.1:27017/retailApp`).

### Step 2: Install Project Dependencies
In the root directory of the application (`c:\Users\Dell\Desktop\mallikarjun\retailApp`), run:
```bash
# Install root, backend, and frontend packages automatically
npm run install:all
```
*(This command coordinates standard dependencies, Express library sets, and React compiler assets)*

---

## 💻 Running the App

### Development Mode (Concurrently Hot-Reloading)
Launch all servers concurrently with hot-reloading active on both Electron and Vite UI ports:
```bash
npm run dev
```
* **React Web UI**: `http://127.0.0.1:5173`
* **Express API Server**: `http://127.0.0.1:5000`
* **MongoDB Connection**: `mongodb://127.0.0.1:27017/retailApp`

---

## 📦 Compiling and Packaging the Installer

Assemble the frontend React bundle and compile the application into a single standalone Windows executable installer `.exe` using `electron-builder`:
```bash
npm run package:win
```
This builds:
1. Compiled production assets inside `frontend/dist/`.
2. A single, click-to-run installation package inside the root `dist/` directory (e.g., `dist/RetailPOS Setup 1.0.0.exe`).

---
npm run electron:build -> runs backend and frontend dev servers. .exe
npm run electron:start -> runs both dev server and front-end dev server together .
npm run package:win ->uses electron-builder to create installer.

## ⌨️ POS Billing Keyboard Navigation Shortcuts

To maximize cashier checkout efficiency, the terminal is built to respond immediately to keyboard focus commands:
- **Scan Barcodes**: Simply direct your barcode scanner to the product search input. Barcode registers automatically, matching active SKU indexes, and appends the item to the cart.
- **IMEI Drops**: For mobile items, use `Tab` keys to navigate onto the serial dropdown list and toggle active IMEI selects using arrow keys.
- **Autofill Customers**: Type a 10-digit mobile number in customer details. When focus shifts, the backend instantly searches the customer directory, auto-completing names, addresses, and loyal points balances!

---

## 🛡️ Database Maintenance & Safety Policies

- **Backups**: Administrators should go to the **Reports & Systems** panel weekly and click **Backup DB** to download a structural `.json` database capture. Store this file in a separate USB drive.
- **Restoration**: In case of hardware failures, install the application on a new PC, click **Restore DB**, select your latest `.json` backup file, and confirm safety prompts. The system will fully repopulate all invoices, stock lists, and supplier logs!

- **Commands to stop the server and compiler**
Stop-Process -Name node -Force
Stop-Process -Name electron -Force

- **Example to create all tabs and sub-tabs**
Step 1: Create the Brand & Category (If they don't exist yet)
Go to the Inventory Hub on the sidebar.
If this is a new brand (e.g. LG) or category (e.g. Air Conditioners):
Select the Brands tab -> click Add Brand -> save the name.
Select the Categories tab -> click Add Category -> save the name.
Step 2: Create the Master Catalog Entry
Select the Products tab inside the Inventory Hub.
Click the Add Product button (visible to Admin).
Fill in the product details:
Product Name: e.g., Samsung Galaxy S24 Ultra.
SKU Code / Barcode: Unique identifiers for scanning.
Brand & Category: Select from the dropdown lists.
Pricing: Set MRP, Default purchase cost, and Selling price.
Tax Rate: Set GST rate (e.g., 18% for mobiles, 28% for luxury TVs).
IMEI Tracking: Toggle ON if it's a mobile phone/tablet, or keep it OFF for standard items.
Set the initial stock to 0 (since you are going to inward the stock through a supplier restock transaction!).
Click Save Changes.
The product will now appear in your master Product list in the Inventory Hub!

Step 3: Record the Restock
Now that the product successfully exists in your master store catalog:

Go to Suppliers & Stocking -> Inward Stock Builder.
Select the wholesale supplier and enter the purchase invoice.
Start typing the name or SKU of your newly registered product in the search field.
It will dynamically autocomplete and appear in the list! Select it to inward the wholesale units.