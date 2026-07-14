# Stage 1: Base image and preparation
FROM node:24-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Stage 2: Install dependencies (both dev and prod dependencies)
FROM base AS deps
WORKDIR /app
# Install build tools required to compile native packages (e.g. bcrypt)
RUN apk add --no-cache python3 make g++
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Stage 3: Compilation and generation
FROM deps AS build
WORKDIR /app
COPY . .
# Run Prisma generator to output client files into src/generated/prisma
RUN pnpm prisma generate
# Compile TS codebase to dist/
RUN pnpm build
# Copy generated Prisma query engines and other client assets to the compilation target
RUN mkdir -p dist/generated/prisma && cp -r src/generated/prisma/* dist/generated/prisma/
# Prune node_modules to contain only production dependencies
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm prune --prod

# Stage 4: Production runner
FROM node:24-alpine AS runner
WORKDIR /app
# Install dumb-init for correct signal propagation (PID 1)
RUN apk add --no-cache dumb-init

# Create a dedicated non-root system user and group
RUN addgroup -S workly && adduser -S workly -G workly

# Copy compiled files, production node_modules, and runtime configuration
COPY --from=build --chown=workly:workly /app/dist ./dist
COPY --from=build --chown=workly:workly /app/node_modules ./node_modules
COPY --from=build --chown=workly:workly /app/package.json ./package.json

# Expose target port
EXPOSE 5000

ENV NODE_ENV=production
ENV PORT=5000

# Switch to the non-root user
USER workly

# Healthcheck to query health status endpoint (Node 24 native fetch)
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://localhost:5000/api/v1/public/status/health').then(r => { if (!r.ok) process.exit(1) }).catch(() => process.exit(1))"

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "dist/server.js"]
