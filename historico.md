# Histórico — Refator do módulo Evolução (clones de Anamnese)

Memória de continuidade. Cada fase é marcada como concluída ao final.

## Escopo

- **Configurações → Evolução** (nova aba): gerencia fichas de evolução em PDF (mesmo fluxo do Anamnese).
- **Paciente → Evolução** deixa de ter formulário livre. Vira lista de submissões baseadas nas fichas escolhidas, com modo Desktop e Interativo (idêntico ao Anamnese).
- A tabela legacy `clinic.evolutions` é preservada (não migra dados), mas a nova UI usa `clinic.evolution_submissions`.

---

## Fases

### Fase 1 — Banco ✅
- [x] Migration: `supabase/migrations/20260502120000_evolution_templates_and_submissions.sql`
- [x] `database.types.ts` atualizado

### Fase 2 — Storage helper ✅
- [x] `buildEvolutionTemplateStoragePath` e `buildEvolutionSubmissionStoragePath` em `lib/clinical/storage.ts`

### Fase 3 — Server actions ✅
- [x] `lib/evolutions/template-actions.ts`
- [x] `lib/evolutions/submission-actions.ts` (com flatten próprio + footer "Registrado por")

### Fase 4 — Refator dos editores compartilhados ✅
- [x] DesktopAnamnesisEditor aceita `entityKind: "anamnesis" | "evolution"`
- [x] InteractiveAnamnesisEditor idem (+ backHref dinâmico)
- [x] AnamnesisSubmissionsPanel parametrizado com COPY_BY_KIND

### Fase 5 — UI: Configurações > Evolução ✅
- [x] `/configuracoes/evolucao/page.tsx`
- [x] `/configuracoes/evolucao/[templateId]/page.tsx` (usa TemplateFieldDesigner com entityKind="evolution")
- [x] `components/evolutions/evolution-templates-manager.tsx`
- [x] Subnav "Evolução" entre Anamnese e Contratos

### Fase 6 — UI: Paciente > Evolução (refeita) ✅
- [x] `app/(dashboard)/pacientes/[clientId]/evolucao/page.tsx` reescrito
- [x] Reusa `AnamnesisSubmissionsPanel` com `entityKind="evolution"`
- [x] Rota interativa: `app/evolucao/interativa/[clientId]/[submissionId]/page.tsx`

### Fase 7 — Verificação ✅
- [x] Typecheck limpo
- [x] Build limpo (todas as 4 rotas novas geradas)

---

## ⚠️ Para colocar em produção

1. **Aplicar migration no Supabase**: `supabase/migrations/20260502120000_evolution_templates_and_submissions.sql`
2. Em **Configurações › Evolução**, fazer upload da(s) ficha(s) PDF.
3. Abrir o designer em cada uma e marcar os campos (texto, sim/não, assinatura, etc.).
4. No paciente, aba **Evolução**, escolher uma ficha e preencher (modo desktop ou tablet/interativo).
