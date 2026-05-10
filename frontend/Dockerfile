# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
# We assume the build context is the root directory
COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN cd frontend && npm ci

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/frontend/node_modules ./frontend/node_modules
# Copy shared and frontend source
COPY shared ./shared
COPY frontend ./frontend

WORKDIR /app/frontend
# Disable telemetry during build
ENV NEXT_TELEMETRY_DISABLED 1
# Remove playwright and tests as they require devDependencies (which are excluded by NODE_ENV=production in later stages, but here npm ci installed them? Actually npm ci installed everything, but we skip compiling tests)
RUN rm -rf playwright.config.ts tests
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app/frontend
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built assets
COPY --from=builder /app/frontend/public ./public
# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/frontend/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/frontend/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
