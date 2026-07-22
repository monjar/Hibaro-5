# Heliora admin control plane (Next.js, served under /admin) — built from the
# npm-workspace monorepo. Build context is the repository root.
FROM node:20-slim

WORKDIR /app

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

COPY . .
RUN npm install --no-audit --no-fund

RUN npm run build:packages \
  && npm run build --workspace=apps/admin

ENV NODE_ENV=production
# `next start -p 3002` (see apps/admin/package.json)
EXPOSE 3002

CMD ["npm", "run", "start", "--workspace=apps/admin"]
