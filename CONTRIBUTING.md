# Contributing to NextOSINT

Thank you for your interest in contributing to NextOSINT! Whether you are reporting a bug, proposing a new feature, or submitting a pull request, your help is appreciated.

## Development Workflow

1. **Local Setup:** Follow the "Quick Start" guide in the `README.md` to run the development environment using Docker for the database infrastructure.
2. **Branching:** Create a descriptive branch for your work (e.g., `feat/url-aggregator-enhancement` or `fix/ssrf-bypass`).
3. **Strict Typing:** Ensure your changes adhere to strict TypeScript constraints. We use `zod` for all runtime validation and schema inference.
4. **Testing:** 
   - New aggregators must have `Vitest` unit tests mocking their respective 3rd party APIs.
   - Any new API endpoints require full integration tests utilizing `fastify.inject()`.
   - UI flows should be covered by `Playwright` E2E tests.
5. **Code Style:** Run `npm run lint` and `npm run format` locally before committing to ensure adherence to our ESLint and Prettier configs.

## Adding a New OSINT Source
1. Define the source's response schema in `shared/src/schemas`.
2. Create an interface handler in `backend/src/services/sources/`. 
3. Import and use the source inside the relevant aggregator (`backend/src/services/aggregator/`).
4. Update the Claude prompt guidelines (`backend/src/services/ai/prompts`) to instruct Claude on how to interpret the new source's JSON block.

## Security Disclosures
If you find a security vulnerability (e.g., a bypass of the SSRF implementation or an injection payload), do NOT open a public issue. Please submit a private security advisory through the GitHub repository settings.
