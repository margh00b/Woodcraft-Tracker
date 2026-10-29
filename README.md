# WCKC Tracker — Woodcraft Kitchen Cabinets

WCKC Tracker is a full-stack internal ERP and operations platform built for **Woodcraft Kitchen Cabinets**. It centralizes business workflows across sales, production, purchasing, installation, site management, and service operations.

The platform consists of two applications in a shared monorepo:

- **WCKC Web** — A Next.js application for office staff, designers, managers, schedulers, and other operational teams.
- **Insite** — A React Native mobile application built with Expo for installers, service technicians, and field personnel.

Both applications use a shared PostgreSQL database hosted on Supabase, and authentication managed in Supabase. The architecture is designed to support centralized business data, secure access, and workflows spanning the office and the field.

## Tech Stack

### Web Application — `apps/web`

- **Framework:** Next.js 16 with App Router
- **Language:** TypeScript
- **Database:** Supabase PostgreSQL
- **Database ORM:** Prisma
- **Authentication:** Supabase Auth
- **Data Fetching & Caching:** TanStack Query v5
- **UI Components:** Mantine v7
- **Styling:** Tailwind CSS v4 and Mantine Styles
- **Forms & Validation:** Mantine Form and Zod
- **Email & Calendar Integration:** Microsoft Graph API and Microsoft Outlook
- **Data Visualization:** Recharts and Mantine Charts
- **Document Generation:** `@react-pdf/renderer` and SheetJS
- **Deployment:** Vercel

### Mobile Application — `apps/insite`

- **Framework:** React Native with Expo
- **Language:** TypeScript
- **Navigation:** Expo Router
- **Authentication:** Supabase Auth
- **Authentication Token Storage:** Expo SecureStore
- **Backend:** Shared Supabase PostgreSQL database
- **Database Access:** Supabase client and dedicated Insite database schema
- **Field Data:** Structured installation reports, measurements, checklists, notes, and photographs

### Database & Infrastructure

- **Database:** Supabase PostgreSQL
- **Authentication & Identity:** Supabase Auth
- **Database Schema Management:** Declarative SQL schemas managed with pg-delta
- **File Storage:** Private Supabase Storage bucket for job-related attachments
- **Database Architecture:** Shared core business tables with a dedicated `insite` schema for mobile-specific data
- **Authorization:** Role-based access control, database permissions, and protected application routes

## Core Modules & Features

### 1. Executive Dashboards & Access Control

- Role-specific interfaces for managers, designers, schedulers, installation teams, and other operational users.
- Operational summaries for sales orders, active jobs, purchasing, installation, and service workflows.
- Centralized navigation with access restrictions based on user roles.
- Protected routes and navigation guards to prevent unauthorized access and help protect unsaved changes.

### 2. Client Management & Sales Orders

- Centralized client records and contact information.
- Sales order management for quotes and sold orders.
- Cabinet specifications, including species, colour, finish, glaze, door style, drawer configuration, hardware, and box construction.
- Financial tracking for order totals, deposits, and outstanding balances.
- Job creation and linking workflows for sold orders.
- Shipping, delivery, installation, and order information associated with the relevant sales order and job.

### 3. Production & Job Management

- Centralized job tracking throughout the production lifecycle.
- Production scheduling for key manufacturing stages.
- Job-specific details and operational status tracking.
- Scheduling interfaces for office and production teams.
- Job-level information that connects sales, purchasing, installation, and service activities.

### 4. Microsoft Outlook Integration

- Outlook email access within the web application.
- Association of email conversations with relevant jobs.
- Centralized access to job-related communication.
- Microsoft Graph API integration with Microsoft authentication through MSAL.

### 5. Purchasing & Material Tracking

- Purchasing workflows for cabinet components, doors, glass, handles, accessories, laminate, and other materials.
- Tracking of ordered, received, and incomplete items.
- Backorder management and follow-up workflows.
- Purchasing tables with filtering and operational status visibility.
- Job-related purchasing information to support production readiness.

### 6. Installation Management

- Installation scheduling and installer assignment.
- Job-specific installation information and status tracking.
- Installation report receipt tracking in the web application.
- Access to installer-submitted reports associated with individual jobs.
- Dedicated installation report listing and detail views, with filtering by job and other report information.
- Report attachments and photographs stored through Supabase Storage.
- Readable report presentation for reviewing field submissions.

### 7. Insite — Mobile Field Operations

Insite is the mobile companion application for installers and other field personnel. It connects field workflows with the same core job data used by the WCKC web application.

**Job selection and navigation**

