# --- Build stage ---
FROM node:20-alpine AS builder
WORKDIR /app

# OpenSSL is required by Prisma's query engine on Alpine.
RUN apk add --no-cache openssl libc6-compat

COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY . .

# Prisma needs DATABASE_URL at build time only to generate the client.
ENV DATABASE_URL="file:./data/app.db"
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate
RUN npm run build

# --- Runtime stage ---
FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache openssl libc6-compat tini \
 && addgroup -S app && adduser -S app -G app

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATABASE_URL=file:/app/data/app.db \
    UPLOAD_DIR=/app/data/uploads

# Standalone Next.js output keeps the runtime image tiny.
COPY --from=builder --chown=app:app /app/.next/standalone ./
COPY --from=builder --chown=app:app /app/.next/static ./.next/static
COPY --from=builder --chown=app:app /app/public ./public
COPY --from=builder --chown=app:app /app/prisma ./prisma
COPY --from=builder --chown=app:app /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=app:app /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=app:app /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=app:app /app/scripts ./scripts
# tsx runtime + minimal node_modules subset needed only when SEED=1.
COPY --from=builder --chown=app:app /app/node_modules/tsx ./node_modules/tsx
COPY --from=builder --chown=app:app /app/node_modules/esbuild ./node_modules/esbuild
COPY --from=builder --chown=app:app /app/node_modules/get-tsconfig ./node_modules/get-tsconfig
COPY --from=builder --chown=app:app /app/node_modules/resolve-pkg-maps ./node_modules/resolve-pkg-maps
COPY --chown=app:app docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh \
 && mkdir -p /app/data/uploads && chown -R app:app /app/data

USER app
EXPOSE 3000
VOLUME ["/app/data"]
ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "server.js"]
