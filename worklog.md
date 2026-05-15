---
Task ID: 1
Agent: Main Agent
Task: Clone GitHub repo and set up MSIC KPI System in sandbox

Work Log:
- Cloned repo from https://github.com/Somchit-cmd/msic-kpi-system.git using PAT
- Initialized git in existing /home/z/my-project directory and fetched from remote
- Checked out origin/main (commit 7e19227 - "docs: add comprehensive project documentation")
- Verified .env already contains correct Supabase DATABASE_URL and DIRECT_URL
- Verified prisma/schema.prisma uses postgresql provider with directUrl
- Verified src/lib/db.ts has hardcoded Supabase pooler URL as fallback
- Installed all dependencies with bun install (850 packages)
- Prisma Client generated successfully (v6.11.1)
- Started Next.js dev server on port 3000
- Verified server responds with HTTP 200 on /
- Verified /api health endpoint returns {"message":"Hello, world!"}
- Verified /api/auth endpoint works (returns "Not authenticated" for unauthenticated requests)
- Verified /api/users endpoint connects to Supabase and returns user data (6 users)
- Database connection to Supabase PostgreSQL confirmed working

Stage Summary:
- Project successfully cloned and running at http://localhost:3000
- No changes made to the repo - exact clone of main branch
- Database connected to Supabase PostgreSQL via pooler (port 6543)
- All API routes functional
- MSIC KPI Evaluation System is a single-page Next.js app with client-side routing via React Context
- 6 models in Prisma schema: User, KpiPlan, Evaluation, Setting, ActivityLog, WorkflowLog
- Auth uses custom cookie-based sessions (bcryptjs), not NextAuth

---
Task ID: 2
Agent: Main Agent
Task: Add KPI Setup section to Employee Dashboard

Work Log:
- Analyzed current Dashboard.tsx - only showed Evaluations for employee role
- Analyzed EvaluationContext.tsx - plans data already available via context
- Analyzed SetupKpi.tsx - understood KPI plan structure (performance + quarterly)
- Added "My KPI Plans" card section to Dashboard showing employee's own KPI plans
- Added new stat card "My KPI Plans" count in the stats row
- Updated Pending Actions count to include pending plan actions (draft, rejected)
- Split KPI plans into Performance KPI and Quarterly KPI sub-sections with proper icons
- Each plan row shows Year, Period, Objectives count, Setup Status badge, and Edit/View action
- Added "New KPI" button in KPI Plans card header
- Updated stats grid from 3 columns to 4 columns (sm:grid-cols-2 lg:grid-cols-4)
- Added imports: SetupStatusBadge, Button, FileText, CalendarRange, Plus
- Removed unused imports: Clock, SetupStatus, SETUP_STATUS_LABELS, PlanType
- Ran lint: 0 errors, only pre-existing warning about custom fonts

Stage Summary:
- Employee Dashboard now shows both "My KPI Plans" and "My Evaluations" sections
- Stats row now has 4 cards: My Evaluations, My KPI Plans, Pending Actions, Completed
- KPI Plans section includes Performance and Quarterly sub-tables with status badges
- All navigation works - clicking rows or buttons navigates to correct views

---
Task ID: 3
Agent: Main Agent
Task: Redesign Part III Adjusting Factors in KPI Setup based on new business rules

Work Log:
- Added new types to evaluation.ts: AdjustingCategory, AdjustingFactorItem, AdjustingFactorCriteria, ADJUSTING_SCORE_LABELS, parseAdjustingCriteria(), getPartWeights()
- Updated calcPartI, calcPartII, calcPartIII to accept dynamic weight parameters (default 45/45/10)
- Added calcPartIIIFromFactors() for weighted factor-level calculation
- Updated calcFinalScore() to use dynamic part weights via getPartWeights()
- Rewrote SetupKpiForm Part III tab:
  - Replaced simple textarea with structured table editor
  - Added Part III Weight input (0-15%) with validation
  - Added auto-calculated Part I/Part II weight display
  - Added table of adjusting factor items (Topic, Category, Weight, Actions)
  - Added Score Definitions reference box showing 1/2/4/5 scale
  - Added Notes textarea
  - Added factor weight total validation (must sum to 100%)
  - Backward compatible: parses old plain-text adjustingCriteria
