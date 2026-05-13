# MSIC KPI System - Migration Worklog

---
Task ID: 1
Agent: Main Agent
Task: Clone GitHub repo and examine project structure

Work Log:
- Cloned repo from https://github.com/Somchit-cmd/msic-kpi-system.git
- Examined full project structure: SPA with state-based routing, Prisma + SQLite, custom auth
- Identified key files: EvaluationContext.tsx, Login.tsx, Settings.tsx, auth/route.ts
- Found next-auth in package.json but unused - auth is purely client-side React state

Stage Summary:
- Project is a KPI Evaluation System with roles: employee, manager, president, admin, superadmin
- Uses SQLite with Prisma, all auth in-memory (lost on refresh)
- Settings page has departments and job titles only

---
Task ID: 2
Agent: Main Agent
Task: Change database to Supabase PostgreSQL and scan existing tables

Work Log:
- Changed prisma/schema.prisma from sqlite to postgresql provider
- Added directUrl for Supabase connection
- Scanned existing Supabase tables: User, KpiPlan, Evaluation, Setting, ActivityLog, WorkflowLog
- Found existing data: 7 users, 8 evaluations, 3 settings (including objectiveCategories)
- Added ActivityLog and WorkflowLog models to Prisma schema
- Ran prisma db push - database already in sync
- Encountered Prisma URL validation issues with system-level DATABASE_URL env var
- Resolved by using datasourceUrl parameter in PrismaClient constructor with hardcoded fallback
- System env DATABASE_URL was set to old SQLite path, overriding .env file

Stage Summary:
- Database successfully migrated to Supabase PostgreSQL
- All 6 tables recognized in Prisma schema
- Connection uses datasourceUrl in PrismaClient constructor
- Existing data preserved in Supabase

---
Task ID: 3
Agent: Main Agent
Task: Fix login session to persist across page refreshes

Work Log:
- Updated auth/route.ts: POST sets httpOnly cookie (kpi_session), GET restores session, DELETE clears cookie
- Updated EvaluationContext.tsx: Added restoreSession() that calls GET /api/auth on mount
- Updated logout to call DELETE /api/auth to clear server-side cookie
- Updated AppSidebar.tsx: handleLogout is now async
- Changed logout type from () => void to () => Promise<void>

Stage Summary:
- Session persists via httpOnly cookie (24h maxAge)
- Page refresh restores session via GET /api/auth
- Logout clears both client state and server cookie

---
Task ID: 4
Agent: Main Agent
Task: Add Objective Category setting in system admin Settings page

Work Log:
- Added objectiveCategories to AppSettings type in types/evaluation.ts
- Changed ObjectiveCategory type from 'operation' | 'financial' to string (dynamic)
- Added objectiveCategories to settings state and fetchSettings in EvaluationContext
- Added Objective Categories card in Settings.tsx with add/remove/save functionality
- Updated SetupKpiForm.tsx: category dropdown now uses dynamic categories from settings
- Default categories fallback: ['Operation', 'Financial'] when none configured

Stage Summary:
- Objective Categories section added to Settings page with Target icon
- Categories are configurable (add/remove/save like departments)
- KPI setup form dropdown now shows dynamic categories from settings
- Existing Supabase data already has ["Operation","Financial","People","Innovation","Customer"]

---
Task ID: 5
Agent: Main Agent
Task: Fix dev server not running (Z logo showing in preview)

Work Log:
- Diagnosed the issue: dev server process was being killed between bash tool invocations
- Fixed package.json dev script (removed `| tee dev.log` pipe that was causing process to die)
- Updated db.ts to use Supabase pooler URL (port 6543 with pgbouncer=true) instead of direct connection (port 5432)
- Updated .env with correct pooler URL for DATABASE_URL and direct URL for DIRECT_URL
- Used double-fork technique to daemonize the dev server process so it persists
- Verified all functionality: login, session persistence, settings, objective categories

Stage Summary:
- Dev server now runs persistently using setsid + double-fork
- Database connection uses Supabase pooler (port 6543) for runtime, direct (port 5432) for migrations
- Session persistence confirmed working: cookie set correctly, session restores on refresh
- Objective Categories setting already implemented and working with 5 categories

---
Task ID: 4
Agent: context-updater
Task: Update EvaluationContext for new 3-role system with org-chart derived evaluator status

Work Log:
- Added `hasDirectReports: boolean` and `hasManager: boolean` to `EvaluationContextType` interface
- Removed `setCurrentRole: (role: Role) => void` from the interface
- Removed `canEvaluate: false` and `password: ''` from `currentUser` fallback object
- Replaced `canEvaluateOthers` calculation: now derived from org chart via `users.some(u => u.managerId === currentUser.id)`
- Added `hasDirectReports` and `hasManager` computed values after `canEvaluateOthers`
- Removed `setCurrentRole` useCallback and function entirely
- Updated `getPendingActions`: first branch uses `hasDirectReports` instead of role/canEvaluate checks
- Updated `getTeamEvaluations`: uses `hasDirectReports || admin || superadmin` instead of enumerated roles
- Added `hasDirectReports` and `hasManager` to context provider value
- Removed `setCurrentRole` from context provider value
- Lint passes with zero errors (only pre-existing font warning)

