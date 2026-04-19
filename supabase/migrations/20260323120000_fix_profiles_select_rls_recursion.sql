-- Evita "infinite recursion detected in policy for relation profiles":
-- a política antiga usava sub-SELECT em clinic.profiles, que reaplicava a mesma política.

drop policy if exists profiles_select_visible on clinic.profiles;

create policy profiles_select_visible
  on clinic.profiles
  for select
  to authenticated
  using (
    id = auth.uid()
    or (
      tenant_id is not null
      and tenant_id = clinic.user_tenant_id()
    )
  );

comment on policy profiles_select_visible on clinic.profiles is
  'Própria linha ou colegas do mesmo tenant; usa user_tenant_id() (security definer) para não recursar em RLS.';
