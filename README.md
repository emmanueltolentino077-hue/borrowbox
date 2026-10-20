# 📦 BorrowBox — Campus IT Equipment Dispatch & Logistics

> A robust, full-stack campus IT hardware circulation management web application built with **Next.js 16**, **TypeScript**, **Tailwind CSS v4**, and **Supabase (PostgreSQL)**.

---

## 🌟 Overview

**BorrowBox** is an admin-exclusive operations platform designed for University IT Officers to streamline the dispatch, tracking, and returns of campus hardware assets (laptops, monitors, projectors, peripherals) across multiple academic departments and borrower types (faculty, staff, students).

Built with strict concurrency safety, all stock updates, issue requests, and returns are executed via single atomic PostgreSQL transactions to eliminate double-booking or inventory drift.

---

## 🚀 Key Modules & Features

### 1. 🛡️ Account Activation & First-Login Setup (Phase 1 & 2)
- **Directory Matching:** IT officers are pre-provisioned in `pending` state; activation verifies institutional credentials against database records.
- **EmailJS Integration:** Automated 1-click activation dispatch delivers a cryptographic activation link straight to the officer's institutional inbox.
- **Mandatory Credential Rotation:** Forces officers to configure their permanent username and strong password before unlocking operational modules.
- **Zero-Trust Server Guards:** Every page and API route strictly validates 8-hour HttpOnly session tokens and denies access if credentials setup is incomplete.

### 2. 📊 Live Logistics Dashboard (Phase 6)
- **Real-Time KPIs:** Live metrics for Total Units, Available Units, Active Circulations, and Utilization Percentage.
- **Latest Borrows Ledger:** Instant visibility of recent transactions with active status badges (*Active, Due Today, Overdue, Returned*).
- **Stock Depletion Warnings:** Highlights zero-stock items requiring replenishment.
- **Reactive Heartbeat:** 5-minute live polling interval and synchronized cache invalidation on inventory changes.

### 3. 🖥️ Equipment Inventory Management (Phase 3)
- **Category Filtering & Search:** Filter by Category (*Laptop, Monitor, Peripherals, Audio/Visual*) and stock levels (*Ready, Low Stock, Depleted*).
- **Atomic Stock Counters:** Dynamically computed circulation counts reconciled against database borrow logs.
- **CSV Data Export:** One-click export of catalog data with ISO timestamps.
- **Asset Registration:** Form validation with auto-generated product codes and image uploads.

### 4. 📝 New Borrow Dispatch Desk (Phase 4)
- **Borrower Directory Search:** Fast lookup by Name, University ID, or Department.
- **Multi-Item Dispatch Cart:** Add multiple equipment items with quantity selectors bounded by real-time available stock.
- **Fixed Due Date Rules:** Automatic cutoff calculation enforcing 17:00 Manila Time (`APP_TIMEZONE`) return policy.
- **Atomic Issuance Transaction:** Executes through PostgreSQL RPC `issue_borrow_transaction` with row-level locks.

### 5. 🔄 Returns Desk (Phase 5)
- **Live Search & Filter:** Filter by borrower name, transaction ID, or status (*Due Today, Overdue, Returned*).
- **One-Click Item Check-In:** Replenishes inventory stock immediately upon confirmation.
- **Condition & Damage Notes:** Logs equipment wear, missing cables, or damage assessments into audit history.

---

## 🛠️ Technology Stack

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router & Turbopack)
- **UI Library:** [React 19](https://react.dev/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/) & Vanilla CSS custom design tokens
- **Database:** [Supabase](https://supabase.com/) (PostgreSQL with custom functions, RPC transactions, and CHECK constraints)
- **Authentication:** Custom Jose JWT sessions with HttpOnly cookies & bcryptjs password hashing
- **Notifications:** [EmailJS REST API](https://www.emailjs.com/) for transactional activation emails
- **Icons:** [Lucide React](https://lucide.dev/)

---

## 💻 Getting Started

### Prerequisites

- **Node.js:** v18.18 or higher (v20+ recommended)
- **npm** or **pnpm**
- **Supabase Project** with PostgreSQL database
- **EmailJS Account** for activation emails

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/<your-username>/borrowbox.git
   cd borrowbox
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Copy `.env.example` to `.env.local` and fill in your keys:
   ```bash
   cp .env.example .env.local
   ```
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   SESSION_SECRET=your_minimum_32_character_random_hex_secret
   EMAILJS_SERVICE_ID=service_xxxxxxx
   EMAILJS_TEMPLATE_ID=template_xxxxxxx
   EMAILJS_PUBLIC_KEY=your_public_key
   EMAILJS_PRIVATE_KEY=your_private_key
   APP_TIMEZONE=Asia/Manila
   APP_BASE_URL=http://localhost:3000
   ```

4. **Run the Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

5. **Build for Production:**
   ```bash
   npm run build
   npm run start
   ```

---

## 🧪 Automated Test Verification Suites

The codebase includes end-to-end integration and security regression suites in the `scripts/` directory:

```bash
# Phase 1: Activation & EmailJS Verification
node scripts/test_phase1.mjs

# Phase 3: Equipment Inventory & Reconciliation
node scripts/test_phase3.mjs

# Phase 4: New Borrow Dispatch & Atomic Transactions
node scripts/test_phase4.mjs

# Phase 5: Returns Desk & Inventory Replenishment
node scripts/test_phase5.mjs

# Phase 6: Live Dashboard Metrics & Reconciliation
node scripts/test_phase6.mjs

# Phase 7: Zero-Trust API Hardening & Security Guards
node scripts/test_phase7.mjs
```

---

## 📄 License

This project is developed for educational and institutional logistics management. All rights reserved.
