# Deployment & Operations Guide

## Prerequisites

- **Node.js** 18+ or **Bun** runtime
- **PostgreSQL** database (Supabase recommended)
- **Git** for version control

---

## Local Development

### 1. Clone & Install

```bash
git clone https://github.com/Somchit-cmd/msic-kpi-system.git
cd msic-kpi-system
bun install
```

### 2. Environment Setup

Create a `.env` file in the project root:

```env
# Supabase PostgreSQL — Pooler URL (for runtime queries)
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true

# Supabase PostgreSQL — Direct URL (for Prisma migrations)
DIRECT_URL=postgresql://postgres.[project-ref]:[password]@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres
```

**Getting Supabase credentials:**
1. Go to [supabase.com](https://supabase.com) → Your project → Settings → Database
2. Find the connection string under "Connection string" → "URI" tab
3. Use the **Pooler** URL (port 6543) for `DATABASE_URL`
4. Use the **Direct** URL (port 5432) for `DIRECT_URL`

### 3. Database Setup

```bash
# Generate Prisma client
bun run db:generate

# Push schema to database (creates/updates tables)
bun run db:push
```

**Note:** `db:push` is used instead of `db:migrate` because the project uses Prisma's prototyping mode. For production, consider using `prisma migrate deploy` for versioned migrations.

### 4. Start Development Server

```bash
bun run dev
```

The application runs on `http://localhost:3000`.

### 5. Seed Data (Optional)

If starting with an empty database, you can run the seed script to populate initial data:

```bash
bun run db:seed
```

This creates sample users, settings, and demonstration data.

---

## NPM Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start Next.js dev server on port 3000 |
| `bun run build` | Generate Prisma client + build for production |
| `bun run start` | Start production server |
| `bun run lint` | Run ESLint to check code quality |
| `bun run db:push` | Push Prisma schema changes to database |
| `bun run db:generate` | Generate Prisma client from schema |
| `bun run db:migrate` | Create and apply Prisma migration |
| `bun run db:reset` | Reset database and re-apply migrations |

---

## Production Deployment (Netlify)

The project includes `netlify.toml` for Netlify deployment:

```toml
[build]
  command = "npx prisma generate && next build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "20"
  NETLIFY_NEXT_PLUGIN_SKIP = "false"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

### Netlify Deployment Steps

1. **Connect Repository**: Link your GitHub repo to Netlify
2. **Set Environment Variables**: Add `DATABASE_URL` and `DIRECT_URL` in Netlify's environment settings
3. **Deploy**: Netlify automatically builds and deploys on push to main

### Environment Variables on Netlify

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL pooler connection string |
| `DIRECT_URL` | Yes | PostgreSQL direct connection string |

**Security Note:** Never commit `.env` files to the repository. The `.gitignore` should include `.env*` patterns.

---

## Authentication Configuration

### Session Cookie Settings

| Setting | Value | Description |
|---------|-------|-------------|
| Cookie Name | `kpi_session` | httpOnly cookie identifier |
| Default Max-Age | 86400s (24h) | Standard session duration |
| Remember-Me Max-Age | 2592000s (30 days) | Extended session with "Remember Me" |
| SameSite | `lax` | Protects against CSRF |
| httpOnly | `true` | Prevents JavaScript access (XSS protection) |
| Path | `/` | Available on all routes |

### Password Security

- All passwords are hashed with **bcrypt** (cost factor 10)
- Legacy plain-text passwords are **auto-upgraded** on first successful login
- Username lookup is **case-insensitive** (`johndoe` = `JohnDoe` = `JOHNDOE`)

### Auto-Migration Flow

```
Login attempt → Check password format:
  ├─ Starts with "$2a$" or "$2b$" → bcrypt.compare()
  └─ Plain text → Direct comparison → If valid, hash and update in DB
```

---

## Database Operations

### Schema Changes

When modifying `prisma/schema.prisma`:

```bash
# Development: Push changes directly
bun run db:push

# Production: Create a migration
bunx prisma migrate dev --name description_of_change
```

### Database Backups

Supabase provides automatic daily backups. For manual backups:

```bash
# Using pg_dump with the direct connection URL
pg_dump "postgresql://postgres.[ref]:[pass]@...supabase.com:5432/postgres" > backup.sql
```

### Connection Pooling

The application uses Supabase's PgBouncer for connection pooling:

- **Port 6543** (pooler): Used for all runtime queries (`DATABASE_URL`)
- **Port 5432** (direct): Used only for Prisma schema operations (`DIRECT_URL`)

**Why pooling?** Serverless environments (like Netlify) create many short-lived connections. PgBouncer reuses connections to prevent exhausting PostgreSQL's connection limit.

---

## Monitoring & Troubleshooting

### Common Issues

#### 1. Dev Server Not Starting

**Symptom:** Blank page or "Z" logo in preview

**Solutions:**
- Check if port 3000 is already in use: `lsof -i :3000`
- Kill existing processes: `kill -9 $(lsof -t -i:3000)`
- Restart: `bun run dev`

#### 2. Database Connection Errors

**Symptom:** `P1001` or connection timeout errors

**Solutions:**
- Verify `DATABASE_URL` uses port 6543 with `?pgbouncer=true`
- Verify `DIRECT_URL` uses port 5432
- Check Supabase project status (may be paused due to inactivity)
- Ensure IP is not blocked by Supabase network restrictions

#### 3. Prisma Client Errors

**Symptom:** `Cannot find module '@prisma/client'`

**Solutions:**
```bash
bun run db:generate
```

#### 4. Session Lost on Refresh

**Symptom:** User is logged out after page refresh

**Solutions:**
- Check browser cookie settings (third-party cookies may be blocked)
- Verify the `kpi_session` cookie is being set (check DevTools → Application → Cookies)
- Ensure the API `/api/auth` GET endpoint is accessible

### Log Locations

| Log | Location | Description |
|-----|----------|-------------|
| Dev server | Terminal output | Next.js dev server logs |
| Build errors | Terminal output | Build-time compilation errors |
| Runtime errors | Browser console | Client-side React errors |
| API errors | Server logs | Backend API route errors |

---

## Security Considerations

### Current Implementation

| Aspect | Implementation | Status |
|--------|---------------|--------|
| **Password Storage** | bcrypt hashing | ✅ Secure |
| **Session Management** | httpOnly cookies | ✅ Secure |
| **CSRF Protection** | SameSite=lax cookies | ✅ Basic |
| **XSS Protection** | React auto-escaping + httpOnly | ✅ Basic |
| **Input Validation** | Client-side only | ⚠️ Should add server-side |
| **API Authorization** | None (no middleware) | ⚠️ Should add |
| **SQL Injection** | Prisma parameterized queries | ✅ Protected |
| **Rate Limiting** | None | ⚠️ Should add |

### Recommended Improvements

1. **API Authorization Middleware**: Add session validation to all API routes (currently only `/api/auth` validates sessions)
2. **Server-Side Input Validation**: Add Zod schemas to validate request bodies on the server
3. **Rate Limiting**: Add rate limits to the login endpoint to prevent brute-force attacks
4. **HTTPS Enforcement**: Ensure production deployment enforces HTTPS
5. **Content Security Policy**: Add CSP headers to prevent XSS attacks
6. **Audit Logging**: ActivityLog and WorkflowLog models exist but need server-side integration

---

## Scaling Considerations

### Current Limitations

| Area | Limitation | Mitigation |
|------|-----------|------------|
| **Data Loading** | All data fetched on mount | Add pagination or lazy loading |
| **State Management** | Single React Context | Consider splitting into domains or using TanStack Query |
| **Client-Side Routing** | No URL-based navigation | Consider migrating to Next.js file-based routing |
| **JSON Storage** | Complex fields as JSON strings | Consider relational tables for querying |

### Recommended Scaling Path

1. **Short-term** (100+ users): Add API pagination, server-side filtering
2. **Medium-term** (1000+ users): Migrate to file-based routing, add Redis caching
3. **Long-term** (10000+ users): Extract objectives/behaviors to relational tables, add read replicas

---

## Maintenance Tasks

### Regular Maintenance

| Task | Frequency | Command |
|------|-----------|---------|
| Update dependencies | Monthly | `bun update` |
| Check for security vulnerabilities | Weekly | `bun audit` |
| Database backup verification | Weekly | Check Supabase dashboard |
| Review audit logs | Monthly | Query ActivityLog/WorkflowLog |

### Version Updates

```bash
# Update Next.js
bun update next

# Update Prisma
bun update prisma @prisma/client
bun run db:generate

# Update shadcn/ui components
npx shadcn@latest update
```
