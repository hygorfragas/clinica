# syntax=docker/dockerfile:1.7
#
# Multi-stage build do Next.js (output: "standalone") com runtime env
# injection para NEXT_PUBLIC_*. Build "uma vez", configura no Portainer,
# reinicia. Sem `--build-arg`.
#
# Build:
#   docker build -t SEU_USUARIO/sistema-agenda-clinicas:latest .
#
# Push:
#   docker push SEU_USUARIO/sistema-agenda-clinicas:latest
#
# A substituição dos NEXT_PUBLIC_* acontece no entrypoint do container
# (docker/entrypoint.sh) na primeira start, lendo do `environment:` da stack.

# =============================================================================
# 1) deps
# =============================================================================
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY package.json package-lock.json* .npmrc* ./
# `--ignore-scripts` pula o postinstall (copia o pdf-worker) — fazemos isso
# explicitamente no estágio builder, depois de copiar o `public/`.
# `--legacy-peer-deps` também vem do .npmrc (`legacy-peer-deps=true`), por
# causa do conflito conhecido entre @schedule-x/calendar e temporal-polyfill.
RUN npm ci --no-audit --no-fund --ignore-scripts

# =============================================================================
# 2) builder
# =============================================================================
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Placeholders fixos — substituídos no entrypoint do container em runtime,
# usando os valores definidos no docker-compose / Portainer. Mantenha em
# sincronia com docker/entrypoint.sh.
ENV NEXT_PUBLIC_SUPABASE_URL="RUNTIME_SUPABASE_URL_PLACEHOLDER"
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY="RUNTIME_SUPABASE_ANON_KEY_PLACEHOLDER"
ENV NEXT_PUBLIC_APP_URL="RUNTIME_APP_URL_PLACEHOLDER"
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Copia o worker do pdfjs para /public/pdf-worker (o postinstall foi pulado).
RUN node scripts/copy-pdf-worker.mjs

RUN npm run build

# =============================================================================
# 3) runner
# =============================================================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Usuário não-root.
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Entrypoint que injeta as NEXT_PUBLIC_* nos assets estáticos antes do start.
COPY --chown=nextjs:nodejs docker/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

USER nextjs
EXPOSE 3000

ENTRYPOINT ["/app/entrypoint.sh"]
