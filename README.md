# PriceProof — Household Essentials Price History and Unit-Cost Comparator

A full-stack grocery comparison platform built for Indian families and budget-conscious consumers. PriceProof standardizes packaging quantities, tracks historical retail shifts, detects misleading discount claims, and computes true unit costs across 8 leading Indian retailers.

---

## 1. Mandatory Technology Stack

| Component | Technology |
|---|---|
| **Frontend Structure** | HTML5 Semantic Markup |
| **Styling** | CSS3 (Variables, Grid, Flexbox, Light & Dark Themes) |
| **Frontend Logic** | Vanilla JavaScript (ES6+ Modules) |
| **Backend** | Node.js (LTS v24.x) |
| **Backend Framework** | Express.js 4.x |
| **Database** | Supabase PostgreSQL 15+ |
| **Authentication** | Supabase GoTrue Auth & Row Level Security (RLS) |
| **Data Security** | PostgreSQL RLS Policies & Server-side RBAC |
| **Visual Analytics** | Chart.js |
| **API Client** | Native Fetch API |
| **Version Control** | Git & GitHub |

---

## 2. Supported Retailers (Indian Grocery Ecosystem)

1. **DMart Ready** (Hypermarket bulk value reference)
2. **BigBasket** (Comprehensive scheduled delivery)
3. **Blinkit** (Quick-commerce convenience)
4. **Zepto** (Instant grocery delivery)
5. **JioMart** (Nationwide staple retail)
6. **Amazon Fresh** (Packaged & pantry essentials)
7. **Flipkart Grocery** (Supermarket staples)
8. **Local Supermarkets** (Neighborhood brick-and-mortar reference)

---

## 3. Core Capabilities & Mathematical Engines

### A. Unit-Cost Calculation Engine
Standardizes discrete packages to canonical units (`kg` for weights, `L` for volumes):
$$\text{Unit Cost} = \frac{\text{Selling Price}}{\text{Standardised Quantity in Base Unit}}$$
- Converts grams (`g`) to kilograms (`kg`) and millilitres (`ml`) to litres (`L`).
- Strictly rejects zero/negative quantities to prevent division by zero.
- Rejects comparisons between incompatible measurement dimensions.

### B. Discount Transparency System
Evaluates advertised MRP markdowns against historical observations using neutral statistical benchmarks:
- **Lowest Observed Price:** Current price matches or beats the all-time recorded low.
- **Below Historical Average:** Price is at least 3% below the rolling average.
- **Near Typical Price:** Advertised discount is essentially regular everyday shelf pricing.
- **Above Historical Average:** Price is inflated despite an advertised sale badge.
- **Insufficient Historical Data:** Flagged when fewer than 2 distinct past price records exist.

### C. Shopping Basket Optimizer
Offers two comparison modes for saved shopping lists:
1. **Single-Store Basket:** Bundles all list items to one retailer, automatically factoring in retailer delivery fees and minimum free-delivery thresholds.
2. **Lowest-Price Multi-Store Combination:** Identifies the cheapest vendor for every item and highlights gross potential savings.

---

## 4. Beginner-Friendly Windows & VS Code Setup

### Step 1: Open Project in VS Code
1. Launch **Visual Studio Code**.
2. Click **File > Open Folder...** and select:
   ```text
   C:\SahithiLearning\Price Proof
   ```
3. Open the integrated terminal using the shortcut:
   `Ctrl + \`` (or **Terminal > New Terminal**).

### Step 2: Install Node.js Dependencies
In the terminal, run:
```powershell
npm install
```

