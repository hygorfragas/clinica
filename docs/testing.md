# Testes

<!-- specsfy:documentator:start -->
## Resumo

- Arquivos de teste: 0.
- Runner: não identificado.
- Scripts: dev: next dev -p 3000; build: next build; start: next start; typecheck: tsc --noEmit; postinstall: node scripts/copy-pdf-worker.mjs; pdf:copy-worker: node scripts/copy-pdf-worker.mjs; db:apply-clinical-bucket: node scripts/apply-clinical-storage-bucket.mjs; docker:push: bash scripts/docker-release.sh.

| Arquivo |
| --- |
| Nenhum teste identificado |
<!-- specsfy:documentator:end -->

## Complemento auditado

Não há runner nem suíte automatizada identificados. O gate executável atual é
`npm run typecheck`; para mudanças de build ou runtime, também executar
`npm run build`. Alterações de migrations exigem validação em banco descartável,
teste negativo de RLS com outro tenant e regeneração/conferência dos tipos.

Antes de release ou PR, validar ainda o diff, ausência de segredos e o fluxo
Docker `linux/amd64`. A introdução de Vitest ou outro runner depende de decisão
explícita e deve ser registrada antes de criar testes.
