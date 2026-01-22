# Claude Code Master Build Prompt v9 (v29 Framework Alignment)

## FRAMEWORK VERSION

Framework: Agent Specification Framework v2.1
Document: Claude Code Master Build Prompt
Status: Active
Audit Integration: v29 framework (21 prevention patterns + cross-agent alignment)

---

## CONFIGURATION

### Agent 8 Auto-Run Control

**Purpose:** Control whether Agent 8 (Code Review) automatically runs after code generation to detect and fix pattern violations.

**Setting:**
```
AUTO_RUN_AGENT_8 = false
```

**Options:**
- `false` (DEFAULT) - Agent 8 does NOT run automatically
  - Use this to test if Agent 6 patterns prevent issues during initial code creation
  - Code generation completes, user manually runs Agent 8 if desired
  - Recommended for testing pattern effectiveness

- `true` - Agent 8 runs automatically after code generation
  - Code generation → Agent 8 audit → Auto-fix detected issues → Complete
  - Use this for production workflows where zero-issue guarantee is required
  - Creates safety net but masks whether Agent 6 patterns work

**Current Workflow (AUTO_RUN_AGENT_8 = false):**
1. Read specifications
2. Generate complete codebase following Implementation Plan patterns
3. Declare build complete
4. (User manually runs Agent 8 if desired to validate)

**Alternative Workflow (AUTO_RUN_AGENT_8 = true):**
1. Read specifications
2. Generate complete codebase following Implementation Plan patterns
3. Automatically run Agent 8 audit
4. If issues found: fix them automatically
5. Declare build complete

**Recommendation:** Keep `false` until Agent 6 v29 patterns are proven effective. Once first-run quality is consistently high, can enable `true` as safety net.

---

**Copy everything below this line and paste it into Claude Code. The spec files should be in the root of your GitHub repo.**

---

## MASTER BUILD INSTRUCTION

You are building a complete application from comprehensive specification documents produced by Agent Specification Framework v2.1. Specifications are committed to repository root. Your job: read them all, organize them, build entire application autonomously.

This build system incorporates systematic prevention patterns from production audits. Every critical pattern that caused production failures has been encoded into these instructions.

### PHASE 0: SETUP

**Locate and read all specification files from root** (numbered 01-07):
- 01-PRD.md - Product requirements, user stories, acceptance criteria
- 02-ARCHITECTURE.md - Tech stack, file structure, deployment, security, **encryption requirements**
- 03-DATA-MODEL.md - Database schema, entities, relationships, Drizzle ORM
- 04-API-CONTRACT.md - All endpoints, request/response schemas, error codes, **HTTP methods**
- 05-UI-SPECIFICATION.md - All screens, components, states, accessibility, **AcceptInvitePage**
- 06-IMPLEMENTATION-PLAN.md - Ordered task list, dependencies, templates, scaffolding
- 07-QA-DEPLOYMENT.md - Test requirements, deployment verification, environment checklists, **Vite config**

**Create `/docs` folder and move all spec files into it.**

**Read ALL spec files completely before writing code.** Understand full application before starting.

### PHASE 1: SCAFFOLDING

Refer to Implementation Plan (06) for:
- Complete folder structure
- All configuration files with exact content
- Starter code templates
- Package dependencies with pinned versions

**Create entire scaffolding FIRST before any feature code.**

**Critical infrastructure (must create first):**

1. **Error classes and error codes registry**
   - All error classes per Architecture spec
   - Error codes match API Contract exactly

2. **Validation utilities** (CRITICAL - AUDIT PATTERN)
   ```typescript
   // server/lib/validation.ts
   import { BadRequestError } from '../errors';

   export function parseIntParam(value: string, paramName: string): number {
     const parsed = parseInt(value, 10);
     if (!Number.isFinite(parsed) || parsed < 1) {
       throw new BadRequestError(`Invalid ${paramName}`);
     }
     return parsed;
   }
   ```
   **ZERO-TOLERANCE RULE:** All URL parameter parsing uses parseIntParam. Direct parseInt() forbidden in routes.