Stage Summary:
- Evaluator status is now derived from org chart (managerId relationships) instead of role checks
- `canEvaluateOthers` and `hasDirectReports` both check if any user has current user as their managerId
- `hasManager` checks if current user has a managerId set (they need to set up their own KPI)
- `setCurrentRole` removed entirely — no more role switching in simplified 3-role system
- `getPendingActions` and `getTeamEvaluations` updated to use org-chart derived `hasDirectReports`
- All changes are backward-compatible with existing `User` type (which still has `canEvaluate` field)

---
Task ID: 2
Agent: types-schema-updater
Task: Update Role type, User interface, Prisma schema, mock data, and seed for new 3-role system

Work Log:
- Updated `Role` type in `src/types/evaluation.ts` from 5 values to 3: `'employee' | 'admin' | 'superadmin'`
- Removed `canEvaluate: boolean` from `User` interface in `src/types/evaluation.ts`
- Changed `isLeadershipRole()` signature from `(user: User)` to `(hasDirectReports: boolean)`, now simply returns the boolean
- Updated `prisma/schema.prisma`: role comment changed to `// 'employee' | 'admin' | 'superadmin'`, removed `canEvaluate Boolean @default(false)` line
- Updated `src/data/mockData.ts`: all `manager` → `employee`, `president` → `employee`, removed `canEvaluate` from all 7 user objects, changed 4 audit log `actorRole: 'manager'` → `actorRole: 'employee'`
- Updated `prisma/seed.ts`: removed `canEvaluate: user.canEvaluate ?? false` from seed data mapping
- Lint passes with zero errors (only pre-existing font warning)

Stage Summary:
- Role system refactored from 5 roles to 3 roles: employee, admin, superadmin
- `canEvaluate` field fully removed from User type, Prisma schema, mock data, and seed
- Evaluator status is now derived from org chart (managerId relationships), not a stored field
- `isLeadershipRole()` now takes a `hasDirectReports` boolean instead of a User object
- Downstream consumers (views, API routes) still reference old `canEvaluate` and old roles — those will need updating in subsequent tasks

---
Task ID: 7
Agent: api-updater
Task: Update API routes to remove canEvaluate references and check for old role usage

Work Log:
- Removed `canEvaluate: true` from Prisma select in `src/app/api/users/route.ts` GET handler
- Removed `canEvaluate: true` from Prisma select in `src/app/api/users/[id]/route.ts` GET handler
- Reviewed `src/app/api/auth/route.ts`: uses spread destructuring (`const { password: _, ...userWithoutPassword } = user`), so `canEvaluate` will not appear once the DB column is removed — no changes needed
- Reviewed `src/app/api/evaluations/route.ts`: pure CRUD with JSON parsing, no role checks or `canEvaluate` references — no changes needed
- Reviewed `src/app/api/plans/route.ts`: pure CRUD with JSON parsing, no role checks or `canEvaluate` references — no changes needed
- Ran grep across all API files for `canEvaluate`, `'manager'`, `'president'` — zero matches found
- Lint passes with zero errors (only pre-existing font warning)

Stage Summary:
- `canEvaluate` fully removed from all API route Prisma selects
- Auth route requires no changes (spread destructuring adapts automatically)
- Evaluations and plans routes have no role/canEvaluate logic — they are pure data CRUD
- All API routes are now consistent with the new 3-role system (employee, admin, superadmin) and org-chart-derived evaluator status

---
Task ID: 5
Agent: sidebar-updater
Task: Update AppSidebar navigation for new 3-role system with org-chart derived nav items

Work Log:
- Removed `Role` import from `@/types/evaluation` (no longer needed — `roleLabels` removed)
- Removed module-level constants: `baseNavItems`, `superAdminNavItems`, `presidentNavItems`
- Removed `setCurrentRole` from `useEvaluation()` destructuring (was removed from context in Task ID 4)
- Added `hasDirectReports` and `hasManager` to `useEvaluation()` destructuring
- Replaced static nav item arrays with an IIFE that dynamically builds nav items based on role + org chart:
  - `superadmin`: Dashboard, Team, User Management, Settings
  - `admin`: Dashboard, Setup KPI, Performance Reviews, Quarterly Reviews, Team
  - Employee with direct reports (evaluator): Dashboard, Setup KPI (if hasManager), Performance Reviews, Quarterly Reviews, Team
  - Employee without direct reports: Dashboard, Setup KPI (if hasManager), Performance Reviews, Quarterly Reviews
- Removed `roleLabels: Record<Role, string>` constant (no longer displayed in sidebar)
- Removed old filter-based logic that checked `currentUser.canEvaluate` (field no longer exists)
- Lint passes with zero errors (only pre-existing font warning)

