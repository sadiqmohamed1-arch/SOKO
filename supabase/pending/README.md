# Pending migrations (approval required)

SQL here is **not** applied automatically. Review, approve, then move into
`supabase/migrations/` and apply on staging (`iqzvlsgwphmjuornlbmj`) only.

| File | Purpose |
|------|---------|
| `20261016000100_handle_new_user_identity_metadata.sql` | Copy `professional_classification` / `username` from signup `raw_user_meta_data` into `profiles` at user creation (complements client sync for email-confirm signups). |