3. **Response envelope helpers** (CRITICAL - AUDIT PATTERN)
   ```typescript
   // server/lib/response.ts
   import { Response } from 'express';

   export function sendSuccess(res: Response, data: any) {
     return res.json({
       data,
       meta: {
         timestamp: new Date().toISOString(),
         requestId: res.locals.requestId || crypto.randomUUID(),
       },
     });
   }

   export function sendCreated(res: Response, data: any) {
     return res.status(201).json({
       data,
       meta: {
         timestamp: new Date().toISOString(),
         requestId: res.locals.requestId || crypto.randomUUID(),
       },
     });
   }

   export function sendPaginated(
     res: Response,
     data: any[],
     pagination: { page: number; pageSize: number; total: number }
   ) {
     const totalPages = Math.ceil(pagination.total / pagination.pageSize);
     const hasMore = pagination.page < totalPages;

     return res.json({
       data,
       meta: {
         timestamp: new Date().toISOString(),
         requestId: res.locals.requestId || crypto.randomUUID(),
         pagination: {
           page: pagination.page,
           pageSize: pagination.pageSize,
           total: pagination.total,
           totalPages,
           hasMore,
         },
       },
     });
   }

   export function sendNoContent(res: Response) {
     return res.status(204).send();
   }
   ```
   **ZERO-TOLERANCE RULE:** All routes use these helpers. Direct `res.json()` forbidden.

4. **Encryption utility** (CRITICAL - AUDIT PATTERN - if OAuth/integrations present)

   **Check Architecture doc for OAuth or third-party API keys. If present, create:**

   ```typescript
   // server/lib/encryption.ts
   import crypto from 'crypto';

   const ALGORITHM = 'aes-256-gcm';
   const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');
   const IV_LENGTH = 16;

   export function encrypt(text: string): string {
     if (!process.env.ENCRYPTION_KEY) {
       throw new Error('ENCRYPTION_KEY environment variable is required for encryption');
     }

     const iv = crypto.randomBytes(IV_LENGTH);
     const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);

     let encrypted = cipher.update(text, 'utf8', 'hex');
     encrypted += cipher.final('hex');

     const authTag = cipher.getAuthTag();

     return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
   }

   export function decrypt(encryptedText: string): string {
     if (!process.env.ENCRYPTION_KEY) {
       throw new Error('ENCRYPTION_KEY environment variable is required for decryption');
     }

     const [ivHex, encrypted, authTagHex] = encryptedText.split(':');

     if (!ivHex || !encrypted || !authTagHex) {
       throw new Error('Invalid encrypted data format');
     }

     const iv = Buffer.from(ivHex, 'hex');
     const authTag = Buffer.from(authTagHex, 'hex');

     const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
     decipher.setAuthTag(authTag);

     let decrypted = decipher.update(encrypted, 'hex', 'utf8');
     decrypted += decipher.final('utf8');

     return decrypted;
   }
   ```
   **ZERO-TOLERANCE RULE:** OAuth tokens, API keys MUST be encrypted before database storage. No TODO comments in encryption code paths.

5. **Security middleware** (helmet, CORS, rate limiting with required headers)

6. **Graceful shutdown handlers**

7. **Database connection** with postgres-js driver (NOT @neondatabase/serverless)

8. **Complete Vite Configuration** (CRITICAL - AUDIT PATTERN)
   ```typescript
   // vite.config.ts
   import { defineConfig } from 'vite';
   import react from '@vitejs/plugin-react';
   import path from 'path';

   export default defineConfig({
     plugins: [react()],
     server: {
       host: '0.0.0.0',      // ✓ Bind all interfaces
       port: 5000,            // ✓ Replit port
       proxy: {               // ✓ REQUIRED - API proxy configuration
         '/api': {
           target: 'http://localhost:3001',  // Express dev server port
           changeOrigin: true,
         },
       },
       watch: {
         usePolling: true,   // ✓ REQUIRED - Replit filesystem
         interval: 1000,     // ✓ REQUIRED - Reduce CPU
         ignored: [          // ✓ REQUIRED - Performance critical
           '**/node_modules/**',
           '**/.git/**',
           '**/dist/**'
         ],
       },
     },
   });
   ```
   **ALL SIX settings are MANDATORY:**
   1. `host: '0.0.0.0'` - External access
   2. `port: 5000` - Replit deployment port
   3. `proxy['/api'].target: 'http://localhost:3001'` - Points to Express dev server
   4. `watch.usePolling: true` - Filesystem compatibility
   5. `watch.interval: 1000` - CPU optimization
   6. `watch.ignored: [...]` - Performance (missing causes 30+ second startup and 100% CPU)

