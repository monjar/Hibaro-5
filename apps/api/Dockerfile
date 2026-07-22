# Heliora API (NestJS) — built from the npm-workspace monorepo.
# Build context is the repository root.
FROM node:20-slim

WORKDIR /app

# OpenSSL is required by the Prisma engine at runtime.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Install all workspace dependencies (dev deps included — the Nest CLI, the
# Prisma CLI, and ts-node are needed for the build and the release step).
COPY . .
RUN npm install --no-audit --no-fund

# Build the shared packages, generate the Prisma client, then build the API.
RUN npm run build:packages \
  && npx prisma generate --schema=prisma/schema.prisma \
  && npm run build --workspace=apps/api

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Migrations + first-time seed run via Fly's release_command (see fly/api.toml),
# which executes this same image before the new version goes live.
CMD ["npm", "run", "start", "--workspace=apps/api"]
