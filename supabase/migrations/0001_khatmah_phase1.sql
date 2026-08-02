-- Khatmah Phase 1 MVP schema, RLS, and RPC functions.
-- Run this whole file in the Supabase SQL editor (or via `supabase db push`
-- once a Supabase CLI project is initialized) against the project referenced
-- by src/environments/environment.ts (supabase.url).
--
-- Prerequisite: environment.ts's `supabase.anonKey` must be the real anon/public
-- key (Dashboard -> Settings -> API), not a service_role key, before the app
-- is wired up to rely on the RLS grants below.

create extension if not exists pgcrypto;

-- ============================================================================
-- 1. Tables
-- ============================================================================

create table khatmahs (
  id                           uuid primary key default gen_random_uuid(),
  slug                         text not null unique, -- random 10-hex-char; acts as the access secret for private khatmahs
  title                        text not null check (char_length(trim(title)) between 1 and 120),
  description                  text,
  intention                    text, -- النية
  is_public                    boolean not null default true,
  start_date                   date,
  end_date                     date,
  theme_color                  text default '#0a3327',
  image_url                    text,
  total_parts                  smallint not null default 30 check (total_parts = 30),
  status                       text not null default 'active' check (status in ('active', 'closed')),
  owner_token                  uuid not null default gen_random_uuid(), -- returned once at creation; never SELECT-granted to anon
  reservation_timeout_minutes  int not null default 120,
  created_at                   timestamptz not null default now(),
  closed_at                    timestamptz,
  constraint khatmahs_date_order check (start_date is null or end_date is null or start_date <= end_date)
);
create index idx_khatmahs_public_active on khatmahs (created_at desc) where is_public = true and status = 'active';

create table participants (
  id                 uuid primary key default gen_random_uuid(),
  khatmah_id         uuid not null references khatmahs (id) on delete cascade,
  participant_token  uuid not null, -- localStorage-generated UUID identifying this browser
  display_name       text not null check (char_length(trim(display_name)) between 1 and 60),
  created_at         timestamptz not null default now(),
  unique (khatmah_id, participant_token)
);

create table parts (
  id                    uuid primary key default gen_random_uuid(),
  khatmah_id            uuid not null references khatmahs (id) on delete cascade,
  part_number           smallint not null check (part_number between 1 and 30), -- joins quran_ayahs.jozz at query time; no FK
  status                text not null default 'available' check (status in ('available', 'reserved', 'reading', 'completed')),
  participant_id        uuid references participants (id) on delete set null,
  reader_display_name   text, -- denormalized so parts can be public-readable without exposing participants
  reserved_at           timestamptz,
  started_at            timestamptz,
  completed_at          timestamptz,
  progress_percent      smallint not null default 0 check (progress_percent between 0 and 100),
  last_page             int,
  updated_at            timestamptz not null default now(),
  unique (khatmah_id, part_number)
);
create index idx_parts_khatmah_status on parts (khatmah_id, status);
create index idx_parts_participant on parts (participant_id);

create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger trg_parts_touch before update on parts for each row execute function touch_updated_at();

create table activity (
  id                      bigint generated always as identity primary key,
  khatmah_id              uuid not null references khatmahs (id) on delete cascade,
  part_number             smallint,
  participant_id          uuid references participants (id) on delete set null,
  display_name_snapshot   text,
  action                  text not null check (
                            action in (
                              'khatmah_created', 'reserved', 'started_reading', 'completed',
                              'released', 'admin_released', 'auto_released', 'khatmah_closed'
                            )
                          ),
  meta                    jsonb not null default '{}'::jsonb,
  created_at              timestamptz not null default now()
);
create index idx_activity_khatmah_created on activity (khatmah_id, created_at desc);

-- Existing table, no DDL change beyond a supporting index for the reader.
create index if not exists idx_quran_ayahs_jozz_page on quran_ayahs (jozz, page, id);

