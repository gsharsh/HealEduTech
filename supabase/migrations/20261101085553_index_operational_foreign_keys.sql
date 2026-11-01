-- Add full foreign-key indexes for history, joins and account-retention checks.
-- Keep existing active-loan partial indexes: they serve different query shapes.
-- Equivalent full indexes introduced outside migrations are deliberately reused.
-- This changes no records, permissions, lending policy or deletion semantics.
do $$
declare
  target record;
  table_id oid;
  column_number smallint;
begin
  for target in select * from (values
    ('reading_records', 'book_id', 'reading_records_book_id_idx'),
    ('loans', 'borrower_user_id', 'loans_borrower_user_id_idx'),
    ('loans', 'copy_id', 'loans_copy_id_idx'),
    ('loans', 'checked_out_by', 'loans_checked_out_by_idx'),
    ('loans', 'resolved_by', 'loans_resolved_by_idx'),
    ('circulation_events', 'loan_id', 'circulation_events_loan_id_idx'),
    ('circulation_events', 'actor_user_id', 'circulation_events_actor_user_id_idx'),
    ('circulation_borrowers', 'registered_by', 'circulation_borrowers_registered_by_idx'),
    ('circulation_policy', 'updated_by', 'circulation_policy_updated_by_idx'),
    ('staff_members', 'granted_by', 'staff_members_granted_by_idx'),
    ('staff_admin_bootstrap', 'used_by', 'staff_admin_bootstrap_used_by_idx'),
    ('loan_contacts', 'actor_user_id', 'loan_contacts_actor_user_id_idx')
  ) as targets(table_name, column_name, index_name)
  loop
    table_id := format('public.%I', target.table_name)::regclass;
    select a.attnum into column_number from pg_catalog.pg_attribute a
      where a.attrelid = table_id and a.attname = target.column_name and not a.attisdropped;
    if column_number is null then
      raise exception 'Expected foreign-key column %.% is missing', target.table_name, target.column_name;
    end if;

    if not exists (
      select 1 from pg_catalog.pg_index i
      join pg_catalog.pg_class c on c.oid = i.indexrelid
      join pg_catalog.pg_am am on am.oid = c.relam
      where i.indrelid = table_id and i.indisvalid and i.indisready
        and i.indpred is null and i.indnkeyatts >= 1
        and i.indkey[0] = column_number and am.amname in ('btree', 'hash')
    ) then
      -- A conflicting name with a different definition should fail for review,
      -- rather than silently leave a foreign key unindexed.
      execute format('create index %I on public.%I (%I)', target.index_name, target.table_name, target.column_name);
    end if;
  end loop;
end;
$$;
