<p align="center">
  <img src="./logo.png" width="120" alt="AssetFlow Logo" />
</p>

<h1 align="center">AssetFlow</h1>

<p align="center">
  <strong>Enterprise Asset &amp; Resource Management System</strong>
</p>

<p align="center">
  A centralized ERP-style asset management platform for tracking physical items through their full lifecycle, allocating resources without conflicts, booking slots, and running audit cycles.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="TailwindCSS" />
  <img src="https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express.js" />
  <img src="https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white" alt="Socket.io" />
</p>

---

## 📖 Short Description (For GitHub Repo Sidebar)
> "AssetFlow is a modern Enterprise Asset & Resource Management System built on React, Express, Prisma, and PostgreSQL. It tracks full asset lifecycles, schedules shared resources with conflict prevention, logs real-time events via WebSockets, and automates structured inventory audits."

---

## ✨ Features

| Feature | Description | State |
| :--- | :--- | :---: |
| **🔄 Lifecycle States** | Tracks assets through `Available` ↔ `Allocated` ↔ `Under Maintenance` ↔ `Lost` ↔ `Retired`. | Completed |
| **🔒 Double-Allocation Check** | Prevents booking or assigning the same asset to multiple stakeholders simultaneously. | Completed |
| **📅 Scheduling Calendar** | Fully featured shared resource timeline and calendar powered by FullCalendar. | Completed |
| **🔧 Maintenance Workflows** | Structured service ticket request and technician stages with approval checks. | Completed |
| **📊 Real-time Logs** | Instant dashboard activity feeds, status pulses, and notification center via Socket.io. | Completed |
| **📋 Auditing Cycles** | Structured inventory check cycles with assigned auditors and discrepancy reporting. | Completed |

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph Client [React Client Application - Port 5173]
        UI[Tailwind Theme & Components]
        RQ[TanStack Query State]
        WS_Client[Socket.io Web Client]
    end

    subgraph Server [Express Backend API - Port 5000]
        Routes[API Router v1]
        Controllers[Auth / Asset / Audit Controllers]
        Services[Conflict Validation Services]
        WS_Server[Socket.io Gateway]
    end

    subgraph Database [Storage Layer]
        PR[Prisma Client ORM]
        DB[(PostgreSQL Database)]
    end

    UI --> RQ
    RQ -->|HTTP / JSON Requests| Routes
    WS_Client <-->|Websocket Real-time Updates| WS_Server
    Routes --> Controllers
    Controllers --> Services
    Services --> PR
    PR <--> DB
    WS_Server -.->|Activity Triggers| Controllers
```

---

## 🎨 Theme Details
The system utilizes a custom, premium default theme designed with readability and enterprise aesthetics in mind:
* **Midnight Navy (`#192A56`):** Primary theme text, headers, and sidebar.
* **Champagne (`#F7D794`):** Soft hover background highlights.
* **Dusty Rose (`#EDA6A3`):** Active accent colors and status indicators.
* **Pearl White (`#FCFBFB`):** Clean page backgrounds.

---

## 🚀 Setup & Execution Guide

### Prerequisite
Ensure your local PostgreSQL service is running and configure the `DATABASE_URL` in `apps/server/.env`:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/assetflow?schema=public"
```

### 1. Backend Server Setup
Navigate to the server folder and prepare the database:
```powershell
cd apps/server
npm install
```

Generate the Prisma Client structures, push schemas, and load default seed data:
```powershell
# Bypasses CLI path wrapper issues with special characters (like '&') in path folder names
npm run prisma:generate
npm run prisma:push
npm run prisma:seed
```

Start the backend server in development mode:
```powershell
# Runs tsc compilation and starts nodemon watching the /src folder
nodemon
```
The server will boot on `http://localhost:5000`.

### 2. Frontend Client Setup
Open a new terminal tab, navigate to the client folder, and run:
```powershell
cd apps/client
npm install
npm run dev
```
The application will boot on `http://localhost:5173`.

---

## 🗄️ Database Inspection (Prisma Studio)
To visually browse your database tables (e.g. view seeded admin details, active bookings, audit records):
1. In the `apps/server` directory, run:
   ```powershell
   npm run prisma:studio
   ```
2. Open `http://localhost:5555` in your browser.

---

## 🔐 Credentials for Testing
Login as the default seeded administrator:
* **Email:** `admin@assetflow.com`
* **Password:** `AdminPassword123`

*Note: Sign up defaults to the `EMPLOYEE` role. To promote users to `ASSET_MANAGER` or `DEPARTMENT_HEAD`, log in as the Administrator, open the **Organization Setup** screen, select the **Employees** tab, and click **Promote / Set Role**.*
