-- MUSEO DE ALLIVES — destructive reset.
-- This intentionally removes the previous 0100011011/Cero Uno application tables and the new ALLIVE tables.
-- Run only when you are ready to permanently clear the old application data.

drop function if exists refresh_allive_windows();
drop function if exists caress_allive(uuid, text, text);

drop table if exists game_scores cascade;
drop table if exists visitor_presence cascade;
drop table if exists visitor_caress_state cascade;
drop table if exists allive_caress_minute cascade;
drop table if exists allives cascade;

drop table if exists field_cycles cascade;
drop table if exists social_sync_runs cascade;
drop table if exists social_comments cascade;
drop table if exists social_posts cascade;
drop table if exists signals cascade;
drop table if exists zero_one_tap_daily cascade;
drop table if exists tap_guard cascade;
drop table if exists zero_ones cascade;
create extension if not exists pgcrypto;

create table if not exists allives (
  id uuid primary key default gen_random_uuid(),
  subject_name text not null check (char_length(trim(subject_name)) between 1 and 80),
  exhibited_by text check (exhibited_by is null or char_length(trim(exhibited_by)) between 1 and 60),

  body_asset text not null,
  top_asset text not null,
  left_arm_asset text not null,
  right_arm_asset text not null,
  left_leg_asset text not null,
  right_leg_asset text not null,
  left_eye_asset text not null,
  right_eye_asset text not null,
  scent_id text not null,

  total_caresses bigint not null default 0 check (total_caresses >= 0),
  caresses_24h bigint not null default 0 check (caresses_24h >= 0),
  caresses_7d bigint not null default 0 check (caresses_7d >= 0),
  caresses_30d bigint not null default 0 check (caresses_30d >= 0),
  caresses_365d bigint not null default 0 check (caresses_365d >= 0),

  random_key double precision not null default random(),
  created_at timestamptz not null default now(),
  last_caressed_at timestamptz,

  unique (
    body_asset, top_asset, left_arm_asset, right_arm_asset,
    left_leg_asset, right_leg_asset, left_eye_asset, right_eye_asset, scent_id
  )
);

create index if not exists allives_total_rank_idx on allives (total_caresses desc, created_at asc, id asc);
create index if not exists allives_24h_rank_idx on allives (caresses_24h desc, total_caresses desc, created_at asc, id asc) where caresses_24h > 0;
create index if not exists allives_7d_rank_idx on allives (caresses_7d desc, total_caresses desc, created_at asc, id asc) where caresses_7d > 0;
create index if not exists allives_30d_rank_idx on allives (caresses_30d desc, total_caresses desc, created_at asc, id asc) where caresses_30d > 0;
create index if not exists allives_365d_rank_idx on allives (caresses_365d desc, total_caresses desc, created_at asc, id asc) where caresses_365d > 0;
create index if not exists allives_recent_idx on allives (created_at desc, id desc);
create index if not exists allives_random_idx on allives (random_key, id);

-- One compact row per ALLIVE/minute. The row remains until it has aged out of the 365-day window.
create table if not exists allive_caress_minute (
  allive_id uuid not null references allives(id) on delete cascade,
  minute_at timestamptz not null,
  caress_count bigint not null default 0 check (caress_count >= 0),
  expired_24h boolean not null default false,
  expired_7d boolean not null default false,
  expired_30d boolean not null default false,
  expired_365d boolean not null default false,
  primary key (allive_id, minute_at)
);

create index if not exists caress_minute_expiry_idx on allive_caress_minute (minute_at);

-- Global one-second caress cadence per anonymous browser token.
create table if not exists visitor_caress_state (
  visitor_hash text primary key,
  next_allowed_at timestamptz not null default now(),
  last_action_id text,
  updated_at timestamptz not null default now()
);

create index if not exists visitor_caress_state_updated_idx on visitor_caress_state (updated_at);

create table if not exists visitor_presence (
  visitor_hash text primary key,
  last_seen_at timestamptz not null default now()
);

create index if not exists visitor_presence_seen_idx on visitor_presence (last_seen_at desc);

-- Atomic caress operation. The ALLIVE cooldown is global to the visitor, not per ALLIVE.
create or replace function caress_allive(
  p_allive_id uuid,
  p_visitor_hash text,
  p_action_id text
)
returns table(accepted boolean, next_allowed_at timestamptz, total_caresses bigint, caresses_24h bigint, caresses_7d bigint, caresses_30d bigint, caresses_365d bigint)
language plpgsql
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_next timestamptz;
  v_last_action text;
