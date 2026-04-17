# Build the Next.js dashboard from the monorepo root.
# Build context must be the repo root (see docker-compose.yml) because
# pnpm-lock.yaml and pnpm-workspace.yaml live there.
FROM node:20-alpine

WORKDIR /app

# Copy workspace manifests first for better layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/dashboard/package.json apps/dashboard/package.json
COPY packages/sdk-node/package.json packages/sdk-node/package.json

RUN corepack enable && pnpm install --frozen-lockfile --filter @alrt/dashboard...

# Copy the dashboard source and build
COPY apps/dashboard apps/dashboard

ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

WORKDIR /app/apps/dashboard
RUN pnpm build

CMD ["pnpm", "start"]
