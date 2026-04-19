-- Vincula evolução clínica a procedimento e anexa fotos por evolução.
-- Também permite vincular foto a uma entrada de evolução específica.

alter table clinic.evolutions
  add column if not exists procedure_id uuid references clinic.procedures (id) on delete set null,
  add column if not exists purchase_id uuid references clinic.client_procedure_purchases (id) on delete set null,
  add column if not exists session_number integer,
  add column if not exists created_by_profile_id uuid references clinic.profiles (id) on delete set null;

create index if not exists evolutions_procedure_idx
  on clinic.evolutions (tenant_id, procedure_id);
create index if not exists evolutions_purchase_idx
  on clinic.evolutions (tenant_id, purchase_id);

alter table clinic.photos
  add column if not exists evolution_id uuid references clinic.evolutions (id) on delete set null;

create index if not exists photos_evolution_idx
  on clinic.photos (tenant_id, evolution_id);