Stage Summary:
- Sidebar navigation fully aligned with new 3-role system
- Employee nav items are conditionally built using `hasDirectReports` and `hasManager` from org chart
- President (employee without manager) correctly omits "Setup KPI" since `hasManager` is false
- All stale references to old roles (`president`, `manager`) and `canEvaluate` removed from sidebar
- No `Role` type import needed in sidebar anymore

---
Task ID: 6
Agent: views-updater
Task: Update ALL view files to replace old role checks and canEvaluate with hasDirectReports/hasManager

Work Log:
- Updated `src/views/Dashboard.tsx`:
  - Replaced `canEvaluateOthers` with `hasDirectReports` and `hasManager` in destructuring
  - Replaced `isPresident = currentUser.role === 'president'` with `isTopEvaluator = hasDirectReports && !hasManager`
  - Updated all references from `isPresident` to `isTopEvaluator`
- Updated `src/views/SetupKpi.tsx`:
  - Added `hasDirectReports` to destructuring, removed local `canEvaluateOthers` calculation
  - Replaced `canEvaluateOthers` in visibility filter with `hasDirectReports`
  - Replaced `canEvaluateOthers` in `canReview()` with `hasDirectReports`
- Updated `src/views/SetupKpiForm.tsx`:
  - Added `hasDirectReports` and `hasManager` to destructuring
  - Replaced `isPresident = currentUser.role === 'president'` with `hasDirectReports && !hasManager` for employeesInDept
  - Replaced `isManagerView` role check `(manager || president || (employee && canEvaluate))` with `hasDirectReports`
  - Replaced `isLeadershipRole(currentUser)` with `isLeadershipRole(hasDirectReports)` (new signature)
  - Updated `targetIsLeadership` to use `isLeadershipRole(users.some(u => u.managerId === (empUser ?? currentUser).id))`
- Updated `src/views/PerformanceReviews.tsx`:
  - Added `hasDirectReports` and `hasManager` to destructuring
  - Replaced `currentUser.role === 'president'` visibility check with `hasDirectReports && !hasManager`
- Updated `src/views/QuarterlyReviews.tsx`:
  - Same pattern as PerformanceReviews
- Updated `src/views/EvaluationView.tsx`:
  - Added `hasDirectReports` to destructuring
  - Replaced `(manager || president || (employee && canEvaluate)) && eval_.managerId === currentUser.id` with `hasDirectReports && eval_.managerId === currentUser.id`
- Updated `src/views/QuarterlyReviewView.tsx`:
  - Added `hasDirectReports` to destructuring
  - Same pattern as EvaluationView
- Updated `src/views/NewEvaluation.tsx`:
  - Added `hasDirectReports` to destructuring
  - Replaced `admin || manager || president || (employee && canEvaluate)` with `admin || hasDirectReports`
- Updated `src/views/NewQuarterlyReview.tsx`:
  - Same pattern as NewEvaluation
- Updated `src/views/Team.tsx`:
  - Added `hasDirectReports` to destructuring
  - Replaced `currentUser.canEvaluate` with `hasDirectReports`
- `src/views/Settings.tsx`: No changes needed (only `superadmin` check, kept as is)
- Updated `src/views/UserManagement.tsx`:
  - Removed `manager` and `president` from `roleLabels`, keeping only `employee`, `admin`, `superadmin`
  - Removed `manager` and `president` from `roleVariants`
  - Removed `manager` (Shield) and `president` (ShieldCheck) from `roleIcons`
  - Removed `canEvaluate: boolean` from `UserFormState` interface
  - Removed `canEvaluate: false` from `emptyForm` default state
  - Removed `canEvaluate: u.canEvaluate ?? false` from `openEdit`
  - Removed `canEvaluate` from `handleSave` payload
  - Changed `(employee || manager) && form.managerId` to `employee && form.managerId` for managerId assignment
  - Replaced `managers` filter from `u.role === 'manager' || u.role === 'president'` to `u.id !== editingId && u.role === 'employee'`
  - Replaced `u.canEvaluate` Evaluator badge display with `users.some(t => t.managerId === u.id)` (derived from org chart)
  - Removed the `canEvaluate` checkbox UI from the form
  - Simplified role select onChange (removed canEvaluate reset)
  - Changed manager select label from conditional "Manager" / "President / Manager" to just "Manager"
  - Removed `Checkbox` import (no longer used)
  - Changed grid from 5 columns to 3 columns for role count cards (3 roles instead of 5)
- Ran `bun run lint` — passes with zero errors (only pre-existing font warning)
- Ran grep across all view files for `canEvaluate`, `role === 'manager'`, `role === 'president'` — zero matches

Stage Summary:
- All 12 view files updated to use the new 3-role permission model
- `hasDirectReports` replaces all `canEvaluate` and `manager/president` role checks for evaluator logic
- `hasDirectReports && !hasManager` replaces `president` role checks (top-level evaluator)
- `canEvaluate` field completely removed from UserManagement form, display, and save logic
- Evaluator badge in UserManagement now derived from org chart (other users have this user as managerId)
- Manager select in UserManagement shows all other employees (anyone can be a manager now)
- Zero remaining references to old roles (`manager`, `president`) or `canEvaluate` in view files
