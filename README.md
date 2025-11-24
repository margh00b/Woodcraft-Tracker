# WCKC Tracker (Woodcraft Kitchen Cabinets)

A modern, full-stack internal ERP application designed for Woodcraft Kitchen Cabinets to streamline operations. This application centralizes the workflow from initial client intake and sales quotes to production scheduling, purchasing, installation, and service/warranty orders.

## 🚀 Tech Stack

- **Framework:** [Next.js 14 (App Router)](https://nextjs.org/)
- **Language:** TypeScript
- **Database:** [Supabase](https://supabase.com/) (PostgreSQL)
- **Authentication:** [Clerk](https://clerk.com/)
- **UI Library:** [Mantine v7](https://mantine.dev/)
- **Styling:** Tailwind CSS & Mantine Styles
- **State Management:** [TanStack Query](https://tanstack.com/query/latest)
- **Form Validation:** [Zod](https://zod.dev/) & Mantine Form
- **PDF Generation:** [@react-pdf/renderer](https://react-pdf.org/)

## ✨ Features

### 1. 📊 Sales & Estimates
- **Quote to Job Workflow:** Create quotes and convert them into confirmed jobs with a single click.
- **Detailed Specs:** Track cabinet specifications (Species, Door Style, Finish, Box construction) alongside financials (Total, Deposit, Balance).
- **Client Management:** Dedicated CRM module to manage client contact info and history.

### 2. 🏭 Production Management
- **Scheduler:** Visual interface to set dates for key production stages (Cut, Paint, Assembly, Shipping).
- **Live Actuals:** Shop floor interface to track real-time progress (e.g., "Doors Completed", "In Plant").
- **Visual Tracking:** Progress timelines and status indicators for every job.

### 3. 🛒 Purchasing
- **Material Tracking:** Track ordering and receiving status for Doors, Glass, Handles, Accessories, and Laminate.
- **Status Actions:** Quick-action menus to mark items as "Ordered" or "Received" with timestamps.

### 4. 🚚 Installation
- **Schedule Coordination:** Assign installers and set installation/inspection dates.
- **Shipping Status:** Track when jobs are wrapped and shipped.
- **Completion Sign-off:** Digital sign-off for installation and final inspection completion.

### 5. 🛠️ Service Orders
- **Warranty/Deficiency Tracking:** Generate service tickets linked to original jobs.
- **PDF Generation:** Auto-generate professional PDF service orders for technicians.
- **Parts List:** detailed tracking of required parts for every service call.

