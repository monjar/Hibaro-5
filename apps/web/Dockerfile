# Heliora player web app (Next.js) — built from the npm-workspace monorepo.
# Build context is the repository root.
FROM node:20-slim

WORKDIR /app

# NEXT_PUBLIC_* values are inlined at build time, so the API URL must be
# present as a build argument (passed by the deploy workflow).
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

COPY . .
RUN npm install --no-audit --no-fund

# Build the shared packages (the web app imports @heliora/platform-sdk),
# then build the Next.js app.
RUN npm run build:packages \
  && npm run build --workspace=apps/web

ENV NODE_ENV=production
# `next start -p 3001` (see apps/web/package.json)
EXPOSE 3001

CMD ["npm", "run", "start", "--workspace=apps/web"]
