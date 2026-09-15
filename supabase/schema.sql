-- Flipora / ClickFlip Supabase backend schema
-- Run this file once in Supabase Dashboard -> SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  plan text not null default 'free' check (plan in ('free','starter','plus','unlimited')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.albums (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled Album',
  status text not null default 'draft' check (status in ('draft','completed','purchased','archived')),
  share_slug text unique,
  share_enabled boolean not null default false,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists albums_user_id_idx on public.albums(user_id);
create index if not exists albums_share_slug_idx on public.albums(share_slug);

alter table public.profiles enable row level security;
alter table public.albums enable row level security;

-- Profiles: each signed-in user can only read/update their own profile.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
to authenticated
using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- Albums: owner-only CRUD.
drop policy if exists "albums_select_own" on public.albums;
create policy "albums_select_own"
on public.albums for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "albums_insert_own" on public.albums;
create policy "albums_insert_own"
on public.albums for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "albums_update_own" on public.albums;
create policy "albums_update_own"
on public.albums for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "albums_delete_own" on public.albums;
create policy "albums_delete_own"
on public.albums for delete
to authenticated
using (auth.uid() = user_id);

-- Public viewer can only read albums explicitly published by their owner.
drop policy if exists "albums_public_read_published" on public.albums;
create policy "albums_public_read_published"
on public.albums for select
to anon, authenticated
using (share_enabled = true and status = 'completed' and share_slug is not null);

-- Keep a profile in sync when a new Auth user registers.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, plan)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', ''),
    case
      when new.raw_user_meta_data->>'plan' in ('free','starter','plus','unlimited')
        then new.raw_user_meta_data->>'plan'
      else 'free'
    end
  )
  on conflict (id) do update
    set name = excluded.name,
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Public media bucket for the MVP. Paths are randomized and uploads/deletes are restricted
-- to the authenticated user's own top-level folder. For stricter production privacy,
-- migrate originals to a private bucket and publish controlled preview derivatives.
insert into storage.buckets (id, name, public, file_size_limit)
values ('album-media', 'album-media', true, 52428800)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit;

-- storage.foldername(name)[1] is the first folder, which this app sets to auth.uid().
drop policy if exists "album_media_insert_own" on storage.objects;
create policy "album_media_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'album-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "album_media_update_own" on storage.objects;
create policy "album_media_update_own"
on storage.objects for update
to authenticated
using (
  bucket_id = 'album-media'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'album-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "album_media_delete_own" on storage.objects;
create policy "album_media_delete_own"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'album-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Explicit table privileges used by the Supabase Data API.
grant select, insert, update, delete on public.albums to authenticated;
grant select on public.albums to anon;
grant select, update on public.profiles to authenticated;
