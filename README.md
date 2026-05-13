# MSIC KPI Evaluation System

A comprehensive web-based KPI (Key Performance Indicator) evaluation system designed for organizations to manage employee performance reviews, quarterly assessments, and goal tracking. Built with modern web technologies and a role-based access control system.

## Features

### Performance Evaluation Workflow
- **3-Part Evaluation Form**: Personal Objectives (45%), Core Values & Behaviors (45%), Adjusting Factors (10%)
- **KPI Plan Setup**: Employees set up performance and quarterly KPI plans with objectives, strategies, and support needs
- **Evaluator Review**: Evaluators add Criteria of Rating during plan review
- **Multi-step Workflow**: Draft → Submitted → Evaluator Scored → HR Approved/Rejected
- **PDF Export**: Generate professional PDF reports with score breakdowns and signature blocks
- **Quarterly Reviews**: Select objectives from Performance KPI plans for quarterly assessment

### Role-Based Access Control
| Role | Capabilities |
|------|-------------|
| **System Admin** | Create user accounts (name, role, login credentials), delete users, access all settings |
| **HR Admin** | Edit user profiles (department, job title, evaluator, contact info), approve/reject evaluations, access settings |
| **Employee** | Set up KPI plans, submit self-evaluations, view own evaluations |

### Evaluator System
- Evaluator status is automatically derived from the organizational chart — anyone with direct reports is an evaluator
- Evaluators review and score their team members' evaluations
- Evaluators add Criteria of Rating to KPI plans during review

### Settings Management
- **Department Options**: Configure available departments
- **Job Title Options**: Define job titles per department
- **Objective Categories**: Customize KPI objective categories (e.g., Operation, Financial, People)

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) with App Router
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4 + [shadcn/ui](https://ui.shadcn.com/) component library
- **Database**: PostgreSQL ([Supabase](https://supabase.com/)) via [Prisma ORM](https://www.prisma.io/)
- **Authentication**: Session-based with httpOnly cookies + bcrypt password hashing
- **PDF Generation**: jsPDF + jspdf-autotable
- **Icons**: Lucide React
- **Notifications**: Sonner (toast)

## Getting Started

### Prerequisites
- Node.js 18+ or [Bun](https://bun.sh/)
- PostgreSQL database (Supabase recommended)

### Installation

```bash
# Clone the repository
git clone https://github.com/Somchit-cmd/msic-kpi-system.git
cd msic-kpi-system

# Install dependencies
bun install

# Set up environment variables
cp .env.example .env
# Edit .env with your database connection strings

# Push database schema
bun run db:push

# Start development server
bun run dev
```

### Environment Variables

Create a `.env` file in the project root:

```env
# Supabase PostgreSQL (Pooler URL for connections)
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true

# Direct URL for schema migrations
DIRECT_URL=postgresql://postgres.[project-ref]:[password]@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres
```

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/route.ts          # Login & session management
│   │   ├── users/route.ts         # User CRUD
│   │   ├── users/[id]/route.ts    # Single user operations
│   │   ├── evaluations/           # Evaluation CRUD
│   │   ├── plans/                 # KPI plan CRUD
│   │   └── settings/              # System settings
│   ├── layout.tsx                 # Root layout
│   └── page.tsx                   # Single-page app router
├── components/
│   ├── ui/                        # shadcn/ui components
│   ├── AppSidebar.tsx             # Navigation sidebar
│   ├── ScoreButtons.tsx           # 1-5 score input
│   ├── StatusBadge.tsx            # Evaluation status badge
│   └── WorkflowProgress.tsx       # Workflow step indicator
├── context/
│   └── EvaluationContext.tsx      # Global state & business logic
├── types/
│   └── evaluation.ts              # TypeScript types & helpers
├── utils/
│   └── pdfExport.ts               # PDF generation
├── views/
│   ├── Dashboard.tsx              # Dashboard overview
│   ├── Login.tsx                  # Authentication
│   ├── SetupKpi.tsx               # KPI plan listing
│   ├── SetupKpiForm.tsx           # KPI plan form & review
│   ├── PerformanceReviews.tsx     # Performance review listing
│   ├── EvaluationView.tsx         # Performance evaluation detail
│   ├── NewEvaluation.tsx          # Create performance evaluation
│   ├── QuarterlyReviews.tsx       # Quarterly review listing
│   ├── QuarterlyReviewView.tsx    # Quarterly review detail
│   ├── NewQuarterlyReview.tsx     # Create quarterly review
│   ├── Team.tsx                   # Team overview
│   ├── UserManagement.tsx         # User CRUD management
│   └── Settings.tsx               # System settings
└── data/
    └── mockData.ts                # Seed data
```

## Database Schema

| Model | Description |
|-------|-------------|
| **User** | Employee profiles with role, department, evaluator relationship |
| **KpiPlan** | KPI setup plans (performance & quarterly) with objectives |
| **Evaluation** | Performance/quarterly evaluation records with scores |
| **Setting** | System configuration (departments, job titles, categories) |
| **ActivityLog** | Audit trail for entity changes |
| **WorkflowLog** | Status transition history |

## Deployment

### Netlify

The project includes `netlify.toml` configuration for deployment:

```bash
# Build for production
bun run build
```

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start development server on port 3000 |
| `bun run build` | Build for production |
| `bun run lint` | Run ESLint |
| `bun run db:push` | Push Prisma schema to database |
| `bun run db:generate` | Generate Prisma client |

## License

This project is proprietary and confidential.
