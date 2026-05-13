# Business Workflows & Role Permissions

## Roles

The system uses a 3-role model with evaluator status derived from the organizational chart.

| Role | Internal Value | Description |
|------|---------------|-------------|
| **Employee** | `employee` | Standard employee — sets up KPI, self-evaluates, views own records |
| **HR Admin** | `admin` | HR staff — edits user profiles, approves evaluations, manages settings |
| **System Admin** | `superadmin` | IT admin — creates user accounts, manages system settings |

### Evaluator Status

Evaluator is **not a separate role** — it is automatically derived from the organizational chart:

```typescript
// Anyone with direct reports is an evaluator
const hasDirectReports = users.some(u => u.managerId === currentUser.id);
```

This means:
- An employee with direct reports becomes an evaluator for their team
- HR Admin and System Admin can also review evaluations
- A "top-level evaluator" (e.g., CEO) has direct reports but no manager themselves

---

## Navigation by Role

### System Admin (`superadmin`)

| Nav Item | Route | Description |
|----------|-------|-------------|
| Dashboard | `/` | Stats overview |
| Team | `/team` | View all employees and evaluations |
| User Management | `/users` | Create/delete users (name, role, credentials) |
| Settings | `/settings` | Departments, job titles, objective categories |

### HR Admin (`admin`)

| Nav Item | Route | Description |
|----------|-------|-------------|
| Dashboard | `/` | Stats overview |
| Setup KPI | `/setup-kpi` | View/review all KPI plans |
| Performance Reviews | `/performance-reviews` | View/score all evaluations |
| Quarterly Reviews | `/quarterly-reviews` | View/score all quarterly reviews |
| Team | `/team` | View all employees and evaluations |
| User Management | `/users` | Edit user profiles (dept, title, evaluator, contact) |
| Settings | `/settings` | Departments, job titles, objective categories |

### Employee (with direct reports — Evaluator)

| Nav Item | Route | Description |
|----------|-------|-------------|
| Dashboard | `/` | Stats + pending evaluations from team |
| Setup KPI | `/setup-kpi` | Create/edit own KPI plans, review subordinates' plans |
| Performance Reviews | `/performance-reviews` | Score team members' evaluations |
| Quarterly Reviews | `/quarterly-reviews` | Score team members' quarterly reviews |
| Team | `/team` | View direct reports |

### Employee (without direct reports)

| Nav Item | Route | Description |
|----------|-------|-------------|
| Dashboard | `/` | Personal stats + evaluations |
| Setup KPI | `/setup-kpi` | Create/edit own KPI plans |
| Performance Reviews | `/performance-reviews` | View own evaluations |
| Quarterly Reviews | `/quarterly-reviews` | View own quarterly reviews |

> **Note:** "Setup KPI" only appears if the employee has a manager (`hasManager === true`). Top-level employees without a manager do not need to set up their own KPI through the standard flow.

---

## Workflow 1: KPI Plan Setup

This is the first workflow an employee completes before any evaluation can happen.

```
┌─────────┐    ┌──────────────┐    ┌────────────────┐    ┌─────────────┐
│  Draft  │───►│   Submitted  │───►│ Manager        │───►│ HR Approved │
│         │    │              │    │ Approved       │    │             │
└─────────┘    └──────────────┘    └────────────────┘    └─────────────┘
     ▲               │                     │
     │               │                     ▼
     │               │              ┌────────────────┐
     │               │              │ Manager        │
     │               │              │ Rejected       │
     │               │              └────────────────┘
     │               │                     │
     │               │                     ▼
     │               │              ┌────────────────┐
     └───────────────┴──────────────│ HR Rejected    │
                                    └────────────────┘
```

### Step-by-Step

#### 1. Employee Creates KPI Plan (Draft)

- Employee fills in: year, period (H1/H2), objectives (2–10), adjusting criteria
- Each objective has: description, strategy, support needed, category, weight
- Weights must total 100%
- Employee can **Save Draft** or **Submit for Review**
- Plan status: `draft`

#### 2. Employee Submits for Review

- Validates: at least 2 objectives, all descriptions filled, weights sum to 100%
- Plan status changes: `draft` → `submitted`
- Evaluator can now review the plan

#### 3. Evaluator Reviews

- Evaluator sees submitted plans from their direct reports
- **Required action**: Fill in "Criteria of Rating" for each objective (5 score levels: 1–5)
- Can add feedback/comments
- **Approve**: Plan moves to HR review (`submitted` → `manager_approved`)
- **Reject**: Requires feedback. Plan returns to employee (`submitted` → `manager_rejected`)

#### 4. HR Reviews

- HR Admin reviews plans that have been evaluator-approved
- Can add feedback/comments
- **Approve**: Plan is fully approved (`manager_approved` → `hr_approved`)
- **Reject**: Requires feedback. Plan returns to employee (`manager_approved` → `hr_rejected`)

#### 5. Employee Revises (if rejected)

- Employee sees rejection feedback in a banner at the top
- Can edit objectives and resubmit
- Status cycles: `manager_rejected`/`hr_rejected` → `draft` (on edit) → `submitted` (on resubmit)

### Import Feature

Employees can import objectives from a previous period's approved plan:
- Must be same year, different period (e.g., import H1 → H2)
- Objectives are copied with new IDs and reset scores/criteria
- Adjusting criteria is also copied

### Quarterly KPI Plans

