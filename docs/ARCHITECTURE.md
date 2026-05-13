# System Architecture

## Overview

The MSIC KPI Evaluation System is a single-page web application for managing employee Key Performance Indicator (KPI) evaluations, quarterly reviews, and performance tracking. It follows a client-side routing pattern with a REST API backend.

## Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Framework** | Next.js (App Router) | 16.x | Full-stack React framework |
| **Language** | TypeScript | 5.x | Type-safe development |
| **Styling** | Tailwind CSS | 4.x | Utility-first CSS |
| **UI Library** | shadcn/ui | — | Pre-built accessible components (New York style) |
| **Database** | PostgreSQL (Supabase) | — | Persistent data storage |
| **ORM** | Prisma | 6.11.1 | Database access layer |
| **Authentication** | Custom (httpOnly cookies + bcrypt) | — | Session management |
| **PDF Generation** | jsPDF + jspdf-autotable | — | Evaluation report export |
| **Icons** | Lucide React | — | UI icon set |
| **Notifications** | Sonner | — | Toast notifications |
| **Deployment** | Netlify | — | Production hosting |

## Architecture Pattern

```
┌──────────────────────────────────────────────────┐
│                   Browser                        │
│  ┌─────────────────────────────────────────────┐ │
│  │          React SPA (Single Page)            │ │
│  │  ┌─────────┐  ┌──────────────────────────┐  │ │
│  │  │ Sidebar  │  │   EvaluationContext      │  │ │
│  │  │ (Nav)    │  │   (Global State +        │  │ │
│  │  └─────────┘  │    Client-side Routing)   │  │ │
│  │               └──────────┬───────────────-┘  │ │
│  │                          │ fetch()            │ │
│  │  ┌───────────┐  ┌───────┴──────────┐        │ │
│  │  │  Views    │  │  API Routes       │        │ │
│  │  │  (Pages)  │  │  (Next.js Route   │        │ │
│  │  │           │  │   Handlers)       │        │ │
│  │  └───────────┘  └───────┬──────────┘        │ │
│  └─────────────────────────┼───────────────────-┘ │
│                            │                      │
│              ┌─────────────┴──────────────┐       │
│              │     Prisma ORM             │       │
│              │     (Query Builder)        │       │
│              └─────────────┬──────────────┘       │
│                            │                      │
│              ┌─────────────┴──────────────┐       │
│              │   Supabase PostgreSQL       │       │
│              │   (Connection Pooler)       │       │
│              └────────────────────────────┘       │
└──────────────────────────────────────────────────┘
```

## Routing Architecture

The application uses **client-side state-based routing** rather than Next.js file-system routing. All views are rendered within a single page (`src/app/page.tsx`) based on the `currentView` state in `EvaluationContext`.

### How Navigation Works

1. `EvaluationContext` maintains `currentView` (string) and `viewParams` (object)
2. `navigate(path, params?)` updates these states
3. `page.tsx` reads `currentView` and renders the corresponding view component
4. The URL does **not** change — all navigation is in-memory

### View Routes

| Route Path | Component | Description |
|-----------|-----------|-------------|
| `/` | `Dashboard` | Overview with stats and pending actions |
| `/login` | `Login` | Authentication form |
| `/setup-kpi` | `SetupKpi` | KPI plan listing with create/view actions |
| `/setup-kpi-form` | `SetupKpiForm` | Create/edit/review KPI plans |
| `/performance-reviews` | `PerformanceReviews` | Performance evaluation listing |
| `/evaluation` | `EvaluationView` | View/score performance evaluation |
| `/new-evaluation` | `NewEvaluation` | Create performance evaluation |
| `/quarterly-reviews` | `QuarterlyReviews` | Quarterly review listing |
| `/quarterly-review` | `QuarterlyReviewView` | View/score quarterly review |
| `/new-quarterly-review` | `NewQuarterlyReview` | Create quarterly review |
| `/team` | `Team` | Team overview (direct reports) |
| `/users` | `UserManagement` | User CRUD management |
| `/settings` | `Settings` | System configuration |

## Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── api/                      # REST API routes
│   │   ├── auth/route.ts         #   POST login, GET session, DELETE logout
│   │   ├── users/route.ts        #   GET list, POST create
│   │   ├── users/[id]/route.ts   #   GET, PUT, DELETE single user
│   │   ├── evaluations/route.ts  #   GET list, POST create
│   │   ├── evaluations/[id]/route.ts  # GET, PUT, DELETE
│   │   ├── plans/route.ts        #   GET list, POST create
│   │   ├── plans/[id]/route.ts   #   GET, PUT, DELETE
│   │   └── settings/route.ts     #   GET all, PUT update
│   ├── layout.tsx                # Root layout with providers
│   └── page.tsx                  # SPA router (renders views based on state)
│
├── components/                   # Reusable UI components
│   ├── ui/                       # shadcn/ui primitives (40+ components)
│   ├── AppSidebar.tsx            # Navigation sidebar (role-aware)
│   ├── ScoreButtons.tsx          # 1-5 score input widget
│   ├── StatusBadge.tsx           # Evaluation/plan status badge
│   └── WorkflowProgress.tsx      # Multi-step workflow indicator
│
├── context/
│   └── EvaluationContext.tsx     # Global state: auth, data, routing
│
├── types/
│   └── evaluation.ts             # All TypeScript types, constants, helpers
│
├── utils/
│   └── pdfExport.ts              # PDF generation for evaluations
│
├── views/                        # Page-level components (13 views)
│   ├── Dashboard.tsx             # Dashboard with stats and pending actions
│   ├── Login.tsx                 # Authentication form
│   ├── SetupKpi.tsx              # KPI plan listing with status filters
│   ├── SetupKpiForm.tsx          # KPI plan creation, editing, and review
│   ├── PerformanceReviews.tsx    # Performance evaluation listing
│   ├── EvaluationView.tsx        # Evaluation detail with scoring
│   ├── NewEvaluation.tsx         # Create new performance evaluation
│   ├── QuarterlyReviews.tsx      # Quarterly review listing
│   ├── QuarterlyReviewView.tsx   # Quarterly review detail with scoring
│   ├── NewQuarterlyReview.tsx    # Create new quarterly review
│   ├── Team.tsx                  # Team overview with evaluation summaries
│   ├── UserManagement.tsx        # User CRUD with split permissions
│   └── Settings.tsx              # System settings management
│
└── data/
    └── mockData.ts               # Seed data for development
```

## Key Design Decisions

### 1. State-Based Routing (No URL Routing)

The application uses `EvaluationContext` for client-side routing via `currentView` and `viewParams` state. Navigation calls `navigate(path, params)` which updates state, and `page.tsx` renders the appropriate view component.

**Rationale**: Simplifies the SPA architecture — all state is in one context, no URL sync issues, and the backend only serves one page.

### 2. Context-Based Global State

All application state (users, evaluations, plans, settings, auth, routing) is managed through a single React Context (`EvaluationContext`). Data is fetched from API routes on mount and cached in state.

**Trade-off**: Simple and cohesive, but not ideal for very large datasets. Current data volume (dozens of users, hundreds of evaluations) performs well.

### 3. JSON String Storage for Complex Fields

Objectives, behaviors, adjusting factors, and audit logs are stored as JSON strings in PostgreSQL (`String` type in Prisma). The API layer handles `JSON.parse()` on reads and `JSON.stringify()` on writes.

**Rationale**: Avoids complex relational joins for nested data that is always read/written as a complete unit. Simplifies schema and reduces query complexity.

### 4. Evaluator Status Derived from Org Chart

Instead of a stored `canEvaluate` flag, evaluator status is computed at runtime:
```typescript
const hasDirectReports = users.some(u => u.managerId === currentUser.id);
const canEvaluateOthers = hasDirectReports;
```

**Rationale**: Single source of truth (the `managerId` foreign key). No need to synchronize a separate `canEvaluate` field when organizational structure changes.

### 5. Split User Management Permissions

- **System Admin**: Creates users (name, role, username, password only)
- **HR Admin**: Edits user details (department, job title, evaluator, contact info)

**Rationale**: Separation of concerns — IT provisions accounts, HR manages organizational data.

### 6. Session-Based Authentication with httpOnly Cookies

Sessions use `kpi_session` httpOnly cookie containing the user ID. No JWTs — the server validates the cookie against the database on each authenticated request.

**Rationale**: Simpler than JWT, immune to XSS token theft (httpOnly), and state can be revoked server-side by clearing the cookie.

## Data Flow

```
User Action (click)
       │
       ▼
View Component
       │
       ▼
EvaluationContext (state + API calls)
       │
       ├─► fetch('/api/users')        ──► Prisma ──► PostgreSQL
       ├─► fetch('/api/evaluations')   ──► Prisma ──► PostgreSQL
       ├─► fetch('/api/plans')         ──► Prisma ──► PostgreSQL
       ├─► fetch('/api/settings')      ──► Prisma ──► PostgreSQL
       └─► fetch('/api/auth')          ──► Prisma ──► PostgreSQL
       │
       ▼
State Update → Re-render
```

## Component Hierarchy

```
RootLayout
└── EvaluationProvider
    └── SidebarProvider
        ├── AppSidebar
        └── Main Content
            └── (view based on currentView state)
                ├── Dashboard
                ├── Login
                ├── SetupKpi → SetupKpiForm
                ├── PerformanceReviews → EvaluationView / NewEvaluation
                ├── QuarterlyReviews → QuarterlyReviewView / NewQuarterlyReview
                ├── Team
                ├── UserManagement
                └── Settings
```