begin
  insert into visitor_caress_state(visitor_hash, next_allowed_at, last_action_id, updated_at)
  values (p_visitor_hash, v_now, null, v_now)
  on conflict (visitor_hash) do nothing;

  select vcs.next_allowed_at, vcs.last_action_id
    into v_next, v_last_action
  from visitor_caress_state vcs
  where vcs.visitor_hash = p_visitor_hash
  for update;

  if v_last_action = p_action_id then
    return query
      select false, v_next, a.total_caresses, a.caresses_24h, a.caresses_7d, a.caresses_30d, a.caresses_365d
      from allives a where a.id = p_allive_id;
    return;
  end if;

  if v_now < v_next then
    return query
      select false, v_next, a.total_caresses, a.caresses_24h, a.caresses_7d, a.caresses_30d, a.caresses_365d
      from allives a where a.id = p_allive_id;
    return;
  end if;

  update visitor_caress_state
     set next_allowed_at = v_now + interval '1 second',
         last_action_id = p_action_id,
         updated_at = v_now
   where visitor_hash = p_visitor_hash;

  update allives
     set total_caresses = total_caresses + 1,
         caresses_24h = caresses_24h + 1,
         caresses_7d = caresses_7d + 1,
         caresses_30d = caresses_30d + 1,
         caresses_365d = caresses_365d + 1,
         last_caressed_at = v_now
   where id = p_allive_id;

  if not found then
    raise exception 'ALLIVE_NOT_FOUND';
  end if;

  insert into allive_caress_minute(allive_id, minute_at, caress_count)
  values (p_allive_id, date_trunc('minute', v_now), 1)
  on conflict (allive_id, minute_at)
  do update set caress_count = allive_caress_minute.caress_count + 1;

  return query
    select true,
           v_now + interval '1 second',
           a.total_caresses,
           a.caresses_24h,
           a.caresses_7d,
           a.caresses_30d,
           a.caresses_365d
      from allives a
     where a.id = p_allive_id;
end;
$$;

-- Runs once a minute. It removes buckets from the four moving windows without touching lifetime totals.
create or replace function refresh_allive_windows()
returns void
language plpgsql
as $$
begin
  perform pg_advisory_xact_lock(77331001);

  with due as (
    select allive_id, sum(caress_count)::bigint n
    from allive_caress_minute
    where not expired_24h and minute_at <= clock_timestamp() - interval '24 hours'
    group by allive_id
  )
  update allives a
     set caresses_24h = greatest(0, a.caresses_24h - due.n)
    from due where a.id = due.allive_id;

  update allive_caress_minute
     set expired_24h = true
   where not expired_24h and minute_at <= clock_timestamp() - interval '24 hours';

  with due as (
    select allive_id, sum(caress_count)::bigint n
    from allive_caress_minute
    where not expired_7d and minute_at <= clock_timestamp() - interval '7 days'
    group by allive_id
  )
  update allives a
     set caresses_7d = greatest(0, a.caresses_7d - due.n)
    from due where a.id = due.allive_id;

  update allive_caress_minute
     set expired_7d = true
   where not expired_7d and minute_at <= clock_timestamp() - interval '7 days';

  with due as (
    select allive_id, sum(caress_count)::bigint n
    from allive_caress_minute
    where not expired_30d and minute_at <= clock_timestamp() - interval '30 days'
    group by allive_id
  )
  update allives a
     set caresses_30d = greatest(0, a.caresses_30d - due.n)
    from due where a.id = due.allive_id;

  update allive_caress_minute
     set expired_30d = true
   where not expired_30d and minute_at <= clock_timestamp() - interval '30 days';

  with due as (
    select allive_id, sum(caress_count)::bigint n
    from allive_caress_minute
    where not expired_365d and minute_at <= clock_timestamp() - interval '365 days'
    group by allive_id
  )
  update allives a
     set caresses_365d = greatest(0, a.caresses_365d - due.n)
    from due where a.id = due.allive_id;

  update allive_caress_minute
     set expired_365d = true
   where not expired_365d and minute_at <= clock_timestamp() - interval '365 days';

  delete from allive_caress_minute
   where expired_365d and minute_at <= clock_timestamp() - interval '366 days';

  delete from visitor_presence where last_seen_at < clock_timestamp() - interval '10 minutes';
  delete from visitor_caress_state where updated_at < clock_timestamp() - interval '90 days';
end;
$$;

-- El Pedido leaderboard. Historical scoring versions stay in the database; the
-- public current leaderboard is versioned by score_version.
create table if not exists game_scores (
  id uuid primary key default gen_random_uuid(),
  round_id text not null unique check (char_length(round_id) between 8 and 120),
  visitor_hash text not null,
  alias text not null check (char_length(trim(alias)) between 1 and 20),
  score_version integer not null default 1 check (score_version > 0),
  target_id uuid references allives(id) on delete set null,
  memory_score smallint not null check (memory_score between 0 and 9),
  skill_score numeric(5,1) not null check (skill_score between 0 and 100),
  elapsed_ms bigint not null check (elapsed_ms between 5000 and 7200000),
  total_score integer not null check (total_score between 0 and 1000),
  speed_points numeric(6,2) not null check (speed_points between 0 and 100),
  mistakes jsonb not null,
  task_ids text[] not null,
  created_at timestamptz not null default clock_timestamp()
);
create index if not exists game_scores_total_idx on game_scores (score_version, total_score desc, memory_score desc, skill_score desc, elapsed_ms asc, created_at asc, id asc);
create index if not exists game_scores_parts_idx on game_scores (score_version, memory_score desc, skill_score desc, elapsed_ms asc, created_at asc, id asc);
create index if not exists game_scores_skill_idx on game_scores (score_version, skill_score desc, memory_score desc, elapsed_ms asc, created_at asc, id asc);
create index if not exists game_scores_time_idx on game_scores (score_version, elapsed_ms asc, skill_score desc, created_at asc, id asc);
create index if not exists game_scores_visitor_recent_idx on game_scores (visitor_hash, created_at desc);
