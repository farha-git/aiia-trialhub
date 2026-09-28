-- One-time owner action: assign full platform access to the specified account.
-- This must be run by the project owner in the Supabase SQL Editor.

update public.profiles
set role = 'ADMIN',
    updated_at = now()
where lower(email) = 'kishorhalole@gmail.com';

select id, email, role
from public.profiles
where lower(email) = 'kishorhalole@gmail.com';