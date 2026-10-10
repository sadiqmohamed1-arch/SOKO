-- Rollback for migration 02 — identity.
-- DESTROYS profiles and platform-admin grants. auth.users is NOT touched.
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists private.handle_new_user();
drop table if exists public.platform_admins cascade;
drop table if exists public.profiles cascade;
drop function if exists private.is_platform_admin();
