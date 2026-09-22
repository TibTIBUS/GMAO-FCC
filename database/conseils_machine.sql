-- Module "Conseils machines" pour la GMAO FCC.
-- Les conseils constituent une base de connaissances partagée entre les
-- utilisateurs authentifiés, comme les interventions et le préventif.

create table if not exists public.conseils_machine (
  id uuid primary key default gen_random_uuid(),
  titre text not null check (char_length(btrim(titre)) > 0),
  machine text not null check (char_length(btrim(machine)) > 0),
  zone text not null check (char_length(btrim(zone)) > 0),
  categorie text not null default 'Fonctionnement'
    check (categorie in (
      'Démarrage', 'Réinitialisation', 'Réglage', 'Nettoyage',
      'Dépannage', 'Sécurité', 'Fonctionnement', 'Autre'
    )),
  situation text not null default '',
  procedure text not null check (char_length(btrim(procedure)) > 0),
  securite text not null default '',
  mots_cles text[] not null default '{}',
  photos text[] not null default '{}',
  auteur text not null default '',
  date_creation timestamptz not null default now(),
  date_modification timestamptz not null default now()
);

create index if not exists conseils_machine_machine_idx
  on public.conseils_machine (machine);
create index if not exists conseils_machine_zone_idx
  on public.conseils_machine (zone);
create index if not exists conseils_machine_date_modification_idx
  on public.conseils_machine (date_modification desc);

alter table public.conseils_machine enable row level security;

revoke all on table public.conseils_machine from anon;
grant select, insert, update, delete on table public.conseils_machine to authenticated;

drop policy if exists auth_read_conseils_machine on public.conseils_machine;
create policy auth_read_conseils_machine
  on public.conseils_machine for select
  to authenticated
  using (true);

drop policy if exists auth_insert_conseils_machine on public.conseils_machine;
create policy auth_insert_conseils_machine
  on public.conseils_machine for insert
  to authenticated
  with check (true);

drop policy if exists auth_update_conseils_machine on public.conseils_machine;
create policy auth_update_conseils_machine
  on public.conseils_machine for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists auth_delete_conseils_machine on public.conseils_machine;
create policy auth_delete_conseils_machine
  on public.conseils_machine for delete
  to authenticated
  using (true);

-- Photos privées : seuls les utilisateurs connectés peuvent les consulter
-- et les gérer. La table conserve uniquement les chemins des fichiers.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'conseils-machines',
  'conseils-machines',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists auth_read_conseils_photos on storage.objects;
create policy auth_read_conseils_photos
  on storage.objects for select
  to authenticated
  using (bucket_id = 'conseils-machines');

drop policy if exists auth_insert_conseils_photos on storage.objects;
create policy auth_insert_conseils_photos
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'conseils-machines');

drop policy if exists auth_update_conseils_photos on storage.objects;
create policy auth_update_conseils_photos
  on storage.objects for update
  to authenticated
  using (bucket_id = 'conseils-machines')
  with check (bucket_id = 'conseils-machines');

drop policy if exists auth_delete_conseils_photos on storage.objects;
create policy auth_delete_conseils_photos
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'conseils-machines');

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'conseils_machine'
  ) then
    alter publication supabase_realtime add table public.conseils_machine;
  end if;
end $$;

notify pgrst, 'reload schema';