-- ============================================================================
-- 2. Row Level Security
-- ============================================================================
-- No Supabase Auth session exists in this feature, so RLS predicates can't
-- check auth.uid(). All writes go through SECURITY DEFINER RPCs below; base
-- tables grant the anon role SELECT only (and participants not even that).
-- Authorization is enforced inside the RPC bodies via caller-supplied tokens.

alter table khatmahs enable row level security;
alter table participants enable row level security;
alter table parts enable row level security;
alter table activity enable row level security;
alter table quran_ayahs enable row level security;

create policy khatmahs_select on khatmahs for select to anon using (true);
revoke all on khatmahs from anon;
grant select (
  id, slug, title, description, intention, is_public, start_date, end_date,
  theme_color, image_url, total_parts, status, reservation_timeout_minutes,
  created_at, closed_at
) on khatmahs to anon; -- owner_token deliberately excluded from the grant

revoke all on participants from anon; -- no anon policy at all -> default-deny; only RPCs touch this table

create policy parts_select on parts for select to anon using (true);
revoke all on parts from anon;
grant select on parts to anon;

create policy activity_select on activity for select to anon using (true);
revoke all on activity from anon;
grant select on activity to anon;

-- Verify there's no pre-existing conflicting policy on quran_ayahs before running this
-- (select * from pg_policies where tablename = 'quran_ayahs';).
create policy quran_ayahs_select on quran_ayahs for select to anon using (true);
grant select on quran_ayahs to anon;

-- ============================================================================
-- 3. RPC functions
-- ============================================================================

