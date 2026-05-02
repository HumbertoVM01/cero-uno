-- v0.1.8 · Remove technical deploy memory
-- The Archivo section is now holistic memory in the frontend, not a deploy changelog in Neon.
drop table if exists deploy_changelog cascade;