- Search for and select valid jobs.
- View relevant job information and job suffixes.
- Navigate between a selected job and its available forms.

**Digital installation reports**

- Complete structured installation forms on-site.
- Record installation checklist responses, notes, and opening measurements.
- Mark openings as not applicable where appropriate.
- Capture and attach photographs to installation reports.
- Submit reports associated with the relevant job.

**Data persistence and integration**

- Store report data in the dedicated PostgreSQL `insite` schema.
- Associate submitted reports and file attachments with the corresponding core job records.
- Use Supabase Auth authentication to identify authenticated users.
- Allow the web application to retrieve and review submitted reports.

The separation between the core business schema and the Insite-specific schema keeps mobile-specific data organized while preserving relationships with existing WCKC jobs.

### 8. Site Visits & Inspections

- Workflows for recording site information and field observations.
- Digital inspection and sign-off processes.
- Structured reporting for field activities.
- Job-linked documentation to support office and field coordination.

### 9. Service Orders & Warranty Work

- Service and deficiency tracking linked to original jobs.
- Service order information and required parts.
- Support for warranty and post-installation work.
- Job-related documentation for service coordination and technicians.

### 10. Reporting & Document Generation

- Operational reporting across relevant business modules.
- PDF generation for supported reports and service documentation.
- Excel export capabilities where implemented.
- Printable installation report details and associated field documentation.

## Architecture

WCKC Tracker is organized as a monorepo so the web and mobile applications can evolve together while retaining separate application responsibilities.

```text
wckc/
├── apps/
│   ├── web/                  # Next.js ERP for office teams
│   └── insite/               # Expo mobile app for field teams
├── supabase/
│   └── schemas/              # Declarative PostgreSQL schemas
├── prisma/                   # Prisma database configuration/schema
├── package.json              # Workspace configuration
└── ...
```

The exact contents of individual directories may evolve as the project grows.

### Shared Data Model

The applications share the same Supabase PostgreSQL database:

- **Core schema (`public`)** — Existing business entities, including jobs and related operational records.
- **Insite schema (`insite`)** — Mobile-specific records, including installation reports.
- **Job attachments** — File metadata associated with jobs and submitted reports, with files stored in private Supabase Storage.

This structure allows Insite to extend existing job workflows without duplicating the core job records.

### Data Access & State Management

- TanStack Query manages client-side server state, caching, and data fetching in the web application.
- Supabase provides database access and storage integration.
- Prisma supports the web application's database tooling and data model.
- Server-side route handlers provide a boundary for web application write operations where implemented.
- Declarative SQL schemas and pg-delta help manage database structure changes through version-controlled definitions.

## Security

Security is a core architectural consideration for both applications.

- **Supabase Auth authentication** for user identity and authenticated application access.
- **Role-based access control** for restricting access to authorized modules.
- **Protected routes and navigation guards** in the web application.
- **Supabase permissions and schema grants** for controlling database access.
- **Private file storage** for job-related attachments and installation photographs.
- **Server-side handling of privileged operations** to avoid exposing service-role credentials to client applications.
- **Secure mobile token storage** using Expo SecureStore.

Database permissions, authentication, and authorization policies must be configured consistently with each application's intended access requirements.

## Development Setup

### Prerequisites

- Node.js and npm
- Access to the WCKC Tracker repository
- A configured Supabase project
- Supabase Auth application credentials
- Expo-compatible development environment for Insite
- Microsoft application credentials if developing Outlook integration

### Install Dependencies

From the repository root:

```bash
npm install
```

### Run the Web Application

```bash
npm run dev --workspace=apps/web
```

### Run Insite

```bash
npm run start --workspace=apps/insite
```

Check the root and workspace `package.json` files for the exact available scripts.

### Environment Configuration

Configure the environment variables required by each application. These may include:

- Supabase project URL and public client key.
- Supabase database connection strings for Prisma and database tooling.
- Supabase Auth publishable and secret keys.
- Microsoft identity and Graph API configuration.
- Other integration-specific configuration.

Keep secrets in environment variables and never commit credentials, service-role keys, or private tokens to source control.

## Project Goals

WCKC Tracker aims to provide Woodcraft Kitchen Cabinets with a unified operational platform that:

- Connects office workflows with field operations.
- Centralizes job, sales, production, purchasing, and service information.
- Reduces reliance on legacy tracking systems and disconnected processes.
- Provides installers and field personnel with mobile reporting tools.
- Improves visibility into job status and operational documentation.
- Supports maintainable database changes and future application growth.

## Status

WCKC Tracker is an actively developed internal application. Features and integrations continue to evolve as the web ERP and Insite mobile application are expanded.
