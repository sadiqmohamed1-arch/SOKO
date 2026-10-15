-- Manual / staging approval tests for handle_new_user identity metadata copy.
-- Run only on iqzvlsgwphmjuornlbmj after the pending migration is applied.
-- Does not delete production data; uses clearly named QA emails.

-- Expect: profile gets professional_classification + username from metadata.
-- (Execute as a privileged role that can insert into auth.users in staging.)

/*
Example verification after applying the pending migration:

select id, full_name, professional_classification, username
from public.profiles
where full_name like 'QA1B Pending%'
order by full_name;

Expected for a new auth user created with:
  raw_user_meta_data = {
    "full_name": "QA1B Pending Buyer",
    "professional_classification": "Procurement / Buyer",
    "username": "qa1b.pending.buyer.a"
  }
→ professional_classification = 'Procurement / Buyer'
→ username = 'qa1b.pending.buyer.a'

Duplicate username insert should still create the auth user + profile with username null.
*/
select 'pending migration tests are documentation-only until applied' as note;
