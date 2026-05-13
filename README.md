# MSIC KPI Evaluation System

A web-based KPI (Key Performance Indicator) evaluation system for managing employee performance reviews, quarterly assessments, and goal tracking. Built with Next.js, Prisma, and Supabase.

## Quick Start

```bash
# Clone and install
git clone https://github.com/Somchit-cmd/msic-kpi-system.git
cd msic-kpi-system
bun install

# Configure environment
cp .env.example .env
# Edit .env with your Supabase credentials

# Set up database
bun run db:push

# Start development server
bun run dev
```

## Tech Stack

| Technology | Purpose |
|-----------|---------|
| **Next.js 16** (App Router) | Full-stack React framework |
| **TypeScript 5** | Type-safe development |
| **Tailwind CSS 4** + **shadcn/ui** | Styling & UI components |
| **Prisma ORM** | Database access (PostgreSQL/Supabase) |
| **bcrypt** | Password hashing |
| **jsPDF** | PDF report generation |

## Features

- **KPI Plan Setup** — Employees define objectives, strategies, and support needs; evaluators add rating criteria
- **Performance Evaluation** — 3-part scoring: Personal Objectives (45%), Core Values & Behaviors (45%), Adjusting Factors (10%)
- **Quarterly Reviews** — Track % achievement against approved KPI objectives
- **Role-Based Access** — 3 roles with evaluator status derived from the organizational chart
- **PDF Export** — Professional evaluation reports with score breakdowns and signature blocks
- **Settings Management** — Configurable departments, job titles, and objective categories

## Roles & Permissions

| Role | Capabilities |
|------|-------------|
| **System Admin** | Create user accounts (name/role/credentials), delete users, system settings |
| **HR Admin** | Edit user profiles (dept/title/evaluator/contact), approve evaluations, settings |
| **Employee** | Set up KPI plans, self-evaluate, view own records |

> **Evaluator** is not a separate role — anyone with direct reports automatically becomes an evaluator for their team.

## Workflow

```
Employee creates KPI Plan → Evaluator reviews & adds criteria → HR approves
                                                    ↓
Employee self-scores → Evaluator scores → HR signs off → PDF export
```

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/ARCHITECTURE.md) | System architecture, tech stack, project structure, design decisions |
| [API Reference](docs/API_REFERENCE.md) | Complete REST API endpoint documentation |
| [Workflows](docs/WORKFLOW.md) | Business processes, role permissions, evaluation flow |
| [Database](docs/DATABASE.md) | Schema, relationships, JSON structures, connection config |
| [Deployment](docs/DEPLOYMENT.md) | Setup, deployment, security, troubleshooting |

## Environment Variables

```env
# Supabase PostgreSQL (Pooler URL — for runtime queries)
DATABASE_URL=postgresql://postgres.[ref]:[pass]@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true

# Direct URL (for Prisma schema migrations)
DIRECT_URL=postgresql://postgres.[ref]:[pass]@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres
```

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start dev server on port 3000 |
| `bun run build` | Build for production |
| `bun run lint` | Run ESLint |
| `bun run db:push` | Push Prisma schema to database |
| `bun run db:generate` | Generate Prisma client |

## Project Structure

```
src/
├── app/api/          # REST API routes (auth, users, evaluations, plans, settings)
├── components/       # UI components (shadcn/ui + custom)
├── context/          # Global state (EvaluationContext)
├── types/            # TypeScript types and helpers
├── utils/            # PDF export utility
├── views/            # Page components (13 views)
└── data/             # Seed/mock data
```

## Deployment

The project is configured for [Netlify](https://netlify.com) deployment with `netlify.toml`. See [Deployment Guide](docs/DEPLOYMENT.md) for details.

## License

This project is proprietary and confidential.
