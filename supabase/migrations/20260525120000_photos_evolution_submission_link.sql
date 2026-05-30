-- Vincula uma foto clínica a uma submissão de evolução, para que o painel
-- de fotos do editor de evolução possa mostrar/filtrar as fotos enviadas
-- naquela sessão específica.
--
-- ON DELETE SET NULL: apagar a submissão preserva as fotos no prontuário,
-- apenas desvinculando-as da ficha.

alter table clinic.photos
  add column if not exists evolution_submission_id uuid
    references clinic.evolution_submissions (id) on delete set null;

create index if not exists photos_evolution_submission_idx
  on clinic.photos (tenant_id, evolution_submission_id);

comment on column clinic.photos.evolution_submission_id is
  'Submissão de evolução em que esta foto foi anexada (opcional). Permite agrupar fotos da sessão junto à ficha em PDF.';
