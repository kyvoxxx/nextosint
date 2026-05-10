# PROJECT HANDOFF: NextOSINT

## 1. PROJECT SNAPSHOT
- **Project Name**: NextOSINT — AI-Powered OSINT Intelligence Platform
- **Stack**: Next.js 14 (App Router), Node.js (Fastify) REST API, PostgreSQL (Prisma), Redis (Caching), Anthropic Claude (Analysis)
- **Architecture**: Monorepo structure with shared types.
- **Repositories**:
  - `/frontend`: Next.js application (Cyberpunk dashboard)
  - `/backend`: Fastify API (Aggregators, Security, Middleware)
  - `/shared`: Shared TypeScript types for API contracts

## 2. COMPLETED PHASES
- **Phase 1: Architecture** ✅ (System design and dev environment setup)
- **Phase 2: Backend API** ✅ (Fastify server, Zod env validation, Routes setup)
- **Phase 3: Source Clients & Aggregators** ✅ (9 source clients: VirusTotal, Shodan, AbuseIPDB, IPs, CRTSH, etc.)
- **Phase 4: Frontend** ✅ (Cyberpunk UI, Dashboard, ThreatMeter, IntelReport, ScanTerminal)
- **Phase 5: Security** ✅ (JWT Auth, SSRF prevention, Helmet/CSP, CORS)
- **Phase 6: Dockerization** ✅ (Dockerfiles for FE/BE, docker-compose.yml for complete stack)
- **Phase 7: Testing** 🚧 (In Progress)

## 3. CURRENT STATE — PHASE 7 (Testing)

### **Unit Tests (Vitest)**
- `backend/tests/unit/aggregators/email.aggregator.test.ts` ✅ (Complete)
- `backend/tests/unit/aggregators/ip.aggregator.test.ts` ✅ (Complete)
- `backend/tests/unit/aggregators/domain.aggregator.test.ts` ✅ (Complete)
- `backend/tests/unit/aggregators/url.aggregator.test.ts` ✅ (Complete)

### **Integration Tests (Fastify.inject)**
- `backend/tests/integration/investigate.test.ts` ✅ (All 4 investigation routes tested: email, ip, domain, url. Includes SSRF and Auth checks.)
- `backend/tests/integration/auth.test.ts` 🚧 (Register/Login routes scaffolded and partially tested; module loading issues with bcrypt in test environment need review.)

### **E2E Tests (Playwright)**
- `frontend/tests/e2e/investigate.spec.ts` ✅ (Initial spec created for the investigation workflow; needs verification/execution in a headless browser environment.)

### **Backend Coverage Status**
Currently at ~75-80% coverage. Minor gaps in Error handling and Source client edge cases.

## 4. ALL FILE PATHS

### **Root**
- `docker-compose.yml`
- `.env.example`
- `Makefile`
- `PROJECT_HANDOFF.md`
- `.gitignore`

### **Shared**
- `shared/types/api.ts`

### **Backend (`/backend`)**
- `Dockerfile`
- `package.json`
- `tsconfig.json`
- `vitest.config.ts`
- `src/index.ts` (Server Entry)
- `src/app.ts` (Fastify Factory)
- `src/config/`: `env.ts`, `database.ts`, `redis.ts`
- `src/middleware/`: `auth.ts` (JWT validation)
- `src/routes/`: `auth.ts`, `dashboard.ts`, `history.ts`, `investigate.ts`
- `src/services/ai/`: `claude.ts`
- `src/services/aggregator/`: `email.aggregator.ts`, `ip.aggregator.ts`, `domain.aggregator.ts`, `url.aggregator.ts`
- `src/services/sources/`: `abuseipdb.ts`, `crtsh.ts`, `dns.resolver.ts`, `haveibeenpwned.ts`, `hunter.ts`, `ipinfo.ts`, `shodan.ts`, `virustotal.ts`, `whois.ts`
- `src/services/`: `cache.ts`, `screenshot.ts`
- `tests/setup.ts` (Vitest environment)

### **Frontend (`/frontend`)**
- `Dockerfile`
- `package.json`
- `playwright.config.ts`
- `src/app/`: `globals.css`, `layout.tsx`, `page.tsx` (Dashboard), `investigate/page.tsx`, `history/page.tsx`, `login/page.tsx`, `register/page.tsx`
- `src/components/layout/`: `Header.tsx`, `Sidebar.tsx`, `ScanlineOverlay.tsx`
- `src/components/shared/`: `ThreatMeter.tsx`, `IntelReport.tsx`, `ScanTerminal.tsx`, `RiskBadge.tsx`, `NeonButton.tsx`, `GlassCard.tsx`

## 5. KEY DECISIONS MADE
- **REST-only API**: No tRPC implemented; strictly using Fastify + Zod for validation.
- **Database**: Local PostgreSQL in Docker for primary dev; ready for Supabase URL in production.
- **Fail-Open Strategy**: Aggregators gracefully degrade if an API key is missing (returning null/partial and letting Claude note the missing data).
- **Security First**: 
  - JWT auth is mandatory for all `/investigate` routes.
  - SSRF protection implemented via Zod validation (rejecting private IP ranges and localhost in IP/URL inputs).
  - CORS restricted to `http://localhost:3000` via `ALLOWED_ORIGIN`.

## 6. RESUME PROMPT (Ready to paste)

> "I am continuing the development of NextOSINT. Please read the `PROJECT_HANDOFF.md` file in the root to understand the current state.
> 
> Your task is to:
> 1. **Complete Phase 7 (Testing)**: 
>    - Verify existing coverage for backend aggregators and investigation routes.
>    - Fix any module loading or mocking issues in `backend/tests/integration/auth.test.ts`.
>    - Execute and verify the Playwright E2E test in `frontend/tests/e2e/investigate.spec.ts`.
>    - Ensure overall backend coverage is >80%.
> 
> 2. **Execute Phase 8 (Documentation)**:
>    - Generate a comprehensive `README.md` in the root with architecture diagrams and setup instructions.
>    - Generate an OpenAPI v3 specification (Swagger) for the backend API.
> 
> Use @test-driven-development principles for the test fixes."