Quarterly plans reference an approved Performance KPI plan:
- Employee selects objectives from the parent plan
- Each objective gets `selfPercent` and `managerPercent` fields (0–25%)
- No adjusting criteria for quarterly plans

---

## Workflow 2: Performance Evaluation

After KPI plans are approved, evaluations can be created.

```
┌─────────┐    ┌──────────────┐    ┌────────────────┐    ┌─────────────┐
│  Draft  │───►│   Submitted  │───►│  Evaluator     │───►│ HR Approved │
│         │    │              │    │  Scored        │    │             │
└─────────┘    └──────────────┘    └────────────────┘    └─────────────┘
     ▲                                                   │
     │                                                   ▼
     │                                            ┌─────────────┐
     └────────────────────────────────────────────│ HR Rejected │
                                                  └─────────────┘
```

### Evaluation Structure (3 Parts)

| Part | Weight | Description |
|------|--------|-------------|
| **Part I** — Personal Objectives | 45% | Weighted average of objective scores |
| **Part II** — Core Values & Behaviors | 45% | Average of behavior sub-topic scores |
| **Part III** — Adjusting Factors | 10% | Single score (1–5) for context |

### Score Calculation

```typescript
// Part I: Weighted average of objective scores × 0.45
PartI = Σ(objective.score × objective.weight / 100) × 0.45

// Part II: Average of all behavior scores × 0.45
PartII = (Σ behaviorScore / count) × 0.45

// Part III: Adjusting factor score × 0.10
PartIII = adjustingFactor.score × 0.10

// Final Score = PartI + PartII + PartIII
FinalScore = PartI + PartII + PartIII
```

### Grading Scale

| Score Range | Grade |
|-------------|-------|
| 4.50 – 5.00 | Outstanding |
| 3.50 – 4.49 | Exceeds Expectations |
| 2.50 – 3.49 | Meets Expectations |
| 1.50 – 2.49 | Below Expectations |
| 1.00 – 1.49 | Poor Performance |

### Behavior Categories

#### Core Behaviors (all employees)

| Category | Sub-Topics |
|----------|-----------|
| **Customer Focus** | Customer Relationships |
| **Integrity** | Ethics, Compliance |
| **Professionalism** | Job Knowledge & Application, Problem Solving & Decision Making |
| **Innovation** | Quality of Work/Excellence, Innovation & Change Management |
| **Teamwork** | Respect & Harmony, Building & Working in a Team |

#### Leadership Behaviors (evaluators/managers only)

| Category | Sub-Topics |
|----------|-----------|
| **Leadership** | Strategy Translation & Execution, Leading People, Business & Results Oriented |

Leadership behaviors are automatically included when `isLeadership: true` (derived from `hasDirectReports`).

### Step-by-Step Flow

#### 1. Employee Creates Evaluation

- Selects an approved KPI plan as the basis
- Fills in self-scores for objectives (1–5), behaviors (1–5), and adjusting factor
- Can **Save Draft** or **Submit to Evaluator**
- Status: `draft`

#### 2. Employee Submits

- Status changes: `draft` → `submitted`
- Evaluator receives the evaluation in their pending actions

#### 3. Evaluator Scores

- Evaluator fills in their scores for all parts
- Status changes: `submitted` → `manager_scored`
- Audit log entry added

#### 4. HR Signs Off

- HR reviews the complete evaluation with both self and evaluator scores
- Can add HR notes
- **Approve**: `manager_scored` → `hr_approved`
- **Reject**: `manager_scored` → `hr_rejected` (returns to employee for revision)

#### 5. PDF Export

- Any approved evaluation can be exported as a PDF
- Includes: employee info, all three parts with scores, final grade, audit log, signature blocks

---

## Workflow 3: Quarterly Review

Similar to performance evaluation but focused on % achievement per objective.

```
Employee creates review → Selects objectives from Performance KPI → 
Fills in self % achievement → Submits to evaluator → 
Evaluator fills in % achievement → HR approves
```

### Key Differences from Performance Evaluation

| Aspect | Performance Evaluation | Quarterly Review |
|--------|----------------------|------------------|
| Score type | 1–5 scale | Percentage (0–25%) |
| Part II (Behaviors) | Included | Not included |
| Part III (Adjusting) | Included | Not included |
| Objective source | KPI plan objectives | Selected from Performance KPI |
| Average calculation | Weighted 3-part formula | Simple average of % achievements |

---

## User Management Permissions

### System Admin — Create Users

System Admin can create new user accounts with:
- Full Name
- Role (Employee / HR Admin / System Admin)
- Username
- Password

The manager/evaluator assignment, department, job title, and contact info are left for HR Admin to fill in.

### HR Admin — Edit User Profiles

HR Admin can edit existing user profiles:
- Full Name
- Department
- Job Title
- Evaluator (Manager) assignment
- Email
- Telephone

HR Admin cannot create users or change passwords.

### Evaluator Badge

The "Evaluator" badge in the user list is derived from the org chart:
```typescript
const isEvaluator = users.some(t => t.managerId === user.id);
```
Any user who has at least one direct report shows an "Evaluator" badge.

---

## Settings Management

Accessible to System Admin and HR Admin.

| Setting | Type | Description |
|---------|------|-------------|
| **Departments** | `string[]` | Available departments for user profiles |
| **Job Titles** | `Record<string, string[]>` | Job titles mapped to each department |
| **Objective Categories** | `string[]` | Categories for KPI objectives (e.g., Operation, Financial, People, Innovation, Customer) |

All settings are stored as JSON strings in the `Setting` table and parsed on the frontend.