9. **Development Port Strategy** (CRITICAL - AUDIT PATTERN)

   **package.json scripts MUST follow this pattern:**
   ```json
   {
     "scripts": {
       "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
       "dev:server": "PORT=3001 tsx watch server/index.ts",
       "dev:client": "vite",
       "build": "tsc && vite build",
       "start": "NODE_ENV=production node dist/server/index.js"
     },
     "devDependencies": {
       "concurrently": "^8.2.2"
     }
   }
   ```

   **Port Strategy:**
   - **Development:** Vite (5000) + Express (3001) = Two servers
   - **Production:** Express (5000) only = One server
   - **Vite proxy** routes `/api/*` from 5000 → 3001 in development

   **ZERO-TOLERANCE RULE:** Express dev server MUST use PORT=3001, Vite proxy MUST target localhost:3001

### PHASE 2: IMPLEMENTATION

Work through Implementation Plan (06) task list **IN ORDER**.

**For EACH task:**
1. Check Source field for relevant spec section
2. Implement according to spec exactly
3. Ensure all Acceptance Criteria met
4. Address platform-specific notes
5. **Apply critical audit patterns below**

**Key references by document:**

| Document | Reference For |
|----------|---------------|
| API Contract (04) | Error response format, error codes registry, route parameter validation, pagination, rate limiting, **HTTP methods** |
| Architecture (02) | Middleware ordering, database driver (postgres-js), ORM patterns (Drizzle), security configuration, **encryption spec** |
| Data Model (03) | Schema definitions, entity relationships, query patterns, type exports |
| UI/UX Specification (05) | Screen states, error-to-message mappings, React patterns, shadcn/ui components, accessibility, **AcceptInvitePage** |

**Platform-Critical Patterns (per Framework Constitution):**

| Pattern | Requirement |
|---------|-------------|
| Database Driver | `postgres` package (postgres-js), NOT `@neondatabase/serverless` |
| Drizzle Adapter | `drizzle-orm/postgres-js`, NOT `drizzle-orm/neon-http` |
| API Prefix | `/api` (not `/api/v1` unless PRD specifies) |
| Health Endpoint | `GET /api/health` returns `{ "status": "ok", "timestamp": "<ISO8601>" }` |
| Production Port | 5000 (server binds to `0.0.0.0`) |
| Trust Proxy | `app.set('trust proxy', 1)` required for rate limiting |
| Static Paths | Use `process.cwd()`, not `__dirname` |
| SPA Fallback | Use middleware pattern, not `app.get('*')` |
| Tailwind CSS | Match version to CSS syntax (v3: @tailwind, v4: @import) |
| TypeScript | `moduleResolution: "bundler"` for tsx execution |

---

## CRITICAL AUDIT PATTERNS (ZERO-TOLERANCE ENFORCEMENT)

These patterns prevent 21 common production failures. Every single one must be followed.

### PATTERN 1: Route Path Syntax (CRITICAL - CRIT-002-005)

**RULE:** All route parameters MUST have `/` immediately before `:`

```typescript
// ✓ CORRECT
router.get('/:id', ...);
router.get('/projects/:projectId/sources', ...);
router.get('/current/members/:userId', ...);

// ✗ WRONG - DEPLOYMENT BLOCKER
router.get(':id', ...);                          // Missing leading /
router.get('current/members:userId', ...);        // Missing / before :userId
router.post('projects:projectId/sources', ...);  // Missing / before :projectId
```

**SELF-CHECK BEFORE FINALIZING ROUTES:**
1. Find every `:` in route path
2. Verify `/` immediately before it
3. If not, add the `/`

### PATTERN 2: parseIntParam Enforcement (CRITICAL - CRIT-006-007)

**RULE:** All URL parameter parsing uses parseIntParam utility

```typescript
// ✓ CORRECT
const userId = parseIntParam(req.params.userId, 'userId');
const projectId = parseIntParam(req.params.projectId, 'projectId');

// ✗ WRONG - DEPLOYMENT BLOCKER
const userId = parseInt(req.params.userId, 10);
const userId = Number(req.params.userId);
```

**Pattern:** If you use parseIntParam once in a file, scan file for similar patterns and convert them all.

