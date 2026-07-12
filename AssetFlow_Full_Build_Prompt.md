# AssetFlow — Full Product & Engineering Build Prompt

> Copy this entire document into your AI builder / Claude Code / dev team as a single master spec. It defines the product, the brand, the UI/UX system, the full tech architecture, the database schema, the API surface, and a screen-by-screen build spec for **AssetFlow**, an Enterprise Asset & Resource Management System.

---

## 1. Product Overview

**Product name:** AssetFlow
**Category:** Enterprise Asset & Resource Management ERP module
**One-line pitch:** AssetFlow is a centralized platform that lets any organization — offices, schools, hospitals, factories, agencies — track physical assets through their full lifecycle, allocate them without conflicts, book shared resources by time slot, route maintenance through approvals, and run structured audits, all from one clean dashboard.

**Explicitly out of scope:** purchasing, invoicing, and accounting workflows. Acquisition cost is stored only for reporting/ranking, never linked to an accounting ledger.

### Core capabilities to build
1. Departments, asset categories, and an employee directory (master data)
2. Asset lifecycle tracking: `Available → Allocated → Reserved → Under Maintenance → Lost → Retired → Disposed`, with valid transitions enforced (e.g. `Available ↔ Under Maintenance`, `Allocated → Available`)
3. Asset allocation to employees/departments with **double-allocation prevention** and a transfer-request fallback
4. Shared/bookable resource scheduling with **overlap validation**
5. Maintenance requests routed through an **approval workflow** before work starts
6. Scheduled **audit cycles** with assigned auditors and auto-generated discrepancy reports
7. Notifications + KPI dashboard surfacing overdue returns, bookings, and maintenance activity
8. Realistic, non-self-elevating role assignment (nobody signs up as Admin)

### User roles
| Role | Capabilities |
|---|---|
| **Admin** | Manages departments, categories, audit cycles, employee/role promotion (Organization Setup). Views org-wide analytics. |
| **Asset Manager** | Registers/allocates assets. Approves transfers, maintenance requests, audit discrepancy resolution, and returns/condition check-ins. |
| **Department Head** | Views assets allocated to their department. Approves allocation/transfer requests within their department. Books shared resources on behalf of the department. |
| **Employee** | Views assets allocated to them. Books shared resources. Raises maintenance requests. Initiates return/transfer requests. |

**Critical rule:** Signup only ever creates an **Employee** account — there is no role selector at signup. Admin promotes Employees to Department Head or Asset Manager from the Employee Directory screen. This is the *only* place roles are ever assigned.

---

## 2. Brand & Visual Identity

### 2.1 Naming logic → visual language
"Asset**Flow**" should visually communicate **structure + motion** — the idea of physical things moving smoothly through defined states (registered → allocated → maintained → returned) without friction or loss. The identity should feel like a modern, trustworthy enterprise SaaS product (think Linear, Notion, Vercel Dashboard) — **not** like a generic dusty inventory tool.

### 2.2 Logo concept (generate as SVG/vector, not a photo)
- Mark: an abstract geometric monogram built from the letters **"A" + "F"**, constructed so the crossbar of the A becomes a flowing/curved ribbon line that continues into the F — implying continuity and "flow" between states.
- Alternative concept: a rounded square/hexagon "asset tag" badge shape (referencing the AF-0001 asset tag concept from the product itself) with a subtle flow-line or checkmark-arrow cut through it, in a gradient from the primary to accent color.
- Style: flat, geometric, 2-color max (plus optional gradient), works at 24px favicon size and at full wordmark lockup size.
- Provide 3 lockups: icon-only (favicon/app icon), icon + wordmark (navbar), wordmark-only (footer/print).
- Deliver both a light-mode version (dark mark on transparent) and dark-mode version (light/gradient mark on transparent).

### 2.3 Color system
Base the palette around a confident **indigo/blue "flow" primary** paired with a **teal/emerald "available/verified" accent**, since the product's core semantic states (Available, Allocated, Under Maintenance, Lost, etc.) need a clear status-color language of their own on top of the brand colors.

**Brand tokens**
- `--color-primary`: Indigo `#4F46E5` (light) / `#818CF8` (dark) — primary actions, active nav, links, focus rings
- `--color-primary-foreground`: white / `#0B0F19`
- `--color-accent`: Teal `#14B8A6` — secondary CTAs, "flow" highlights, success gradients
- `--color-background`: `#F8FAFC` (light) / `#0B0F19` (dark)
- `--color-surface` (cards/panels): `#FFFFFF` (light) / `#111827` (dark)
- `--color-border`: `#E2E8F0` (light) / `#1F2937` (dark)
- `--color-muted-foreground`: `#64748B` (light) / `#9CA3AF` (dark)

