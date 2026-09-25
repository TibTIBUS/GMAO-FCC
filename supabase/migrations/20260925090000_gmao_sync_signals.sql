-- Contrôle léger des trois caches, respectant les RLS de l'utilisateur connecté.
-- Le nombre de lignes détecte les suppressions, même si max(date_modification)
-- reste inchangé. Aucune photo ni autre colonne métier ne sort du serveur.
create function public.gmao_sync_signals()
returns table (table_name text, row_count bigint, latest_modified timestamptz)
language sql stable security invoker
set search_path = ''
as $$
  select 'interventions'::text, count(*), max(date_modification)
  from public.interventions
  union all
  select 'preventif'::text, count(*), max(date_modification)
  from public.preventif
  union all
  select 'conseils_machine'::text, count(*), max(date_modification)
  from public.conseils_machine;
$$;

revoke all on function public.gmao_sync_signals() from public, anon;
grant execute on function public.gmao_sync_signals() to authenticated;