### PATTERN 3: HTTP Method Verification (HIGH - HIGH-006-008)

**RULE:** HTTP method must match API Contract exactly

**Common Mistakes:**
- Using PUT when API Contract specifies PATCH (update endpoints)
- Using GET when should be POST
- Path name differs from spec

**Verification Process:**
1. Read route: `router.put('/current', ...)`
2. Find in API Contract: "PATCH /api/organizations/current"
3. **If methods differ:** Fix the route method
4. **If paths differ:** Fix the route path (character-for-character match)

**PATCH vs PUT distinction:**
- PATCH: Partial updates (most common)
- PUT: Full resource replacement (rare)

### PATTERN 4: Endpoint Coverage (CRITICAL - CRIT-008-009)

**RULE:** Every endpoint in API Contract must be implemented

**Auth Endpoints Checklist (COMMONLY MISSED):**
1. POST /api/auth/register ✓
2. POST /api/auth/login ✓
3. POST /api/auth/refresh ✓
4. POST /api/auth/logout ✓
5. GET /api/auth/me ✓
6. **PATCH /api/auth/profile** ← COMMONLY MISSED
7. POST /api/auth/forgot-password ✓
8. **GET /api/auth/reset-password/:token** ← COMMONLY MISSED
9. POST /api/auth/reset-password ✓

**Verification:** Count routes in implementation = count endpoints in API Contract

### PATTERN 5: Response Envelope Enforcement (HIGH - MED-001)

**RULE:** All routes use sendSuccess(), sendCreated(), sendPaginated(), sendNoContent()

```typescript
// ✓ CORRECT
return sendSuccess(res, user);
return sendCreated(res, project);
return sendPaginated(res, items, { page, pageSize, total });

// ✗ WRONG
return res.json({ user });           // Missing envelope
return res.json({ data: user });     // Incomplete envelope (no meta)
```

**Verification:** Grep for `res.json` in routes - should only appear in response helper file.

### PATTERN 6: Sensitive Data Encryption (CRITICAL - HIGH-001)

**RULE:** OAuth tokens, API keys MUST be encrypted before database storage

```typescript
// ✓ CORRECT
const encryptedToken = encrypt(oauthAccessToken);
await db.insert(integrations).values({
  userId,
  accessToken: encryptedToken,
});

// ✗ WRONG - DEPLOYMENT BLOCKER
await db.insert(integrations).values({
  userId,
  accessToken: oauthAccessToken,  // Unencrypted!
});

// ✗ DEPLOYMENT BLOCKER
// TODO: Encrypt token before storage
await db.insert(integrations).values({ accessToken: token });
```

**Verification:** If OAuth present, encryption.ts must exist and be used.

### PATTERN 7: Email Service Optional Pattern (HIGH - HIGH-003-005)

**RULE:** Optional email service doesn't crash when env var missing

```typescript
// ✓ CORRECT
async function sendPasswordResetEmail(email: string, token: string) {
  if (config.isEmailEnabled) {
    await emailService.sendPasswordReset(email, token);
  } else if (config.isDevelopment) {
    console.log(`[DEV] Reset token for ${email}: ${token}`);
  }
  // Always return success (don't leak config status)
}

// ✗ WRONG
async function sendPasswordResetEmail(email: string, token: string) {
  // TODO: Send email
  return;
}

// ✗ WRONG
async function sendPasswordResetEmail(email: string, token: string) {
  await emailService.sendPasswordReset(email, token); // Crashes if key missing
}
```

### PATTERN 8: Invitation Flow Completeness (HIGH - HIGH-004)

**RULE:** Registration handles both paths: with invite token AND without

```typescript
// ✓ CORRECT
router.post('/register', async (req, res) => {
  const { email, password, name, inviteToken } = req.body;

  if (inviteToken) {
    // Path 1: Join existing organization
    const invite = await db.query.invitations.findFirst({
      where: and(
        eq(invitations.token, inviteToken),
        gte(invitations.expiresAt, new Date())
      ),
    });

    if (!invite) throw new BadRequestError('Invalid or expired invitation');

    const user = await db.insert(users).values({
      email,
      password: await bcrypt.hash(password, 10),
      name,
      organizationId: invite.organizationId,
      role: invite.role,
    }).returning();

    // Mark invitation consumed
    await db.delete(invitations).where(eq(invitations.id, invite.id));

    return sendCreated(res, { user });
  } else {
    // Path 2: Create new organization
    const org = await db.insert(organizations).values({ name }).returning();
    const user = await db.insert(users).values({
      email,
      password: await bcrypt.hash(password, 10),
      name,
      organizationId: org.id,
      role: 'admin',
    }).returning();

    return sendCreated(res, { user, organization: org });
  }
});

// ✗ WRONG
router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;
  // TODO: Handle invite token
  const user = await createUser({ email, password, name });
  return sendCreated(res, user);
});
```

