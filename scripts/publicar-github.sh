#!/usr/bin/env bash
# Cria o repositório privado no GitHub (via gh) e envia a branch main.
# Rode no seu terminal (fora do CI): ./scripts/publicar-github.sh
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
export PATH="$HOME/.local/bin:$PATH"
# Em ambientes com CI=1 o gh exige GH_TOKEN; no terminal normal isso não aplica.
if ! env -u CI gh auth status -h github.com &>/dev/null; then
  echo "Autentique o GitHub CLI uma vez:"
  echo "  gh auth login -h github.com -p ssh --skip-ssh-key"
  exit 1
fi
if git remote get-url origin &>/dev/null; then
  echo "Remote origin já existe; enviando commits..."
  env -u CI git push -u origin main
else
  echo "Criando repositório privado hygorfragas/agenda-clinica e fazendo push..."
  env -u CI gh repo create agenda-clinica --private --source=. --remote=origin --push
fi
echo "Concluído."