create or replace function release_expired_reservations(p_khatmah_id uuid default null)
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count int;
begin
  with expired as (
    update parts p
    set status = 'available', participant_id = null, reader_display_name = null,
        reserved_at = null, last_page = null
    from khatmahs k
    where k.id = p.khatmah_id
      and p.status = 'reserved'
      and p.reserved_at < now() - make_interval(mins => k.reservation_timeout_minutes)
      and (p_khatmah_id is null or p.khatmah_id = p_khatmah_id)
    returning p.khatmah_id, p.part_number
  )
  insert into activity (khatmah_id, part_number, action)
  select khatmah_id, part_number, 'auto_released' from expired;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function create_khatmah(
  p_title text,
  p_description text,
  p_intention text,
  p_is_public boolean,
  p_start_date date,
  p_end_date date,
  p_theme_color text,
  p_image_url text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_slug text;
  v_attempts int := 0;
  v_khatmah khatmahs%rowtype;
begin
  if char_length(trim(p_title)) not between 1 and 120 then
    raise exception 'INVALID_TITLE';
  end if;

  loop
    -- gen_random_bytes lives in pgcrypto, which Supabase installs into the `extensions`
    -- schema, not `public` — schema-qualified here since this function's search_path is
    -- deliberately restricted to public, pg_temp (hardening against search-path hijacking).
    v_slug := encode(extensions.gen_random_bytes(5), 'hex'); -- 10 lowercase hex chars, e.g. 'a3f9c1e02b'
    exit when not exists (select 1 from khatmahs where slug = v_slug);
    v_attempts := v_attempts + 1;
    if v_attempts > 10 then
      raise exception 'SLUG_GENERATION_FAILED';
    end if;
  end loop;

  insert into khatmahs (
    slug, title, description, intention, is_public, start_date, end_date, theme_color, image_url
  ) values (
    v_slug, trim(p_title), p_description, p_intention, coalesce(p_is_public, true),
    p_start_date, p_end_date, coalesce(p_theme_color, '#0a3327'), p_image_url
  )
  returning * into v_khatmah;

  insert into parts (khatmah_id, part_number)
  select v_khatmah.id, gs from generate_series(1, 30) gs;

  insert into activity (khatmah_id, action)
  values (v_khatmah.id, 'khatmah_created');

  -- Only place owner_token is ever returned to a caller.
  return to_jsonb(v_khatmah);
end;
$$;

create or replace function join_khatmah(
  p_khatmah_id uuid,
  p_participant_token uuid,
  p_display_name text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_khatmah khatmahs%rowtype;
  v_participant participants%rowtype;
begin
  select * into v_khatmah from khatmahs where id = p_khatmah_id;
  if not found or v_khatmah.status <> 'active' then
    raise exception 'KHATMAH_CLOSED';
  end if;
  if char_length(trim(p_display_name)) not between 1 and 60 then
    raise exception 'INVALID_DISPLAY_NAME';
  end if;

  insert into participants (khatmah_id, participant_token, display_name)
  values (p_khatmah_id, p_participant_token, trim(p_display_name))
  on conflict (khatmah_id, participant_token)
  do update set display_name = excluded.display_name
  returning * into v_participant;

  return jsonb_build_object('id', v_participant.id, 'display_name', v_participant.display_name);
end;
$$;

-- The concurrency-critical operation: atomic compare-and-swap on parts.status.
-- Postgres locks the target row while evaluating WHERE + applying the UPDATE as one
-- indivisible step. A concurrent second call for the same row blocks on the row lock
-- until the first commits, then re-evaluates WHERE against the now-committed row --
-- status is no longer 'available', so it matches nothing and RETURNING yields no row.
-- No separate SELECT ... FOR UPDATE is needed since everything happens in one statement
-- inside one function call (no application logic runs between the lock and the write).
create or replace function reserve_part(
  p_khatmah_id uuid,
  p_part_number int,
  p_participant_token uuid,
  p_display_name text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_khatmah khatmahs%rowtype;
  v_participant_id uuid;
  v_part parts%rowtype;
begin
  perform release_expired_reservations(p_khatmah_id); -- sweep this khatmah first so a stale row never blocks a real reservation

  select * into v_khatmah from khatmahs where id = p_khatmah_id;
  if not found or v_khatmah.status <> 'active' then
    raise exception 'KHATMAH_CLOSED';
  end if;
  if char_length(trim(p_display_name)) not between 1 and 60 then
    raise exception 'INVALID_DISPLAY_NAME';
  end if;

  insert into participants (khatmah_id, participant_token, display_name)
  values (p_khatmah_id, p_participant_token, trim(p_display_name))
  on conflict (khatmah_id, participant_token)
  do update set display_name = excluded.display_name
  returning id into v_participant_id;

  update parts
  set status = 'reserved',
      participant_id = v_participant_id,
      reader_display_name = trim(p_display_name),
      reserved_at = now(),
      started_at = null,
      progress_percent = 0,
      last_page = null
  where khatmah_id = p_khatmah_id
    and part_number = p_part_number
    and status = 'available'
  returning * into v_part;

  if v_part.id is null then
    raise exception 'PART_UNAVAILABLE';
  end if;

  insert into activity (khatmah_id, part_number, participant_id, display_name_snapshot, action)
  values (p_khatmah_id, p_part_number, v_participant_id, trim(p_display_name), 'reserved');

  return to_jsonb(v_part);
end;
$$;

-- Shared ownership check used by start_reading / update_progress / complete_part / release_part:
-- resolves the part's participant_id to a participants row whose token matches the caller's.
create or replace function assert_owns_part(p_part_id uuid, p_participant_token uuid, out v_part parts)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  select p.* into v_part
  from parts p
  join participants pt on pt.id = p.participant_id
  where p.id = p_part_id and pt.participant_token = p_participant_token;

  if v_part.id is null then
    raise exception 'NOT_YOUR_RESERVATION';
  end if;
end;
$$;

create or replace function start_reading(
  p_part_id uuid,
  p_participant_token uuid
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_owned parts;
  v_part parts%rowtype;
begin
  select * into v_owned from assert_owns_part(p_part_id, p_participant_token);
  if v_owned.status <> 'reserved' then
    raise exception 'WRONG_STATE';
  end if;

  update parts
  set status = 'reading', started_at = now()
  where id = p_part_id
  returning * into v_part;

  insert into activity (khatmah_id, part_number, participant_id, display_name_snapshot, action)
  values (v_part.khatmah_id, v_part.part_number, v_part.participant_id, v_part.reader_display_name, 'started_reading');

  return to_jsonb(v_part);
end;
$$;

create or replace function update_progress(
  p_part_id uuid,
  p_participant_token uuid,
  p_progress_percent int,
  p_last_page int default null
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_owned parts;
  v_part parts%rowtype;
begin
  select * into v_owned from assert_owns_part(p_part_id, p_participant_token);
  if v_owned.status <> 'reading' then
    raise exception 'WRONG_STATE';
  end if;

  update parts
  set progress_percent = greatest(0, least(100, p_progress_percent)),
      last_page = coalesce(p_last_page, last_page)
  where id = p_part_id
  returning * into v_part;

  return to_jsonb(v_part);
end;
$$;

create or replace function complete_part(
  p_part_id uuid,
  p_participant_token uuid
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_owned parts;
  v_part parts%rowtype;
begin
  select * into v_owned from assert_owns_part(p_part_id, p_participant_token);
  if v_owned.status not in ('reading', 'reserved') then
    raise exception 'WRONG_STATE';
  end if;

  update parts
  set status = 'completed', progress_percent = 100, completed_at = now()
  where id = p_part_id
  returning * into v_part;

  insert into activity (khatmah_id, part_number, participant_id, display_name_snapshot, action)
  values (v_part.khatmah_id, v_part.part_number, v_part.participant_id, v_part.reader_display_name, 'completed');

  return to_jsonb(v_part);
end;
$$;

create or replace function release_part(
  p_part_id uuid,
  p_participant_token uuid
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_owned parts;
  v_part parts%rowtype;
begin
  select * into v_owned from assert_owns_part(p_part_id, p_participant_token);
  if v_owned.status not in ('reserved', 'reading') then
    raise exception 'WRONG_STATE';
  end if;

  update parts
  set status = 'available', participant_id = null, reader_display_name = null,
      reserved_at = null, started_at = null, progress_percent = 0, last_page = null
  where id = p_part_id
  returning * into v_part;

  insert into activity (khatmah_id, part_number, action)
  values (v_part.khatmah_id, v_part.part_number, 'released');

  return to_jsonb(v_part);
end;
$$;

create or replace function admin_release_part(
  p_part_id uuid,
  p_owner_token uuid
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_part parts%rowtype;
begin
  select p.* into v_part
  from parts p
  join khatmahs k on k.id = p.khatmah_id
  where p.id = p_part_id and k.owner_token = p_owner_token;

  if v_part.id is null then
    raise exception 'FORBIDDEN';
  end if;

  update parts
  set status = 'available', participant_id = null, reader_display_name = null,
      reserved_at = null, started_at = null, progress_percent = 0, last_page = null
  where id = p_part_id
  returning * into v_part;

  insert into activity (khatmah_id, part_number, action)
  values (v_part.khatmah_id, v_part.part_number, 'admin_released');

  return to_jsonb(v_part);
end;
$$;

create or replace function close_khatmah(
  p_khatmah_id uuid,
  p_owner_token uuid
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_khatmah khatmahs%rowtype;
begin
  select * into v_khatmah from khatmahs where id = p_khatmah_id and owner_token = p_owner_token;
  if v_khatmah.id is null then
    raise exception 'FORBIDDEN';
  end if;
  if v_khatmah.status = 'closed' then
    raise exception 'ALREADY_CLOSED';
  end if;

  update khatmahs
  set status = 'closed', closed_at = now()
  where id = p_khatmah_id
  returning * into v_khatmah;

  insert into activity (khatmah_id, action)
  values (v_khatmah.id, 'khatmah_closed');

  return to_jsonb(v_khatmah);
end;
$$;

grant execute on function
  create_khatmah(text, text, text, boolean, date, date, text, text),
  join_khatmah(uuid, uuid, text),
  reserve_part(uuid, int, uuid, text),
  start_reading(uuid, uuid),
  update_progress(uuid, uuid, int, int),
  complete_part(uuid, uuid),
  release_part(uuid, uuid),
  admin_release_part(uuid, uuid),
  close_khatmah(uuid, uuid),
  release_expired_reservations(uuid)
to anon;

-- ============================================================================
-- 4. Realtime
-- ============================================================================
alter publication supabase_realtime add table parts, activity, khatmahs;
