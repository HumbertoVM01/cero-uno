-- MUSEO DE ALLIVES — destructive reset.
-- This intentionally removes the previous 0100011011/Cero Uno application tables and the new ALLIVE tables.
-- Run only when you are ready to permanently clear the old application data.

drop function if exists refresh_allive_windows();
drop function if exists caress_allive(uuid, text, text);

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