### PATTERN 9: AcceptInvitePage Implementation (CRITICAL - HIGH-009)

**RULE:** If invitation endpoints exist, AcceptInvitePage MUST exist

**Required Page:** `client/src/pages/auth/accept-invite.tsx`

**Required Route:** `/accept-invite/:token` or `/invitations/:token/accept`

**Minimum Implementation:**
```typescript
// client/src/pages/auth/accept-invite.tsx
export default function AcceptInvitePage() {
  const { token } = useParams();
  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. Validate token on mount
  useEffect(() => {
    validateToken(token).then(setInvitation).catch(...);
  }, [token]);

  // 2. Show organization details
  // 3. Form: name, password, confirmPassword
  // 4. Submit: POST /api/invitations/:token/accept
  // 5. Auto-login on success
  // 6. States: loading, valid, invalid/expired, already accepted

  return <div>...</div>;
}
```

**Verification:** If POST /api/invitations/:token/accept exists, page must exist and be routed.

### PATTERN 10: Mock Data Prevention (HIGH - HIGH-002)

**RULE:** No mock/placeholder data in production code

```typescript
// ✗ WRONG
async function getExternalData() {
  // TODO: Implement External API
  return {
    items: [
      { id: 1, title: "Mock item" },
      { id: 2, title: "Example data" }
    ]
  };
}

// ✓ CORRECT (if stub intentional)
async function getExternalData() {
  throw new NotImplementedError('External API integration pending');
}

// ✓ CORRECT (full implementation)
async function getExternalData() {
  if (!config.externalApiEnabled) {
    throw new NotImplementedError('External API not configured');
  }
  const response = await fetch(`${config.externalApiUrl}/data`, { ... });
  return await response.json();
}
```

### PATTERN 11: CSS Framework Alignment (CRITICAL - CRIT-001)

**RULE:** CSS syntax must match installed Tailwind version

```bash
# Check package.json
"tailwindcss": "^3.4.0"  → Use v3 syntax
"tailwindcss": "^4.0.0"  → Use v4 syntax
```

```css
/* ✓ CORRECT for Tailwind v3 */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* ✓ CORRECT for Tailwind v4 */
@import "tailwindcss";

/* ✗ WRONG - version mismatch causes build failure */
```

**Verification:** Read package.json Tailwind version, update client/src/index.css to match.

### PATTERN 12: Complete Vite Watch Configuration (CRITICAL - HIGH-010)

**See Phase 1 scaffolding** - all 5 settings required (usePolling, interval, ignored, host, port).

Missing `ignored` array causes catastrophic performance degradation.

### PATTERN 13: Drizzle Force Flags (HIGH)

**RULE:** Drizzle commands include --force for Replit

```json
// package.json
{
  "scripts": {
    "db:push": "drizzle-kit push --force",
    "db:generate": "drizzle-kit generate --force"
  }
}
```

### PATTERN 14: Auth Page Completeness (HIGH - MED-002)

**Phase 1 Auth Pages (DEPLOYMENT BLOCKERS):**
- LoginPage
- RegisterPage
- ForgotPasswordPage
- ResetPasswordPage
- **AcceptInvitePage** ← CRITICAL

**Verification:** All 5 pages exist in client/src/pages/auth/

### PATTERN 15: No TODO in Security Paths (CRITICAL)

**RULE:** Zero TODO/FIXME comments in auth, encryption, token code paths

```typescript
// ✗ DEPLOYMENT BLOCKER
// TODO: Encrypt token
await db.insert(integrations).values({ accessToken: token });

// ✗ DEPLOYMENT BLOCKER
// TODO: Hash password
await db.insert(users).values({ password });

// ✓ CORRECT - either implement fully or throw error
if (!process.env.ENCRYPTION_KEY) {
  throw new Error('ENCRYPTION_KEY required for OAuth integrations');
}
const encrypted = encrypt(token);
```

