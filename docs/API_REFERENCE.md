# API Reference

Base URL: `/api` (relative — same origin as the Next.js app)

All request and response bodies use JSON. Authentication is via the `kpi_session` httpOnly cookie.

---

## Authentication

### `POST /api/auth` — Login

Authenticates a user and sets a session cookie.

**Request Body:**
```json
{
  "username": "string (case-insensitive)",
  "password": "string",
  "rememberMe": false
}
```

**Response (200):** User object (password excluded)
```json
{
  "id": "uuid",
  "name": "John Doe",
  "title": "IT Specialist",
  "department": "IT",
  "role": "employee",
  "managerId": "uuid",
  "username": "johndoe",
  "email": "john@example.com",
  "telephone": "",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

**Response (401):**
```json
{ "error": "Invalid username or password" }
```

**Cookie Set:** `kpi_session={userId}` — httpOnly, sameSite=lax, maxAge=86400s (24h) or 2592000s (30 days with rememberMe)

**Notes:**
- Username lookup is case-insensitive
- Passwords are hashed with bcrypt. Legacy plain-text passwords are auto-upgraded on first successful login

---

### `GET /api/auth` — Check Session

Restores session from the `kpi_session` cookie.

**Response (200):** User object (password excluded)

**Response (401):** `{ "error": "Not authenticated" }` — also clears the invalid cookie

---

### `DELETE /api/auth` — Logout

Clears the session cookie.

**Response (200):** `{ "success": true }`

---

## Users

### `GET /api/users` — List All Users

Returns all users ordered by creation date (oldest first). Passwords are excluded.

**Response (200):**
```json
[
  {
    "id": "uuid",
    "username": "johndoe",
    "name": "John Doe",
    "title": "IT Specialist",
    "department": "IT",
    "role": "employee",
    "managerId": "uuid",
    "email": "john@example.com",
    "telephone": "",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

---

### `POST /api/users` — Create User

Creates a new user. The password is hashed with bcrypt before storage.

**Request Body:**
```json
{
  "id": "uuid",
  "name": "Jane Smith",
  "title": "HR Director",
  "department": "HR",
  "role": "admin",
  "managerId": "uuid",
  "username": "janesmith",
  "password": "plaintext-password",
  "email": "jane@example.com",
  "telephone": "081-234-5678"
}
```

**Response (200):** Created user object (includes hashed password field)

**Notes:**
- `username` must be unique (Prisma constraint)
- `password` is automatically hashed with `bcrypt.hash(password, 10)`
- `id` should be a UUID — typically generated client-side with `crypto.randomUUID()`

---

### `GET /api/users/[id]` — Get User

Returns a single user by ID. Password is excluded.

**Response (200):** User object

**Response (404):** `{ "error": "Not found" }`

---

### `PUT /api/users/[id]` — Update User

Updates an existing user. If `password` is provided, it is hashed before storage. If `password` is omitted or empty, the existing password is preserved.

**Request Body (partial update):**
```json
{
  "department": "Finance",
  "title": "Senior Accountant",
  "managerId": "new-manager-uuid"
}
```

**Response (200):** Updated user object

**Notes:**
- Sending `password: ""` or omitting `password` will **not** overwrite the existing password
- Only fields included in the body will be updated

---

### `DELETE /api/users/[id]` — Delete User

Deletes a user by ID.

**Response (200):** `{ "success": true }`

**Warning:** Does not cascade-delete related evaluations or plans that reference this user.

---

## KPI Plans

### `GET /api/plans` — List All Plans

Returns all KPI plans ordered by creation date.

**Response (200):**
```json
[
  {
    "id": "uuid",
    "planType": "performance",
    "parentPlanId": null,
    "employeeId": "uuid",
    "employeeName": "John Doe",
    "employeeTitle": "IT Specialist",
    "department": "IT",
    "managerId": "uuid",
    "managerName": "Jane Smith",
    "year": "2026",
    "period": "H1",
    "isLeadership": false,
    "setupStatus": "draft",
    "objectives": [...],
    "behaviors": [...],
    "adjustingCriteria": "Description...",
    "managerFeedback": "Feedback text",
    "hrFeedback": null,
    "createdAt": "2026-01-15",
    "createdBy": "uuid",
    "updatedAt": "2026-01-15T10:30:00.000Z"
  }
]
```

**Notes:**
- `objectives` and `behaviors` are parsed from JSON strings stored in the database
- `setupStatus` values: `draft`, `submitted`, `manager_rejected`, `manager_approved`, `hr_rejected`, `hr_approved`

---

### `POST /api/plans` — Create Plan

Creates a new KPI plan. Objectives and behaviors are stringified to JSON for database storage.

**Request Body:**
```json
{
  "id": "uuid",
  "planType": "performance | quarterly",
  "parentPlanId": "uuid (quarterly only)",
  "employeeId": "uuid",
  "employeeName": "John Doe",
  "employeeTitle": "IT Specialist",
  "department": "IT",
  "managerId": "uuid",
  "managerName": "Jane Smith",
  "year": "2026",
  "period": "H1",
  "isLeadership": false,
  "setupStatus": "draft",
  "objectives": [
    {
      "id": "uuid",
      "description": "Objective text",
      "strategy": "How to achieve",
      "supportNeeded": "Resources needed",
      "scoreCriteria": [
        { "score": 1, "description": "Poor criteria" },
        { "score": 2, "description": "Below avg criteria" },
        { "score": 3, "description": "Meets criteria" },
        { "score": 4, "description": "Exceeds criteria" },
        { "score": 5, "description": "Outstanding criteria" }
      ],
      "category": "operation",
      "weight": 50,
      "selfScore": 0,
      "managerScore": 0
    }
  ],
  "behaviors": [
    {
      "name": "Customer Focus",
      "subTopicId": "cf-1",
      "subTopicName": "Customer Relationships",
      "selfScore": 0,
      "managerScore": 0
    }
  ],
  "adjustingCriteria": "Description for Part III",
  "createdAt": "2026-01-15",
  "createdBy": "uuid"
}
```

**Response (200):** Created plan (with parsed objectives/behaviors)

---

### `GET /api/plans/[id]` — Get Plan

Returns a single KPI plan by ID.

**Response (200):** Plan object (with parsed objectives/behaviors)

**Response (404):** `{ "error": "Not found" }`

---

### `PUT /api/plans/[id]` — Update Plan

Updates an existing KPI plan. Typically used for:
- Saving draft objectives
- Submitting for review (`setupStatus: "submitted"`)
- Evaluator adding score criteria and approving/rejecting
- HR approving/rejecting

**Response (200):** Updated plan (with parsed objectives/behaviors)

---

### `DELETE /api/plans/[id]` — Delete Plan

Deletes a KPI plan by ID.

**Response (200):** `{ "success": true }`

---

## Evaluations

### `GET /api/evaluations` — List All Evaluations

Returns all evaluations ordered by creation date.

**Response (200):**
```json
[
  {
    "id": "uuid",
    "employeeId": "uuid",
    "employeeName": "John Doe",
    "employeeTitle": "IT Specialist",
    "department": "IT",
    "managerId": "uuid",
    "managerName": "Jane Smith",
    "period": "H1 2026",
    "reviewType": "performance",
    "planId": "uuid",
    "status": "draft",
    "objectives": [...],
    "behaviors": [...],
    "adjustingFactor": {
      "selfScore": 0,
      "managerScore": 0,
      "notes": ""
    },
    "hrNotes": "",
    "isLeadership": false,
    "auditLog": [
      {
        "timestamp": "2026-01-15T10:00:00.000Z",
        "action": "Draft Created",
        "fromStatus": null,
        "toStatus": "draft",
        "actorId": "uuid",
        "actorName": "John Doe",
        "actorRole": "employee"
      }
    ],
    "createdAt": "2026-01-15",
    "updatedAt": "2026-01-15"
  }
]
```

**Notes:**
- `objectives`, `behaviors`, `adjustingFactor`, and `auditLog` are parsed from JSON strings
- `status` values: `draft`, `submitted`, `manager_scored`, `hr_approved`, `hr_rejected`

---

### `POST /api/evaluations` — Create Evaluation

Creates a new evaluation. Complex fields are stringified for database storage.

**Response (200):** Created evaluation (with parsed fields)

---

### `GET /api/evaluations/[id]` — Get Evaluation

Returns a single evaluation by ID.

**Response (200):** Evaluation object (with parsed fields)

**Response (404):** `{ "error": "Not found" }`

---

### `PUT /api/evaluations/[id]` — Update Evaluation

Updates an existing evaluation. Typically used for:
- Self-scoring objectives and behaviors
- Submitting to evaluator (`status: "submitted"`)
- Evaluator scoring (`status: "manager_scored"`)
- HR signing off (`status: "hr_approved"`)

**Response (200):** Updated evaluation (with parsed fields)

---

### `DELETE /api/evaluations/[id]` — Delete Evaluation

Deletes an evaluation by ID.

**Response (200):** `{ "success": true }`

---

## Settings

### `GET /api/settings` — Get All Settings

Returns all system settings as a key-value map.

**Response (200):**
```json
{
  "departments": ["IT", "HR", "Finance", "Operations"],
  "jobTitles": {
    "IT": ["IT Specialist", "IT Manager", "System Admin"],
    "HR": ["HR Director", "HR Specialist"],
    "Finance": ["Accountant", "Senior Accountant"],
    "Operations": ["Operations Manager"]
  },
  "objectiveCategories": ["Operation", "Financial", "People", "Innovation", "Customer"]
}
```

---

### `PUT /api/settings` — Update Setting

Updates or creates a single setting by key.

**Request Body:**
```json
{
  "key": "departments",
  "value": ["IT", "HR", "Finance", "Operations", "Marketing"]
}
```

**For jobTitles (nested object):**
```json
{
  "key": "jobTitles",
  "value": {
    "IT": ["IT Specialist", "IT Manager"],
    "HR": ["HR Director"]
  }
}
```

**Response (200):**
```json
{
  "key": "departments",
  "value": ["IT", "HR", "Finance", "Operations", "Marketing"]
}
```

**Validation:** Returns `400` if `key` is missing or `value` is not an object/array.

---

## Error Responses

All endpoints follow a consistent error format:

```json
{ "error": "Description of what went wrong" }
```

| Status | Meaning |
|--------|---------|
| 400 | Bad request — invalid payload |
| 401 | Unauthorized — not authenticated |
| 404 | Not found — resource does not exist |
| 500 | Server error — unexpected failure |

---

## Data Serialization

The API handles JSON serialization for complex nested fields:

| Model | Field | Stored As | Returned As |
|-------|-------|-----------|-------------|
| `KpiPlan` | `objectives` | JSON string | Parsed array |
| `KpiPlan` | `behaviors` | JSON string | Parsed array |
| `Evaluation` | `objectives` | JSON string | Parsed array |
| `Evaluation` | `behaviors` | JSON string | Parsed array |
| `Evaluation` | `adjustingFactor` | JSON string | Parsed object |
| `Evaluation` | `auditLog` | JSON string | Parsed array |
| `Setting` | `value` | JSON string | Parsed array/object |
