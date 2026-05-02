# Fase 5 — Inventário de cleanup Supabase SDK

## Objetivo
Remover `@supabase/ssr` e `@supabase/supabase-js` do runtime do app após concluir a migração para stack local (Postgres + MinIO), sem regressão funcional.

## Progresso da FLO-20 (2026-05-02)
- `lib/supabase/service.ts` migrado para `createServerClient` de `@supabase/ssr` (sem import direto de `@supabase/supabase-js`).
- Imports diretos de `@supabase/supabase-js` removidos em:
  - `app/auth/callback/page.tsx` (tipo OTP local)
  - `lib/supabase/clinic.ts` (tipagem via wrapper interno)
- `.env.example` atualizado para refletir stack local (Postgres + MinIO) e marcar variáveis Supabase como legado transitório.
- Dependência direta `@supabase/supabase-js` removida do `package.json` (permanece apenas transitive via `@supabase/ssr`).

## Pendente para encerramento da fase
- Remover `@supabase/ssr` do runtime após migração completa de auth/sessão.
- Validar `rg -n "supabase|@supabase" app lib components middleware.ts` sem hits de runtime relevante.
