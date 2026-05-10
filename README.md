# NextOSINT

![NextOSINT Banner](./frontend/public/placeholder-banner.png)

[![Node.js Version](https://img.shields.io/badge/node_version-20.x-brightgreen.svg)](https://nodejs.org)
[![Next.js](https://img.shields.io/badge/Next.js-14-blue.svg)](https://nextjs.org/)
[![Fastify](https://img.shields.io/badge/Fastify-5.0-black.svg)](https://fastify.io/)
[![Playwright](https://img.shields.io/badge/Playwright-E2E-green.svg)](https://playwright.dev/)

NextOSINT is an advanced Open Source Intelligence (OSINT) aggregation platform. It automatically gathers intelligence on Emails, IPs, Domains, and URLs from various providers, then leverages Claude AI to generate a cohesive risk analysis and threat summary.

## Features
- **Unified Aggregation**: Gather data from HaveIBeenPwned, Hunter.io, VirusTotal, and WHOIS.
- **AI-Powered Analysis**: Claude (Anthropic) synthesizes raw data into natural language threat summaries, calculating a definitive risk score.
- **Fail-Open Strategy**: Individual source failures (e.g., rate limits, missing API keys) are gracefully degraded.
- **Enterprise Security**: JWT authentication, rate limiting, and exact SSRF protections against internal network probing.
- **Full-Stack Typescript**: Strict TS across Next.js 14 (Frontend) and Fastify (Backend).

## Quick Start (Development)

Ensure you have Node.js 20+ and Docker installed.

1. **Clone & Install**
   ```bash
   git clone https://github.com/yourusername/nextosint.git
   cd nextosint
   npm run bootstrap # OR manually run npm install in frontend, backend, and shared
   ```

2. **Run Architecture (PostgreSQL & Redis)**
   ```bash
   docker-compose up -d postgres redis
   ```

3. **Configure Environment**
   Set up your `.env` files based on the tables below.

4. **Database Setup**
   ```bash
   cd backend
   npm run db:push
   ```

5. **Start Dev Servers**
   ```bash
   # Terminal 1: Backend
   cd backend
   npm run dev

   # Terminal 2: Frontend
   cd frontend
   npm run dev
   ```

## Environment Variables

### Backend (`backend/.env`)
| Variable | Description | Required | Output |
| --- | --- | --- | --- |
| `NODE_ENV` | Environment (`development`, `production`, `test`) | Yes | `development` |
| `DATABASE_URL` | PostgreSQL connection string | Yes | `postgresql://...` |
| `REDIS_URL` | Redis connection string for rate limits & cache | Yes | `redis://localhost:6379` |
| `JWT_SECRET` | Secret used to sign Auth tokens | Yes | `>= 32 chars` |
| `ANTHROPIC_API_KEY` | Claude API key | Yes | `sk-ant-...` |
| `ALLOWED_ORIGIN` | Allowed CORS origin | Yes | `http://localhost:3000` |
| `HIBP_API_KEY` | HaveIBeenPwned API Key | No | |
| `HUNTER_API_KEY` | Hunter.io API Key | No | |

### Frontend (`frontend/.env.local`)
| Variable | Description | Required |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | Full URL to the Fastify Backend | Yes (default: `http://localhost:4000`) |

## API Endpoints Reference

A complete OpenAPI v3 spec is available at `/documentation/json` when the backend is running.

### Auth
- `POST /api/auth/register` - Register a new analyst
- `POST /api/auth/login` - Authenticate an analyst

### Investigation
*(Requires `Authorization: Bearer <token>`)*
- `POST /api/investigate/email` - `{ email: "target@example.com" }`
- `POST /api/investigate/ip` - `{ ip: "8.8.8.8" }` (No private IPs allowed)
- `POST /api/investigate/domain` - `{ domain: "example.com" }`
- `POST /api/investigate/url` - `{ url: "https://example.com" }` (SSRF protected)

## Testing
```bash
# Backend unit & integration tests (Vitest)
cd backend && npm run test

# Frontend E2E tests (Playwright)
cd frontend && npx playwright test
```

## Security Design
- **SSRF Prevention**: Strict Zod schemas explicitly block `127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, and `192.168.0.0/16` from being investigated to prevent internal port scanning.
- **Rate-Limiting**: Global rate-limits enforced by `@fastify/rate-limit` using Redis backing.
- **Helmet**: Applied strict CSP and security headers via `@fastify/helmet`.