### Step 3: Configure Supabase Database
1. Open your Supabase Dashboard: [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project: `https://ufgzxyyieetnsiwholwl.supabase.co`
3. Click **SQL Editor** in the left sidebar.
4. Click **New Query**.
5. Open `supabase/full_setup.sql` from your project folder, copy its entire contents, paste it into the Supabase SQL Editor, and click **Run**.
   *This automatically provisions all 16 tables, check constraints, RLS security policies, and 50+ realistic Indian grocery items across 14 brands.*

### Step 4: Verify Environment Variables
Check that your `.env` file contains your credentials:
```env
PORT=5000
NODE_ENV=development
SUPABASE_URL=https://ufgzxyyieetnsiwholwl.supabase.co
SUPABASE_ANON_KEY=sb_publishable_7us7XO7aI9oFK0uAFDBWMg_YYNOXtMM
SUPABASE_SERVICE_ROLE_KEY=sb_publishable_7us7XO7aI9oFK0uAFDBWMg_YYNOXtMM
FRONTEND_URL=http://localhost:5000
```

### Step 5: Start the Full-Stack Application
Start the Node.js Express server:
```powershell
npm start
```
*(Or run `npm run dev` for automatic live-reload on code edits).*

### Step 6: Open the Website in Your Browser
Open your browser and navigate to:
```text
http://localhost:5000
```

---

## 5. Running the Automated Test Suite

PriceProof includes automated tests covering unit-cost conversions, division-by-zero guards, multi-store basket optimizations, and discount transparency logic:

```powershell
npm test
```

Expected output:
```text
✔ API Endpoints: GET /api/products/categories returns 9 categories
✔ API Endpoints: GET /api/products returns catalog with unit costs
✔ API Endpoints: Comparison Matrix highlights best unit value
✔ DiscountService: Detect Lowest Observed Price
✔ DiscountService: Flag Insufficient Data when fewer than 2 records exist
✔ DiscountService: Identify Near Typical Price when price matches historical average
✔ SavingsService: Single Store Totals with Delivery Fee Rules
✔ SavingsService: Optimized Multi-Store Combination identifies cheapest items
✔ UnitCostService: Standardize Grams to Kilograms
✔ UnitCostService: Standardize Millilitres to Litres
✔ UnitCostService: Accurate Unit Cost Calculation for 5kg Rice costing ₹320
✔ UnitCostService: Accurate Unit Cost Comparison between 5kg and 10kg
✔ UnitCostService: Reject Zero or Negative Quantity to Prevent Division by Zero
✔ UnitCostService: Reject Incompatible Unit Dimensions
```

---

## 6. Manual Testing Checklist (End-to-End User Journey)

- [x] **Homepage (`/`)**: Hero section, search bar, 9 category cards, verified price drops, and "How Unit Cost Works" educational guide.
- [x] **Catalog (`/products.html`)**: Filter products by category, filter by brand, search by text, sort by price (lowest/highest) and A-Z.
- [x] **Product Details (`/product-details.html?id=...`)**: View package variants, switch sizes (e.g. 1 kg vs 5 kg), inspect store comparison table, and read Discount Transparency analysis.
- [x] **Store Comparison (`/compare.html?id=...`)**: Full side-by-side view comparing DMart, BigBasket, Blinkit, Zepto, and JioMart with standardized unit-cost badges.
- [x] **Price Trends (`/price-history.html?variantId=...`)**: Interactive Chart.js multi-line graph with toggleable timeframes (`7d`, `30d`, `3m`, `6m`, `1y`, `all`).
- [x] **Shopping List (`/shopping-list.html`)**: Add items, update quantities, view single-store delivery comparisons vs multi-store cheapest combinations, and see potential rupee savings.
- [x] **Wishlist (`/wishlist.html`)**: Save items to track deals and configure target-price alerts.
- [x] **Authentication (`/login.html` & `/register.html`)**: Supabase Auth session management, token persistence, and role-based access.
- [x] **Admin Portal (`/admin/dashboard.html`)**: Add new products, log manual price observations with automatic audit trail and alert evaluation, and simulate batch feed ingestion.

---

## 7. Production Deployment Instructions

### Hosting Architecture:
- **Frontend & Backend:** Render, Railway, Fly.io, or DigitalOcean App Platform (Node.js runtime).
- **Database & Auth:** Supabase PostgreSQL with Row Level Security.

### Deployment Steps:
1. Initialize Git repository and commit code:
   ```powershell
   git init
   git add .
   git commit -m "Initial commit of complete PriceProof application"
   ```
2. Push repository to GitHub.
3. Link GitHub repository to **Render** or **Railway**.
4. Set build command: `npm install`
5. Set start command: `npm start`
6. Add environment variables:
   - `PORT=5000`
   - `NODE_ENV=production`
   - `SUPABASE_URL=https://ufgzxyyieetnsiwholwl.supabase.co`
   - `SUPABASE_ANON_KEY=<your-anon-key>`
   - `SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>`
7. In the Supabase dashboard (**Authentication > URL Configuration**), set Site URL and Redirect URLs to your deployed production domain.
