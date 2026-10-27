# ==============================================================
# AIIMS Backend Multi-Stage Production Dockerfile
# ==============================================================

# --------------------------------------------------------------
# Stage 1: Build & Compile TypeScript
# --------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies (including devDependencies needed for tsc build)
RUN npm ci

# Copy source code and TypeScript config
COPY tsconfig.json ./
COPY src/ ./src/

# Compile TypeScript into JavaScript (dist/)
RUN npm run build

# --------------------------------------------------------------
# Stage 2: Production Runtime
# --------------------------------------------------------------
FROM node:20-alpine AS runner

# Explicit production environment
ENV NODE_ENV=production
ENV PORT=5001

WORKDIR /app

# Install wget for container healthchecks
RUN apk --no-cache add wget

# Copy dependency manifests
COPY package*.json ./

# Install ONLY production dependencies and clean cache
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled JavaScript distribution from builder stage
COPY --from=builder /app/dist ./dist

# Set ownership to unprivileged non-root node user (UID 1000)
RUN chown -R node:node /app

# Run as non-root user for principle of least privilege
USER node

# Expose backend service port
EXPOSE 5001

# Container healthcheck using internal /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5001/health || exit 1

# Start the compiled production server
CMD ["node", "dist/server.js"]
