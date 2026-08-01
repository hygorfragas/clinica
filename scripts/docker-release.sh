#!/usr/bin/env bash
# Build e push da imagem de produção (linux/amd64) a partir de Mac Apple Silicon.
# Uso:
#   ./scripts/docker-release.sh 1.0.5
#   npm run docker:push -- 1.0.5
#
# Produção (Portainer/VPS) é linux/amd64. `docker build` no Mac ARM gera arm64
# e falha no deploy com: "no matching manifest for linux/amd64".

set -euo pipefail

IMAGE_REPO="${DOCKER_IMAGE_REPO:-hygorfragas/clinica}"
BUILDER_NAME="${DOCKER_BUILDX_BUILDER:-clinica-builder}"
PLATFORM="${DOCKER_PLATFORM:-linux/amd64}"

if [[ "${1:-}" == "" ]]; then
  echo "Uso: $0 <versão-semver>   ex.: $0 1.0.5" >&2
  exit 1
fi

VERSION="$1"
TAG="${IMAGE_REPO}:${VERSION}"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker não encontrado no PATH." >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Buildx builder (${BUILDER_NAME})"
if ! docker buildx inspect "${BUILDER_NAME}" >/dev/null 2>&1; then
  docker buildx create --name "${BUILDER_NAME}" --use
else
  docker buildx use "${BUILDER_NAME}"
fi

echo "==> Build + push ${TAG} (${PLATFORM})"
docker buildx build \
  --platform "${PLATFORM}" \
  -t "${TAG}" \
  --push \
  .

echo ""
echo "OK: ${TAG} publicada para ${PLATFORM}"
echo "Verifique: docker buildx imagetools inspect ${TAG}"
echo "Portainer: image: ${TAG}"
