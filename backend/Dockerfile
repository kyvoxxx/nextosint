# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
# Install OpenSSL for Prisma
RUN apk add --no-cache openssl
# We assume the build context is the root directory to grab shared/ + backend/
COPY backend/package.json backend/package-lock.json ./backend/
RUN cd backend && npm ci

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=deps /app/backend/node_modules ./backend/node_modules
# Copy shared and backend source
COPY shared ./shared
COPY backend ./backend

WORKDIR /app/backend
# Generate Prisma Client
RUN npx prisma generate
# Build the TypeScript code
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app/backend
RUN apk add --no-cache openssl
ENV NODE_ENV production

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 backenduser

# Copy over production dependencies, schema, and compiled code
COPY --from=builder --chown=backenduser:nodejs /app/backend/package.json /app/backend/package-lock.json ./
# For simplicity, we just copy the entire node_modules since it includes the generated Prisma client. It could be optimized with `npm ci --production` + regenerate.
COPY --from=builder --chown=backenduser:nodejs /app/backend/node_modules ./node_modules
COPY --from=builder --chown=backenduser:nodejs /app/backend/dist ./dist
COPY --from=builder --chown=backenduser:nodejs /app/backend/prisma ./prisma

USER backenduser

EXPOSE 4000
ENV PORT 4000
ENV HOST 0.0.0.0

CMD ["node", "dist/backend/src/index.js"]