- Updated NewEvaluation:
  - Parses adjusting criteria from selected plan
  - Shows individual factor cards with ScoreButtons (allowedScores=[1,2,4,5])
  - Uses dynamic part weights from plan for score calculation
  - Builds weighted AdjustingFactor for backward compat with Evaluation type
- Updated EvaluationView:
  - Reads adjusting criteria from associated KPI plan
  - Shows structured factor cards with category, weight, and scoring
  - Supports both new structured factors and legacy single adjusting factor
  - Manager scoring uses allowedScores=[1,2,4,5] for adjusting factors
  - Dynamic Part I/II/III weight display in score summary
- Updated ScoreButtons component:
  - Added allowedScores prop (e.g. [1,2,4,5] for adjusting factors)
  - Shows ADJUSTING_SCORE_LABELS when custom scores provided
  - Flexible wrapping for longer label text
- Updated PDF export with dynamic part weight labels
- Fixed React Compiler memoization issues (removed problematic useMemo dependencies)
- Ran lint: 0 errors, 1 pre-existing warning

Stage Summary:
- Part III now follows the business rules: multiple factors with category (positive/negative), relative weights (sum to 100%), Part III weight (0-15%), auto-calculated Part I/II weights
- Score definitions: 5=Outstanding contribution, 4=Significant contribution, 2=Significant failure, 1=Unacceptable failure (no 3)
- All components updated: SetupKpiForm, NewEvaluation, EvaluationView, ScoreButtons, pdfExport
- Backward compatible with existing data (old plain-text adjustingCriteria parsed gracefully)
- Dynamic Part I/II/III weights propagated throughout the system

---
Task ID: 4
Agent: Main Agent
Task: Add in-app notification system (no push notifications)

Work Log:
- Found notification system was already partially implemented from previous session:
  - Notification model in Prisma schema (id, recipientId, type, title, message, entityType, entityId, read, createdAt)
  - API routes: GET/POST /api/notifications, PUT /api/notifications/[id], PUT /api/notifications/read-all, DELETE /api/notifications/[id]
  - NotificationBell component with dropdown panel, unread badge, mark-read, mark-all-read
  - pushNotification() calls in all status transition points (SetupKpiForm, EvaluationView, NewEvaluation, QuarterlyReviewView, NewQuarterlyReview)
- Fixed critical bug: fetchNotifications used currentUserId from closure, but on initial load, currentUserId was null because React batches state updates
  - Added userIdRef to track currentUserId synchronously
  - restoreSession now returns userId for chaining
  - Initial data load fetches notifications with the returned userId
  - fetchNotifications accepts optional overrideUserId parameter
- Fixed React Compiler lint errors:
  - Removed useEffect that called fetchNotifications directly (setState in effect)
  - Moved notification fetch into the initial data load Promise.all
  - Added setUserSession helper to sync both state and ref
  - Updated login callback to use fetchNotifications(user.id) directly
  - Updated logout to clear userIdRef and notifications
- Added notification polling: every 30s while logged in, notifications auto-refresh
- Updated markAllNotificationsRead to use userIdRef instead of currentUserId state
- All lint errors resolved (0 errors, 1 pre-existing font warning)

Stage Summary:
- In-app notification system fully functional
- Notifications generated for all KPI and evaluation workflow events:
  - KPI submitted → notify manager
  - KPI approved by manager → notify employee + HR
  - KPI rejected by manager → notify employee
  - KPI approved/rejected by HR → notify employee (+ manager if approved)
  - Evaluation submitted → notify manager
  - Evaluation scored by manager → notify employee + HR
  - Evaluation approved/rejected by HR → notify employee
- NotificationBell in AppLayout header with unread count badge
- Click notification navigates to related entity (plan or evaluation)
- Auto-polling every 30s for new notifications
- Mark individual or all as read functionality
