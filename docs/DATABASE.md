# Database Schema

**Database:** PostgreSQL (Supabase)  
**ORM:** Prisma 6.11.1  
**Connection:** Supabase connection pooler (port 6543) for runtime, direct connection (port 5432) for migrations

---

## Entity-Relationship Diagram

```
┌──────────────────┐
│       User       │
│──────────────────│
│ id        PK     │◄──────────────────────────────────┐
│ name             │                                   │
│ title            │         managerId (FK → User.id)  │
│ department       │───────────────────────────────────┘
│ role             │
│ managerId  FK ───┼──► User.id (self-referencing)
│ username  UNIQUE │
│ password         │
│ email            │
│ telephone        │
│ createdAt        │
│ updatedAt        │
└──────────────────┘
        │
        │ employeeId / managerId
        ▼
┌──────────────────┐         ┌──────────────────┐
│     KpiPlan      │         │    Evaluation    │
│──────────────────│         │──────────────────│
│ id        PK     │         │ id        PK     │
│ planType         │         │ employeeId  FK ──┼──► User.id
│ parentPlanId FK ─┼──►self  │ employeeName     │
│ employeeId  FK ──┼──►User  │ employeeTitle    │
│ employeeName     │         │ department       │
│ employeeTitle    │         │ managerId   FK ──┼──► User.id
│ department       │         │ managerName      │
│ managerId   FK ──┼──►User  │ period           │
│ managerName      │         │ reviewType       │
│ year             │         │ planId      FK ──┼──► KpiPlan.id
│ period           │         │ status           │
│ isLeadership     │         │ objectives (JSON)│
│ setupStatus      │         │ behaviors  (JSON)│
│ objectives (JSON)│         │ adjustingFactor  │
│ behaviors  (JSON)│         │   (JSON)         │
│ adjustingCriteria│         │ hrNotes          │
│ managerFeedback  │         │ isLeadership     │
│ hrFeedback       │         │ auditLog   (JSON)│
│ createdAt        │         │ createdAt        │
│ createdBy        │         │ updatedAt        │
│ updatedAt        │         └──────────────────┘
└──────────────────┘

┌──────────────────┐         ┌──────────────────┐
│     Setting      │         │   ActivityLog    │
│──────────────────│         │──────────────────│
│ id        PK     │         │ id        PK     │
│ key     UNIQUE   │         │ entityType       │
│ value    (JSON)  │         │ entityId         │
└──────────────────┘         │ action           │
                             │ performedBy      │
┌──────────────────┐         │ performedByName  │
│   WorkflowLog    │         │ role             │
│──────────────────│         │ details          │
│ id        PK     │         │ createdAt        │
│ entityType       │         └──────────────────┘
│ entityId         │
│ entityName       │
│ fromStatus       │
│ toStatus         │
│ performedBy      │
│ performedByName  │
│ role             │
│ feedback         │
│ details          │
│ transitionedAt   │
└──────────────────┘
```

---

## Tables

### User

Stores all user accounts and their organizational information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PK | UUID |
| `name` | String | NOT NULL | Full name |
| `title` | String | NOT NULL | Job title |
| `department` | String | NOT NULL | Department name |
| `role` | String | NOT NULL | `'employee'` \| `'admin'` \| `'superadmin'` |
| `managerId` | String? | FK → User.id | Direct evaluator/manager |
| `username` | String | UNIQUE, NOT NULL | Login username (case-insensitive) |
| `password` | String | NOT NULL | bcrypt hashed password |
| `email` | String | NOT NULL | Email address |
| `telephone` | String | DEFAULT '' | Phone number |
| `createdAt` | DateTime | DEFAULT now() | Account creation timestamp |
| `updatedAt` | DateTime | @updatedAt | Last update timestamp |

**Self-referencing relationship:** `managerId` → `User.id` creates the organizational chart (ManagerTeam relation).

**Evaluator derivation:** A user is an evaluator if `User.id` appears in any other user's `managerId` field:
```sql
SELECT * FROM "User" u WHERE EXISTS (
  SELECT 1 FROM "User" sub WHERE sub."managerId" = u.id
);
```

---

### KpiPlan