**Semantic status colors (used consistently across Assets, Bookings, Maintenance, Audit):**
- Available → emerald `#10B981`
- Allocated → indigo `#6366F1`
- Reserved → amber `#F59E0B`
- Under Maintenance → orange `#F97316`
- Lost → rose `#F43F5E`
- Retired → slate `#64748B`
- Disposed → zinc `#3F3F46`
- Overdue/alerts → red `#EF4444`
- Pending/approval-needed → amber `#F59E0B`
- Approved/resolved/verified → emerald `#10B981`
- Rejected/damaged/missing → rose `#F43F5E`

Every status must render as a **pill/badge** with consistent color mapping app-wide (dashboard KPIs, tables, kanban cards, calendar, timeline).

### 2.4 Typography
- **Headings:** "Space Grotesk" or "Sora" — geometric, modern, slightly technical, matches the "flow/structure" brand feel
- **Body/UI:** "Inter" — for maximum legibility in dense data tables and forms
- **Monospace (asset tags, serials, IDs):** "JetBrains Mono" — use for Asset Tags (AF-0001), Serial Numbers, audit codes so they read as data, not prose

### 2.5 Theme toggle (light/dark)
- Persist choice in `localStorage`, default to system preference (`prefers-color-scheme`) on first load.
- Toggle lives in the top navbar as an animated sun/moon icon switch (Framer Motion rotate + cross-fade, ~250ms).
- All Tailwind colors must be defined as CSS variables consumed via `tailwind.config` `theme.extend.colors` referencing `hsl(var(--...))` so Shadcn UI theming and custom components share one source of truth.
- Dark mode should not just invert — surfaces should use elevated dark-gray layering (`#0B0F19` base → `#111827` card → `#1A2233` hover/popover) so depth is still readable.

---

## 3. Design System & Interaction Requirements

### 3.1 Layout
- Persistent **left sidebar nav** (collapsible to icon-only rail) with sections mirroring the 10 screens: Dashboard, Organization Setup, Assets, Allocation & Transfer, Resource Booking, Maintenance, Audit, Reports, Notifications — visible items scoped by role (e.g., Organization Setup only visible to Admin).
- Top bar: global search (assets by tag/serial/QR), theme toggle, notification bell with live unread badge, user menu (profile, role badge, logout).
- Content area uses a consistent page header (title + breadcrumb + primary action button) then a card-based content grid.
- Fully responsive: sidebar collapses to a bottom nav / drawer on mobile; tables convert to stacked cards under `md` breakpoint.

