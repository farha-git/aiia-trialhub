-- Create safe default profiles for users that existed before the profile trigger.
-- Existing users receive CRC; only an ADMIN may later assign an elevated role.

insert into public.profiles (id, full_name, email, role)
select
  users.id,
  nullif(users.raw_user_meta_data ->> 'full_name', ''),
  users.email,
  'CRC'::public.app_role
from auth.users as users
on conflict (id) do nothing;