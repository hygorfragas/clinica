-- Aplicar no SQL Editor do Supabase (projeto remoto) se aparecer:
-- "Could not find the function public.clinic_bootstrap_status without parameters"
--
-- Pré-requisito: schema `clinic` e tabela `clinic.profiles` já existirem
-- (migração 20260321195600_initial_multitenant_clinic_schema.sql).

create or replace function public.clinic_bootstrap_status()
returns jsonb
language sql
stable
security definer
set search_path = public, clinic
as $$
  select jsonb_build_object(
    'has_platform_super_admin',
    exists (select 1 from clinic.profiles p where p.role = 'platform_super_admin'),
    'signup_open',
    not exists (select 1 from clinic.profiles p where p.role = 'platform_super_admin')
  );
$$;

grant execute on function public.clinic_bootstrap_status() to anon, authenticated;

comment on function public.clinic_bootstrap_status() is
  'has_platform_super_admin: já existe super admin; signup_open: ainda permite primeiro cadastro.';