Stores KPI setup plans (both performance and quarterly types).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PK | UUID |
| `planType` | String | NOT NULL | `'performance'` \| `'quarterly'` |
| `parentPlanId` | String? | — | For quarterly plans: references the source Performance KPI plan |
| `employeeId` | String | NOT NULL | Plan owner |
| `employeeName` | String | NOT NULL | Denormalized for display |
| `employeeTitle` | String | NOT NULL | Denormalized for display |
| `department` | String | NOT NULL | Employee's department |
| `managerId` | String | NOT NULL | Evaluator's user ID |
| `managerName` | String | NOT NULL | Denormalized for display |
| `year` | String | NOT NULL | Evaluation year (e.g., "2026") |
| `period` | String? | — | `'H1'` \| `'H2'` (performance) or null (quarterly) |
| `isLeadership` | Boolean | DEFAULT false | Whether leadership behaviors are included |
| `setupStatus` | String | DEFAULT 'draft' | Plan approval status (see SetupStatus enum) |
| `objectives` | String | DEFAULT '[]' | JSON array of Objective objects |
| `behaviors` | String | DEFAULT '[]' | JSON array of BehaviorScore objects |
| `adjustingCriteria` | String? | — | Part III description text |
| `managerFeedback` | String? | — | Evaluator feedback during review |
| `hrFeedback` | String? | — | HR feedback during review |
| `createdAt` | String | NOT NULL | Date string (YYYY-MM-DD) |
| `createdBy` | String | NOT NULL | User ID of the creator |
| `updatedAt` | DateTime | @updatedAt | Last update timestamp |

#### SetupStatus Values

| Value | Label | Description |
|-------|-------|-------------|
| `draft` | Draft | Employee is still editing |
| `submitted` | Pending Evaluator Review | Submitted for evaluator review |
| `manager_rejected` | Evaluator Rejected | Evaluator rejected with feedback |
| `manager_approved` | Pending HR Review | Evaluator approved, awaiting HR |
| `hr_rejected` | HR Rejected | HR rejected with feedback |
| `hr_approved` | Approved | Fully approved, ready for evaluation |

#### Objective JSON Structure

```json
{
  "id": "uuid",
  "description": "Objective text",
  "strategy": "How to achieve it",
  "supportNeeded": "Resources required",
  "scoreCriteria": [
    { "score": 1, "description": "Poor performance criteria" },
    { "score": 2, "description": "Below average criteria" },
    { "score": 3, "description": "Meets expectations criteria" },
    { "score": 4, "description": "Exceeds expectations criteria" },
    { "score": 5, "description": "Outstanding criteria" }
  ],
  "category": "operation",
  "weight": 50,
  "selfScore": 0,
  "managerScore": 0,
  "selfPercent": 0,
  "managerPercent": 0
}
```

- `selfPercent` / `managerPercent` are used only for quarterly reviews (0–25% per objective)
- `scoreCriteria` is filled in by the evaluator during plan review

---

### Evaluation

Stores performance and quarterly evaluation records with scores.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PK | UUID |
| `employeeId` | String | NOT NULL | Evaluated employee |
| `employeeName` | String | NOT NULL | Denormalized for display |
| `employeeTitle` | String | NOT NULL | Denormalized for display |
| `department` | String | NOT NULL | Employee's department |
| `managerId` | String | NOT NULL | Evaluator's user ID |
| `managerName` | String | NOT NULL | Denormalized for display |
| `period` | String | NOT NULL | Evaluation period label |
| `reviewType` | String | NOT NULL | `'performance'` \| `'quarterly'` |
| `planId` | String? | — | Source KPI plan ID |
| `status` | String | DEFAULT 'draft' | Evaluation workflow status |
| `objectives` | String | DEFAULT '[]' | JSON array of Objective objects (with scores) |
| `behaviors` | String | DEFAULT '[]' | JSON array of BehaviorScore objects |
| `adjustingFactor` | String | DEFAULT '{"selfScore":0,"managerScore":0,"notes":""}' | JSON AdjustingFactor object |
| `hrNotes` | String | DEFAULT '' | HR notes/comments |
| `isLeadership` | Boolean | DEFAULT false | Whether leadership behaviors apply |
| `auditLog` | String | DEFAULT '[]' | JSON array of AuditLogEntry objects |
| `createdAt` | String | NOT NULL | Date string |
| `updatedAt` | String | NOT NULL | Date string |

