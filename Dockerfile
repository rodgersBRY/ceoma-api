# ── Stage 1: Builder ────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Build tools required to compile argon2 native bindings
RUN apk add --no-cache python3 make g++

COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

RUN npm ci

# Generate Prisma client for the current schema.
# prisma.config.ts calls env("DATABASE_URL") eagerly, so a placeholder is
# required here — prisma generate never connects to the database.
RUN DATABASE_URL=postgresql://build:build@localhost/build npx prisma generate

COPY tsconfig.json ./
COPY src ./src/

RUN npm run build

# ── Stage 2: Runner ──────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Runtime libraries needed by the argon2 native module
RUN apk add --no-cache libstdc++

# Copy node_modules wholesale — preserves compiled native modules (argon2)
# and keeps the prisma CLI available for `migrate deploy` (it's a devDep)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

COPY package*.json ./

EXPOSE 4000

# Run pending migrations then start the server
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && node dist/server.js"]