### PATTERN 16: Database Transaction Requirements (CRITICAL)

**RULE:** Multi-table operations MUST use transactions

**When Transactions Are REQUIRED:**
1. Creating parent + child records (register with org creation)
2. Transfer operations (update + audit log)
3. Cascading deletes (parent + all children)
4. Any operation where partial success = data corruption

```typescript
// ✓ CORRECT - Register creates org + user atomically
export async function register(data: RegisterData) {
  return await db.transaction(async (tx) => {
    const [org] = await tx.insert(organisations)
      .values({ name: data.orgName })
      .returning();

    const [user] = await tx.insert(users)
      .values({
        email: data.email,
        organisationId: org.id,  // Depends on org
        role: 'admin',
      })
      .returning();

    return { org, user };
  });
}

// ✗ DEPLOYMENT BLOCKER - No transaction
const [org] = await db.insert(organisations).values({...}).returning();
const [user] = await db.insert(users).values({ orgId: org.id }).returning();
// If user insert fails, orphan org remains in database!

// ✓ CORRECT - Delete with cascading
export async function deleteEntity(entityId: number) {
  await db.transaction(async (tx) => {
    // Delete children first, then parent
    await tx.delete(relatedItems).where(eq(relatedItems.entityId, entityId));
    await tx.delete(entities).where(eq(entities.id, entityId));
  });
}
```

**When Transactions Are NOT Needed:**
- Single table operations (one insert/update/delete)
- Read-only operations (SELECT queries)
- Independent operations

---

### PHASE 3: VALIDATION

After implementation, validate against ALL specifications:

**API Validation** - Compare every endpoint against API Contract (04):
- ☐ Response envelope format matches exactly (using helpers)
- ☐ Error codes match registry
- ☐ Pagination on all list endpoints
- ☐ Rate limit headers present (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset)
- ☐ **HTTP methods match API Contract** (PATCH vs PUT vs POST)
- ☐ **Route paths match character-for-character**
- ☐ **All endpoints from API Contract implemented** (count check)

**Security Validation** - Verify all security requirements in Architecture (02):
- ☐ Helmet middleware configured
- ☐ CORS origin-restricted in production
- ☐ Rate limiting on all routes (stricter on auth)
- ☐ JWT tokens have expiration
- ☐ Passwords hashed with bcrypt (cost >= 10)
- ☐ **OAuth tokens encrypted before storage** (if OAuth present)
- ☐ **No TODO comments in auth/encryption paths**

**Database Validation** - Confirm schema matches Data Model (03):
- ☐ All entities present with correct columns
- ☐ All relationships defined
- ☐ Audit columns (createdAt, updatedAt) present
- ☐ Type exports match schema

**UI Validation** - Check all screens/states against UI/UX Specification (05):
- ☐ All pages from PRD Page Inventory implemented
- ☐ **AcceptInvitePage exists if invitation endpoints present**
- ☐ All screen states (loading, empty, error, success) handled
- ☐ shadcn/ui components used consistently
- ☐ Accessibility requirements met

**Platform Verification** - Complete all platform-specific checks in QA & Deployment (07):
- ☐ **Vite watch has ALL 5 settings** (usePolling, interval, ignored, host, port)
- ☐ **Vite watch.ignored includes node_modules, .git, dist**
- ☐ **CSS framework syntax matches Tailwind version**
- ☐ Environment variables classified correctly
- ☐ No interactive CLI prompts in any commands
- ☐ **Drizzle commands have --force flags**