#### EvalStatus Values

| Value | Label | Description |
|-------|-------|-------------|
| `draft` | Draft | Employee is self-scoring |
| `submitted` | Submitted | Submitted to evaluator |
| `manager_scored` | Evaluator Scored | Evaluator has scored |
| `hr_approved` | HR Approved | HR has signed off |
| `hr_rejected` | HR Rejected | HR rejected (sent back) |

#### AdjustingFactor JSON Structure

```json
{
  "selfScore": 3,
  "managerScore": 4,
  "notes": "Employee showed exceptional initiative this period"
}
```

#### AuditLogEntry JSON Structure

```json
{
  "timestamp": "2026-01-15T10:00:00.000Z",
  "action": "Submitted to Evaluator",
  "fromStatus": "draft",
  "toStatus": "submitted",
  "actorId": "uuid",
  "actorName": "John Doe",
  "actorRole": "employee",
  "notes": "Optional note"
}
```

---

### Setting

Stores system configuration as key-value pairs.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PK | Format: `setting-{key}` |
| `key` | String | UNIQUE | Setting identifier |
| `value` | String | DEFAULT '[]' | JSON string (array or object) |

#### Standard Settings

| Key | Value Type | Description |
|-----|-----------|-------------|
| `departments` | `string[]` | Available departments |
| `jobTitles` | `Record<string, string[]>` | Job titles per department |
| `objectiveCategories` | `string[]` | KPI objective categories |

---

### ActivityLog

Audit trail for entity changes.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PK | UUID |
| `entityType` | String | NOT NULL | `'evaluation'` \| `'plan'` \| `'user'` |
| `entityId` | String? | — | ID of the affected entity |
| `action` | String | NOT NULL | `'create'` \| `'update'` \| `'delete'` \| `'submit'` \| `'approve'` \| `'reject'` |
| `performedBy` | String | NOT NULL | User ID of the actor |
| `performedByName` | String | NOT NULL | Name of the actor |
| `role` | String | NOT NULL | Role of the actor at the time |
| `details` | String? | — | Additional details |
| `createdAt` | DateTime | DEFAULT now() | Log timestamp |

---

### WorkflowLog

Records status transitions for evaluations and plans.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PK | UUID |
| `entityType` | String | NOT NULL | Entity type |
| `entityId` | String | NOT NULL | Entity ID |
| `entityName` | String | NOT NULL | Entity display name |
| `fromStatus` | String | NOT NULL | Previous status |
| `toStatus` | String | NOT NULL | New status |
| `performedBy` | String | NOT NULL | User ID |
| `performedByName` | String | NOT NULL | User name |
| `role` | String | NOT NULL | User role |
| `feedback` | String? | — | Feedback text (for rejections) |
| `details` | String? | — | Additional context |
| `transitionedAt` | DateTime | DEFAULT now() | Transition timestamp |

---

## Denormalization Strategy

Several fields are denormalized (stored redundantly) for performance and display convenience:

| Field | Stored In | Source | Reason |
|-------|-----------|--------|--------|
| `employeeName` | KpiPlan, Evaluation | User.name | Avoids joins for display |
| `employeeTitle` | KpiPlan, Evaluation | User.title | Avoids joins for display |
| `managerName` | KpiPlan, Evaluation | User.name (via managerId) | Avoids joins for display |
| `department` | KpiPlan, Evaluation | User.department | Avoids joins for display |

**Trade-off:** If a user's name or title changes, existing plans/evaluations keep the old values. This is intentional — evaluation records should reflect the information at the time they were created.

---

## Connection Configuration

The application uses two connection URLs:

| Variable | Port | Purpose |
|----------|------|---------|
| `DATABASE_URL` | 6543 (pgbouncer) | Runtime queries via connection pooler |
| `DIRECT_URL` | 5432 | Prisma migrations and schema pushes |

```env
DATABASE_URL=postgresql://postgres.[ref]:[pass]@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.[ref]:[pass]@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres
```

**Why two URLs?** Supabase's connection pooler (PgBouncer on port 6543) uses transaction-level pooling which is incompatible with Prisma migrations. The direct connection (port 5432) supports the full PostgreSQL protocol needed for DDL operations.
