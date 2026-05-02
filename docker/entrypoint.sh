#!/bin/sh
# =============================================================================
# Runtime env injection para variáveis NEXT_PUBLIC_*
#
# Por que isso existe:
#   No Next.js, qualquer variável `NEXT_PUBLIC_*` é "baked-in" no JS do client
#   no momento do `next build`. Para que a mesma imagem Docker possa ser usada
#   com Supabase / domínios diferentes (sem rebuild), construímos a imagem com
#   valores PLACEHOLDER fixos e substituímos por sed aqui no start.
#
# Variáveis injetadas:
#   - NEXT_PUBLIC_SUPABASE_URL
#   - NEXT_PUBLIC_SUPABASE_ANON_KEY
#   - NEXT_PUBLIC_APP_URL
#
# Mantenha alinhado com o Dockerfile (mesmos placeholders).
# =============================================================================
# Sem `set -e`: queremos tolerar falhas pontuais e seguir pro `node server.js`.

PLACE_URL="RUNTIME_SUPABASE_URL_PLACEHOLDER"
PLACE_KEY="RUNTIME_SUPABASE_ANON_KEY_PLACEHOLDER"
PLACE_APP="RUNTIME_APP_URL_PLACEHOLDER"

VAL_URL="${NEXT_PUBLIC_SUPABASE_URL:-}"
VAL_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}"
VAL_APP="${NEXT_PUBLIC_APP_URL:-}"

if [ -z "$VAL_URL" ] || [ -z "$VAL_KEY" ]; then
  echo "[entrypoint] AVISO: NEXT_PUBLIC_SUPABASE_URL ou _ANON_KEY vazios."
  echo "[entrypoint] Edite a stack no Portainer e reinicie o container."
fi

# Marcador em /tmp (sempre escritível pra qualquer user). Restarts subsequentes
# pulam o find+sed se já foi aplicado nesta camada de fs.
MARKER=/tmp/.clinica-runtime-env-applied

if [ ! -f "$MARKER" ]; then
  echo "[entrypoint] aplicando NEXT_PUBLIC_* nos assets estáticos..."
  # `|` como separator do sed pra não conflitar com `/` em URLs.
  # `|| true` defensivo: não queremos que um arquivo problemático mate o
  # entrypoint e gere loop de restart no Docker.
  find /app/.next/static /app/.next/server /app/public -type f \
    \( -name "*.js" -o -name "*.json" -o -name "*.html" -o -name "*.mjs" \) \
    -exec sed -i \
      -e "s|${PLACE_URL}|${VAL_URL}|g" \
      -e "s|${PLACE_KEY}|${VAL_KEY}|g" \
      -e "s|${PLACE_APP}|${VAL_APP}|g" \
      {} + 2>/dev/null || true
  touch "$MARKER" 2>/dev/null || true
  echo "[entrypoint] OK."
else
  echo "[entrypoint] runtime env já aplicado neste container, pulando."
fi

exec node server.js