### 3.2 Motion (Framer Motion) — required, not optional
- **Page transitions:** route changes fade+slide (12px translateY, 200–300ms, ease `[0.22, 1, 0.36, 1]`) using `AnimatePresence` wrapping `React Router`'s outlet.
- **Reveal-on-scroll:** dashboard KPI cards, report charts, and long lists animate in with a staggered fade/slide-up (`staggerChildren: 0.06`) the first time they enter viewport (`whileInView`, `viewport={{ once: true }}`).
- **Entry animation (app load / login → dashboard):** logo mark draws in (SVG path stroke animation) over ~800ms then cross-fades into the dashboard shell.
- **Exit animation:** modals/drawers/toasts must animate out (scale 0.96 + fade for modals, slide-out for drawers/toasts), never just disappear.
- **Micro-interactions:** buttons scale 0.97 on tap (`whileTap`), cards lift on hover (`whileHover={{ y: -2, boxShadow: ... }}`), status badges pulse briefly when a status changes in real time (via Socket.io event).
- **Kanban (Maintenance screen):** drag handled with `framer-motion`'s `Reorder` or `dnd-kit` + Framer layout animations (`layout` prop) so cards animate smoothly between columns.
- **Skeleton loading:** every data-fetching surface (tables, KPI cards, charts, calendar) must show a Shadcn/custom skeleton (shimmer animation, matching the real component's shape) while TanStack Query is in a loading state — never a blank screen or spinner-only.

### 3.3 Feedback & affordances
- **Toast/pop notifications** (Shadcn `sonner` or `toast`) for every mutation: success (emerald), error (rose), info (indigo) — auto-dismiss 4s, swipe-to-dismiss, stacked, with an icon per type.
- **Tooltips** (Shadcn `Tooltip`) on: all icon-only buttons, truncated table cells, status badges (explain what the status means), disabled buttons (explain why disabled, e.g. "Asset already allocated to Priya Shah").
- **Icons:** `lucide-react` throughout — consistent 18–20px stroke-width-2 icons; every module gets a distinct icon (e.g. `Boxes` for Assets, `ArrowLeftRight` for Allocation & Transfer, `CalendarClock` for Booking, `Wrench` for Maintenance, `ClipboardCheck` for Audit, `BarChart3` for Reports, `Bell` for Notifications).
- **Empty states:** every list/table has an illustrated empty state (simple line-art SVG in brand colors) with a primary CTA (e.g. "No assets yet — Register your first asset").
- **Confirm-before-destructive:** Shadcn `AlertDialog` for deactivate department, close audit cycle, delete asset, reject request.

---

## 4. Tech Stack (use exactly this)

**Frontend**
- React.js via Vite + TypeScript
- Tailwind CSS (with CSS variable–based theme, dark mode `class` strategy)
- Shadcn UI (Radix-based components, fully themed to tokens in §2.3)
- Framer Motion for all animation described in §3.2
- React Router v6 (nested routes, role-protected route wrapper)
- React Hook Form + Zod for all forms and validation schemas (shared Zod schemas mirrored from backend validation where practical)
- Axios (single instance with interceptors for JWT attach + 401 refresh/redirect)
- TanStack Query (all server state — queries, mutations, cache invalidation, optimistic updates for e.g. instant status badge changes)

**Backend**
- Node.js + Express.js (layered architecture: routes → controllers → services → Prisma)
- Prisma ORM + PostgreSQL
- JWT authentication (access + refresh token pattern), bcrypt for password hashing
- Multer for multipart uploads (asset photos/docs, maintenance photos) → streamed to Cloudinary
- Nodemailer for email (welcome email, password reset, overdue reminders digest)

**Storage:** Cloudinary (asset photos, documents, maintenance photos, avatar), PostgreSQL (all relational data)

**Charts:** Recharts (utilization trends, maintenance frequency, booking heatmap, department allocation summary)

**Calendar:** FullCalendar (resource booking calendar view — timeGrid + resourceTimeline for shared resources)

**QR Code:** `qrcode` npm package — generate a QR per asset (encodes Asset Tag + internal lookup URL) at registration time, store the image in Cloudinary, printable label view

**Real-time notifications:** Socket.io — server emits events (`asset:allocated`, `booking:confirmed`, `maintenance:approved`, `transfer:approved`, `audit:discrepancy`, `return:overdue`) to role/department/user-scoped rooms; client shows a toast + increments the notification bell badge + appends to the Activity Log feed live.

---

## 5. Database Schema (Prisma)

```prisma
enum Role {
  ADMIN
  ASSET_MANAGER
  DEPARTMENT_HEAD
  EMPLOYEE
}

enum EmployeeStatus {
  ACTIVE
  INACTIVE
}

enum AssetStatus {
  AVAILABLE
  ALLOCATED
  RESERVED
  UNDER_MAINTENANCE
  LOST
  RETIRED
  DISPOSED
}

enum BookingStatus {
  UPCOMING
  ONGOING
  COMPLETED
  CANCELLED
}

enum MaintenanceStatus {
  PENDING
  APPROVED
  REJECTED
  TECHNICIAN_ASSIGNED
  IN_PROGRESS
  RESOLVED
}

enum TransferStatus {
  REQUESTED
  APPROVED
  REJECTED
  COMPLETED
}

enum AuditVerification {
  PENDING
  VERIFIED
  MISSING
  DAMAGED
}

model Department {
  id             String       @id @default(cuid())
  name           String
  headId         String?      @unique
  head           Employee?    @relation("DepartmentHead", fields: [headId], references: [id])
  parentId       String?
  parent         Department?  @relation("DeptHierarchy", fields: [parentId], references: [id])
  children       Department[] @relation("DeptHierarchy")
  status         EmployeeStatus @default(ACTIVE)
  employees      Employee[]   @relation("EmployeeDepartment")
  createdAt      DateTime     @default(now())
}

model AssetCategory {
  id            String   @id @default(cuid())
  name          String   @unique
  extraFields   Json?    // e.g. { "warrantyPeriodMonths": true }
  assets        Asset[]
  createdAt     DateTime @default(now())
}

model Employee {
  id            String        @id @default(cuid())
  name          String
  email         String        @unique
  passwordHash  String
  role          Role          @default(EMPLOYEE)
  departmentId  String?
  department    Department?   @relation("EmployeeDepartment", fields: [departmentId], references: [id])
  status        EmployeeStatus @default(ACTIVE)
  avatarUrl     String?
  headOf        Department?   @relation("DepartmentHead")
  createdAt     DateTime      @default(now())
  allocations   Allocation[]
  bookings      Booking[]
  maintenanceRequests MaintenanceRequest[] @relation("Requester")
  auditAssignments AuditAssignment[]
  notifications Notification[]
  activityLogs  ActivityLog[]
}

model Asset {
  id               String       @id @default(cuid())
  assetTag         String       @unique   // AF-0001
  name             String
  categoryId       String
  category         AssetCategory @relation(fields: [categoryId], references: [id])
  serialNumber     String?      @unique
  qrCodeUrl        String?
  acquisitionDate  DateTime?
  acquisitionCost  Decimal?     // reporting only, no accounting link
  condition        String?
  location         String?
  isBookable       Boolean      @default(false)
  status           AssetStatus  @default(AVAILABLE)
  photoUrls        String[]
  documentUrls     String[]
  departmentId     String?
  department       Department?  @relation(fields: [departmentId], references: [id])
  createdAt        DateTime     @default(now())
  allocations      Allocation[]
  bookings         Booking[]
  maintenanceRequests MaintenanceRequest[]
  auditAssignments AuditAssignment[]
}

model Allocation {
  id                 String    @id @default(cuid())
  assetId             String
  asset               Asset     @relation(fields: [assetId], references: [id])
  employeeId          String?
  employee            Employee? @relation(fields: [employeeId], references: [id])
  departmentId        String?
  allocatedAt         DateTime  @default(now())
  expectedReturnDate  DateTime?
  returnedAt          DateTime?
  conditionOnReturn   String?
  isActive            Boolean   @default(true)
  transferRequests    TransferRequest[]
}

model TransferRequest {
  id             String          @id @default(cuid())
  allocationId   String
  allocation     Allocation      @relation(fields: [allocationId], references: [id])
  toEmployeeId   String?
  reason         String?
  status         TransferStatus  @default(REQUESTED)
  approvedById   String?
  createdAt      DateTime        @default(now())
  resolvedAt     DateTime?
}

model Booking {
  id           String        @id @default(cuid())
  assetId      String
  asset        Asset         @relation(fields: [assetId], references: [id])
  bookedById   String
  bookedBy     Employee      @relation(fields: [bookedById], references: [id])
  startTime    DateTime
  endTime      DateTime
  status       BookingStatus @default(UPCOMING)
  createdAt    DateTime      @default(now())
  // DB-level exclusion constraint (or app-level transaction check) prevents overlapping
  // bookings for the same assetId where status != CANCELLED
}

model MaintenanceRequest {
  id             String            @id @default(cuid())
  assetId        String
  asset          Asset             @relation(fields: [assetId], references: [id])
  requestedById  String
  requestedBy    Employee          @relation("Requester", fields: [requestedById], references: [id])
  issue          String
  priority       String            // Low / Medium / High / Critical
  photoUrl       String?
  status         MaintenanceStatus @default(PENDING)
  technicianName String?
  approvedById   String?
  createdAt      DateTime          @default(now())
  resolvedAt     DateTime?
}

model AuditCycle {
  id         String   @id @default(cuid())
  name       String
  scopeType  String   // department | location
  scopeValue String
  startDate  DateTime
  endDate    DateTime
  isClosed   Boolean  @default(false)
  createdAt  DateTime @default(now())
  assignments AuditAssignment[]
}

model AuditAssignment {
  id             String            @id @default(cuid())
  auditCycleId   String
  auditCycle     AuditCycle        @relation(fields: [auditCycleId], references: [id])
  assetId        String
  asset          Asset             @relation(fields: [assetId], references: [id])
  auditorId      String
  auditor        Employee          @relation(fields: [auditorId], references: [id])
  verification   AuditVerification @default(PENDING)
  notes          String?
  verifiedAt     DateTime?
}

model Notification {
  id          String   @id @default(cuid())
  employeeId  String
  employee    Employee @relation(fields: [employeeId], references: [id])
  type        String   // asset_assigned | maintenance_approved | booking_confirmed | ...
  message     String
  isRead      Boolean  @default(false)
  createdAt   DateTime @default(now())
}

model ActivityLog {
  id          String   @id @default(cuid())
  employeeId  String
  employee    Employee @relation(fields: [employeeId], references: [id])
  action      String
  entityType  String
  entityId    String
  metadata    Json?
  createdAt   DateTime @default(now())
}
```

---

## 6. API Surface (REST, prefix `/api/v1`)

**Auth**
- `POST /auth/signup` — creates Employee only, no role field accepted
- `POST /auth/login` — returns access + refresh JWT
- `POST /auth/refresh`
- `POST /auth/forgot-password`, `POST /auth/reset-password`
- `GET /auth/me`

**Organization Setup (Admin only)**
- `GET/POST/PATCH /departments`, `PATCH /departments/:id/deactivate`
- `GET/POST/PATCH /categories`
- `GET /employees`, `PATCH /employees/:id/role` (promote to Department Head / Asset Manager — Admin only, logged in Activity Log)

**Assets**
- `GET /assets` (filters: tag, serial, category, status, department, location; full-text/QR search)
- `POST /assets` (auto-generates next `AF-000N` tag + QR code on create)
- `GET /assets/:id`, `PATCH /assets/:id`
- `GET /assets/:id/history` (allocation + maintenance history combined timeline)

**Allocation & Transfer**
- `POST /allocations` — server-side transaction checks `asset.status === AVAILABLE`; if not, returns `409` with current holder info so the UI can offer "Transfer Request" instead of a raw error
- `POST /allocations/:id/return`
- `POST /transfer-requests`, `PATCH /transfer-requests/:id/approve|reject`

**Resource Booking**
- `GET /bookings?assetId=&date=`
- `POST /bookings` — server validates no overlap (`startTime < existing.endTime AND endTime > existing.startTime`) inside a DB transaction/row lock before insert; returns `409` with the conflicting booking on failure
- `PATCH /bookings/:id/cancel`, `PATCH /bookings/:id/reschedule`

**Maintenance**
- `GET /maintenance-requests` (kanban-friendly, grouped by status)
- `POST /maintenance-requests`
- `PATCH /maintenance-requests/:id/approve|reject` → on approve, asset status auto-transitions to `UNDER_MAINTENANCE`
- `PATCH /maintenance-requests/:id/assign-technician`
- `PATCH /maintenance-requests/:id/resolve` → asset status auto-transitions back to `AVAILABLE`

**Audit**
- `POST /audit-cycles`, `POST /audit-cycles/:id/assign-auditors`
- `PATCH /audit-assignments/:id/verify` (Verified/Missing/Damaged)
- `POST /audit-cycles/:id/close` — locks cycle, bulk-updates confirmed-missing assets to `LOST`, auto-compiles discrepancy report

**Reports**
- `GET /reports/utilization`, `/reports/maintenance-frequency`, `/reports/upcoming-maintenance-or-retirement`, `/reports/department-allocation`, `/reports/booking-heatmap`
- `GET /reports/export` (CSV/PDF)

**Notifications & Logs**
- `GET /notifications`, `PATCH /notifications/:id/read`
- `GET /activity-logs` (filterable by entity, employee, date range)
- Socket.io namespace `/realtime`, rooms per `employeeId`, `departmentId`, and `role`

All mutation endpoints must write an `ActivityLog` row and, where relevant, emit a Socket.io event + create `Notification` rows for affected users.

---

## 7. Screen-by-Screen Frontend Spec

### Screen 1 — Login / Signup
- Centered auth card, app logo animates in (SVG stroke-draw) above the form.
- Fields: Email, Password (Zod: valid email, min 8 char password), "Forgot password" link.
- Signup panel explicitly states: *"Sign up creates an Employee account — admin roles are assigned later."* No role dropdown anywhere on this screen.
- Loading state: submit button becomes a spinner-in-button (Framer Motion), form disables.
- On success: toast "Welcome back" → animated route transition into Dashboard.

### Screen 2 — Dashboard
- KPI card row (6 cards): Assets Available, Assets Allocated, Maintenance Today, Active Bookings, Pending Transfers, Upcoming Returns — animated count-up numbers, skeleton while loading, stagger-reveal on mount.
- "Overdue returns" banner in alert-red, visually separated from the "Upcoming returns" KPI.
- Quick actions row: Register Asset, Book Resource, Raise Maintenance Request (each opens a slide-over Sheet, not a full navigation).
- Recent Activity feed — live-updating via Socket.io, new items slide/fade in at the top.

### Screen 3 — Organization Setup (Admin only, 3 tabs)
- Tab A **Departments**: table with inline edit, Assign Head (searchable employee combobox), Parent Department (tree-aware select preventing circular parenting), Active/Inactive toggle with confirm dialog on deactivate.
- Tab B **Asset Categories**: table + "Add category" modal supporting dynamic optional fields (key-value builder UI, e.g. add a "Warranty Period" field for Electronics) stored in `extraFields` JSON.
- Tab C **Employee Directory**: table with Name, Email, Department, Role badge, Status. "Promote" action opens a dialog to set role to Department Head or Asset Manager — this is the only role-assignment surface in the whole app, clearly labeled as such, and logged to Activity Log.

### Screen 4 — Asset Registration & Directory
- Search bar supporting tag/serial/QR/category/status/department/location, debounced (TanStack Query + Zod-validated filters synced to URL query params).
- "+ Register Asset" opens a multi-step Sheet: Basic Info → Category-specific fields (dynamically rendered from `extraFields`) → Photos/Documents (drag-drop to Cloudinary via Multer, with upload progress + skeleton thumbnails) → auto-generated Asset Tag + QR preview.
- Table rows show a status-colored badge (§2.3), click-through to Asset Detail with tabs: Overview, Allocation History, Maintenance History (unified vertical timeline component with icons per event type).

### Screen 5 — Asset Allocation & Transfer (conflict handling is the centerpiece)
- Select an asset → if `AVAILABLE`, show a clean allocation form (employee/department picker, optional Expected Return Date).
- If already allocated: render a prominent red conflict banner — *"Already allocated to Priya Shah (Engineering)"* — allocation form disabled, and a **Transfer Request** panel appears instead (From: current holder [readonly], To: employee picker, Reason textarea, Submit).
- Transfer status stepper: Requested → Approved → Re-allocated, animated as a horizontal progress tracker.
- Allocation history list below, most recent first.
- Return flow: "Mark Returned" opens a dialog for condition check-in notes; on submit, asset status animates from Allocated badge → Available badge in place.

### Screen 6 — Resource Booking
- FullCalendar timeGrid view scoped to the selected resource; existing bookings render as solid blocks, a new booking attempt renders as a dashed "pending" block while validating.
- On overlap, show the conflicting block highlighted in red with a tooltip explaining the exact conflict window, and reject via toast — do not let the request submit.
- Booking status badges (Upcoming/Ongoing/Completed/Cancelled) auto-update via a light polling/Socket.io tick as time passes.
- Cancel/reschedule via context menu on the block; reminder notification scheduled server-side (Nodemailer + in-app) before slot start.

### Screen 7 — Maintenance Management (Kanban)
- 5 columns: Pending → Approved → Technician Assigned → In Progress → Resolved (Rejected shown as a collapsible side column or filter toggle).
- Cards show asset thumbnail, tag, issue summary, priority color chip, requester avatar.
- Drag-and-drop only allowed along valid transitions for the current user's role (Asset Manager can approve/reject from Pending; anyone assigned can move Technician Assigned → In Progress → Resolved). Invalid drags snap back with a shake animation + tooltip explaining why.
- Approving a card auto-flips the linked asset to Under Maintenance (toast + live badge update elsewhere in the app); resolving flips it back to Available.

### Screen 8 — Asset Audit
- "Create Audit Cycle" wizard: scope (department/location), date range, assign one or more auditors (multi-select combobox).
- Checklist view per cycle: each asset row has a 3-way segmented control (Verified / Missing / Damaged) plus notes field, auto-saves per row (optimistic update).
- Flagged-count banner updates live as auditors verify.
- "Close Audit Cycle" (AlertDialog confirm) locks the cycle, bulk-transitions confirmed-missing assets to `Lost`, and generates a Discrepancy Report (downloadable + linked from Reports screen).
- Audit history list per cycle retained and browsable.

### Screen 9 — Reports & Analytics
- Recharts: bar chart (utilization by department), line chart (maintenance frequency over time), plus a booking heatmap (custom Recharts/`react-calendar-heatmap`-style grid) showing peak usage windows.
- "Most used / Idle assets" ranked lists side by side.
- "Assets due for maintenance / nearing retirement" list with urgency color coding.
- Department-wise allocation summary table.
- Export button → CSV/PDF generation, with a toast on completion and a download link.
- Charts show skeleton shimmer placeholders matching final chart shape while loading.

### Screen 10 — Activity Logs & Notifications
- Filter tabs: All / Alerts / Approvals / Bookings (also Maintenance/Audit as needed).
- Each row: icon by type, message, relative timestamp ("2m ago", live-updating), unread rows highlighted with a subtle left accent bar.
- Real-time: new notifications slide in at the top with a brief highlight-flash animation as Socket.io events arrive; bell badge count syncs everywhere instantly.
- Full Activity Log (admin-visible) is a separate, denser table view: who did what, when, filterable by employee/entity/date range, exportable.

---

## 8. Non-negotiable Business Rules (build these as backend guarantees, not just UI checks)

1. An asset can never be allocated to two holders simultaneously — enforce with a DB transaction that checks-and-sets `status`/active allocation atomically, not just a client-side check.
2. A shared resource can never have two overlapping, non-cancelled bookings — enforce with a transaction-scoped overlap query (or Postgres exclusion constraint using `tsrange` + `btree_gist`) before insert.
3. Maintenance work can only begin after approval — asset status flips to `UNDER_MAINTENANCE` only on the approve transition, never earlier.
4. Roles are only ever changed through the Admin's Employee Directory promote action — no endpoint should accept a client-supplied role at signup.
5. Every state transition (allocation, transfer, maintenance, audit-close) must write an `ActivityLog` entry and, where relevant, a `Notification` row + Socket.io emit.
6. Overdue detection (returns, bookings, maintenance) runs as a scheduled job (e.g. `node-cron`) comparing `expectedReturnDate`/`endTime` against now, feeding both the Dashboard KPIs and Notifications.

---

## 9. Folder Structure (suggested)

```
assetflow/
├── apps/
│   ├── client/                  # React + Vite + TS
│   │   ├── src/
│   │   │   ├── components/ui/   # shadcn primitives
│   │   │   ├── components/shared/
│   │   │   ├── features/        # assets, allocation, booking, maintenance, audit, reports, notifications, auth, org-setup
│   │   │   ├── hooks/
│   │   │   ├── lib/             # axios instance, socket client, query client
│   │   │   ├── routes/
│   │   │   ├── theme/           # tokens, ThemeProvider, toggle
│   │   │   └── App.tsx
│   │   └── index.html
│   └── server/                  # Node + Express + Prisma
│       ├── src/
│       │   ├── routes/
│       │   ├── controllers/
│       │   ├── services/
│       │   ├── middleware/      # auth, role-guard, error-handler
│       │   ├── jobs/            # overdue-check cron
│       │   ├── sockets/
│       │   └── prisma/schema.prisma
│       └── server.ts
└── README.md
```

---

## 10. Build Instructions to the AI / Dev Team

1. Scaffold both apps per the folder structure above, wire Tailwind + Shadcn + the theme tokens in §2.3 first, and implement the light/dark toggle before building any screen — every subsequent component must be built against those tokens, never hardcoded colors.
2. Build the Prisma schema (§5) and run initial migrations before frontend work starts on data-bound screens.
3. Implement Auth (Screen 1) end-to-end first, including the JWT + role-guard middleware, since every other screen is role-gated.
4. Build Organization Setup (Screen 3) next — every other module depends on Departments, Categories, and the Employee Directory existing.
5. Build Assets (Screen 4), then Allocation & Transfer (Screen 5), then Resource Booking (Screen 6) — implement the double-allocation and overlap-booking guarantees as backend transactions first, then wire the UI conflict states around them.
6. Build Maintenance (Screen 7) and Audit (Screen 8), wiring the automatic asset-status transitions described in §8.
7. Build Reports (Screen 9) and Notifications/Activity Log (Screen 10) last, once enough real data-producing flows exist to visualize.
8. Layer in Framer Motion (§3.2), skeleton loading, toasts, and tooltips across every screen as a final polish pass — but the animation/interaction spec in §3 should be treated as required acceptance criteria, not nice-to-haves.
9. Generate the AssetFlow logo (§2.2) as clean SVG early so it can be used in the login screen entry animation, favicon, and navbar from day one.
