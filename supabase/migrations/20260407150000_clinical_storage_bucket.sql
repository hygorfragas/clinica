-- Bucket privado para fotos clínicas, PDFs e imagens de assinatura.
-- Caminho obrigatório: {tenant_id}/{client_id}/{categoria}/{arquivo}
-- RLS do Storage alinhada ao tenant do perfil (clinic.profiles).

drop policy if exists clinical_objects_select on storage.objects;
drop policy if exists clinical_objects_insert on storage.objects;
drop policy if exists clinical_objects_update on storage.objects;
drop policy if exists clinical_objects_delete on storage.objects;

-- Limite e MIME podem ser ajustados no painel Storage; a app também valida tipo e tamanho.
insert into storage.buckets (id, name, public)
values ('clinical', 'clinical', false)
on conflict (id) do update set public = excluded.public;

create policy clinical_objects_select
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'clinical'
    and split_part(name, '/', 1) = (
      select p.tenant_id::text
      from clinic.profiles p
      where p.id = auth.uid()
    )
  );

create policy clinical_objects_insert
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'clinical'
    and split_part(name, '/', 1) = (
      select p.tenant_id::text
      from clinic.profiles p
      where p.id = auth.uid()
    )
  );

create policy clinical_objects_update
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'clinical'
    and split_part(name, '/', 1) = (
      select p.tenant_id::text
      from clinic.profiles p
      where p.id = auth.uid()
    )
  )
  with check (
    bucket_id = 'clinical'
    and split_part(name, '/', 1) = (
      select p.tenant_id::text
      from clinic.profiles p
      where p.id = auth.uid()
    )
  );

create policy clinical_objects_delete
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'clinical'
    and split_part(name, '/', 1) = (
      select p.tenant_id::text
      from clinic.profiles p
      where p.id = auth.uid()
    )
  );