**Code Quality Verification:**
- ☐ **All routes use parseIntParam() for URL parameters**
- ☐ **All routes use response helpers (no direct res.json())**
- ☐ **All route paths have / before : parameters**
- ☐ **All auth endpoints present (9 total, including PATCH /profile)**
- ☐ **Email service uses conditional pattern (doesn't crash if key missing)**
- ☐ **Invitation flow handles both paths (with/without token)**
- ☐ **No mock/placeholder data in endpoints**

**Deployment Prep** - Follow deployment checklist in QA & Deployment (07).

---

## CRITICAL RULES

**Specs are source of truth** - Do not deviate. If something seems wrong, implement anyway and note concern.

**Follow the order** - Implementation Plan tasks are dependency-ordered. Do not skip ahead.

**Match schemas exactly** - API responses, database schema, error formats must match specs precisely.

**All states matter** - Every UI screen has multiple states. Implement ALL.

**Infrastructure first** - Error handling, validation, security middleware, logging in place before features.

**Audit patterns are mandatory** - Every single pattern above must be followed. They prevent real production failures.

**Platform compatibility** - Follow Architecture doc's Replit requirements exactly. Review QA & Deployment verification before considering build complete.

**No invention** - Do not add features, endpoints, screens not specified. If something appears missing, check all specs first.

**Driver compatibility** - Use postgres-js driver, NOT @neondatabase/serverless. Replit deployment requirement.

**Zero-tolerance rules** - parseIntParam usage, response helpers, route syntax, encryption (if OAuth), no TODOs in security paths.

---

## SELF-VERIFICATION COMMANDS

Run these before considering build complete:

```bash
# Route syntax check
grep -rE "[a-zA-Z0-9]:[a-zA-Z]" server/routes/ --include="*.ts"
# Expected: No matches

# parseIntParam usage check
grep -rn "parseInt(req.params" server/routes/ --include="*.ts"
# Expected: No matches

# Response helper enforcement
grep -rn "res\.json" server/routes/ --include="*.ts" | grep -v "sendSuccess\|sendCreated\|sendPaginated"
# Expected: No matches

# Encryption implementation (if OAuth)
ls server/lib/encryption.ts
# Expected: File exists if OAuth present

# Vite watch configuration
grep -A 10 "watch:" vite.config.ts | grep "ignored:"
# Expected: Match found with node_modules

# Auth page completeness
ls client/src/pages/auth/accept-invite.tsx
# Expected: File exists if invitation endpoints present

# Endpoint count
api_count=$(grep -E "^\| [0-9]+ \|" docs/04-API-CONTRACT.md | wc -l)
route_count=$(grep -rn "router\.(get|post|patch|put|delete)" server/routes/ | wc -l)
echo "API: $api_count, Routes: $route_count"
# Expected: Counts match
```

---

## FINAL PHASE: CODE REVIEW (CONDITIONAL)

**Check Configuration:** AUTO_RUN_AGENT_8 = false

### If AUTO_RUN_AGENT_8 = false (CURRENT DEFAULT)

**Do NOT run Agent 8 automatically.**

After completing all implementation:
1. Run self-verification commands above
2. Validate against all specs
3. Declare build complete
4. Inform user: "Build complete. Agent 8 (Code Review) was not run automatically (AUTO_RUN_AGENT_8 = false). To validate code quality, manually run Agent 8 Code Review prompt."

**Rationale:** This tests whether Agent 6 Implementation Plan patterns prevent issues during initial code creation. If patterns work correctly, Agent 8 should find zero or minimal issues.

### If AUTO_RUN_AGENT_8 = true (OPTIONAL SAFETY NET)

**After completing all implementation:**
1. Run self-verification commands above
2. **Automatically invoke Agent 8 Code Review**
   - Agent 8 audits complete codebase
   - Detects pattern violations
   - Reports findings
3. **If Agent 8 finds CRITICAL or HIGH issues:**
   - Fix issues automatically
   - Re-run Agent 8 verification
   - Repeat until clean
4. Declare build complete with audit results

**Note:** When enabled, this creates safety net but prevents testing whether Agent 6 patterns alone are sufficient.

---

## START NOW

**Begin by:**
1. Listing files in repository root to locate all spec files (01-07)
2. Creating `/docs` folder and moving all spec files into it
3. Reading and understanding full application from specs
4. **Checking Architecture for OAuth → encryption required**
5. **Checking UI Spec for AcceptInvitePage requirement**
6. Creating project scaffolding per Implementation Plan
7. **Creating ALL mandatory infrastructure** (parseIntParam, response helpers, encryption if needed)
8. Implementing tasks in order **applying all 15 audit patterns**
9. Running self-verification commands
10. Validating against all specs
11. **Checking AUTO_RUN_AGENT_8 configuration and following Final Phase instructions**

**Do not ask for confirmation at each step.** Work autonomously through entire build. Only stop if you encounter blocking issue requiring input.

**Every audit pattern matters.** They prevent real production failures.

**Go.**
