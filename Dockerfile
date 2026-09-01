# ==========================================
# Stage 1: Build & Bundle
# ==========================================
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies if needed
RUN apk add --no-cache libc6-compat

# Leverage Docker layer caching for npm packages
COPY package.json package-lock.json ./
RUN npm ci

# Copy full application source
COPY . .

# Run validation & production build (Vite + esbuild)
RUN npm run lint && npm run test && npm run build

# Prune devDependencies to keep production layer lean
RUN npm prune --production

# ==========================================
# Stage 2: Minimal Production Runtime
# ==========================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Security: Run as non-root user
USER node

# Copy production artifacts and slim node_modules
COPY --chown=node:node --from=builder /app/package.json ./package.json
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/data-store.json* ./

# Port 3000 ingress
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Launch bundled CommonJS server
CMD ["node", "dist/server.cjs"]
