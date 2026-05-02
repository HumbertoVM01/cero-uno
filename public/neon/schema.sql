-- CERO UNO · Primer Deploy · Neon schema
-- Run this in the Neon SQL Editor before publishing the Netlify site.

create extension if not exists pgcrypto;

create table if not exists zero_ones (
  id uuid primary key default gen_random_uuid(),

  body_hex text not null check (body_hex ~ '^#[0-9A-Fa-f]{6}$'),
  top_hex text not null check (top_hex ~ '^#[0-9A-Fa-f]{6}$'),
  left_arm_hex text not null check (left_arm_hex ~ '^#[0-9A-Fa-f]{6}$'),
  right_arm_hex text not null check (right_arm_hex ~ '^#[0-9A-Fa-f]{6}$'),
  left_leg_hex text not null check (left_leg_hex ~ '^#[0-9A-Fa-f]{6}$'),
  right_leg_hex text not null check (right_leg_hex ~ '^#[0-9A-Fa-f]{6}$'),
  left_eye_hex text not null check (left_eye_hex ~ '^#[0-9A-Fa-f]{6}$'),
  right_eye_hex text not null check (right_eye_hex ~ '^#[0-9A-Fa-f]{6}$'),

  scent text not null default '' check (char_length(scent) <= 100),

  genome_code text generated always as (
    body_hex || '-' || top_hex || '-' || left_arm_hex || '-' || right_arm_hex || '-' ||
    left_leg_hex || '-' || right_leg_hex || '-' || left_eye_hex || '-' || right_eye_hex
  ) stored,

  -- Hash includes genome + normalized scent. Used to deduplicate published comparecencias.
  genome_hash text not null unique,

  parent_id uuid references zero_ones(id) on delete set null,
  root_id uuid references zero_ones(id) on delete set null,
  depth integer not null default 0 check (depth >= 0 and depth <= 32),
  mutation_type text not null default 'origin',
  mutation_diff jsonb not null default '{}'::jsonb,

  author_hash text,
  tap_count bigint not null default 0 check (tap_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists zero_ones_tap_count_idx on zero_ones (tap_count desc, created_at desc);
create index if not exists zero_ones_created_idx on zero_ones (created_at desc);
create index if not exists zero_ones_parent_idx on zero_ones (parent_id);
create index if not exists zero_ones_root_idx on zero_ones (root_id);

-- Anti-autoclicker guard: one tap per second per visitor hash per Cero Uno.
-- This is intentionally temporary. Keep aggregates, not every tap forever.
create table if not exists tap_guard (
  zero_one_id uuid not null references zero_ones(id) on delete cascade,
  voter_hash text not null,
  second_bucket bigint not null,
  created_at timestamptz not null default now(),
  primary key (zero_one_id, voter_hash, second_bucket)
);

create index if not exists tap_guard_cleanup_idx on tap_guard (created_at);

create table if not exists zero_one_tap_daily (
  zero_one_id uuid not null references zero_ones(id) on delete cascade,
  day date not null default current_date,
  tap_count bigint not null default 0 check (tap_count >= 0),
  primary key (zero_one_id, day)
);

create index if not exists zero_one_tap_daily_rank_idx on zero_one_tap_daily (day desc, tap_count desc);

create table if not exists signals (
  id uuid primary key default gen_random_uuid(),
  signal_type text not null,
  label text not null,
  weight numeric not null default 1,
  source text not null default 'system',
  created_at timestamptz not null default now()
);

create table if not exists deploy_changelog (
  id uuid primary key default gen_random_uuid(),
  deploy_version text not null,
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);

insert into deploy_changelog (deploy_version, title, body)
values
  ('v0.1.0', 'Primer Deploy', 'Nace la página viva: creador de Cero Unos, galería, taps, secuencia binaria universal, Laboratorio AEMP, Cámara de Origen y Archivo de Conceptos.'),
  ('v0.1.1', 'Regla de base de datos', 'Neon guarda comparecencias. El navegador sueña mutaciones. La secuencia anima el sueño.')
on conflict do nothing;

-- Optional cleanup job to run manually or via scheduled function later:
-- delete from tap_guard where created_at < now() - interval '24 hours';
