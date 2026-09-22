-- Hosted data migration assigning the confirmed owner account as application administrator.
-- Fresh local databases do not have hosted Auth users, so this is a no-op there.
do $$
begin
  if exists (select 1 from auth.users where lower(email) = 'gsharsh11235@gmail.com') then
    perform staff_private.assign_staff_from_dashboard(
      'gsharsh11235@gmail.com',
      'administrator',
      'gsharsh11235@gmail.com'
    );
  end if;
end;
$$;
