begin;

select 'TAP version 13';
select '1..14';

select case when to_regprocedure('public.update_financial_event_v2(uuid,uuid,numeric,uuid,date,text,timestamp with time zone)') is not null
  then 'ok 1 - RPC exists with the expected signature' else 'not ok 1 - RPC signature is missing' end;

select case when not coalesce((
  select prosecdef from pg_proc where oid = to_regprocedure('public.update_financial_event_v2(uuid,uuid,numeric,uuid,date,text,timestamp with time zone)')
), true) then 'ok 2 - RPC is security invoker' else 'not ok 2 - RPC must be security invoker' end;

select case when has_function_privilege(
  'authenticated', 'public.update_financial_event_v2(uuid,uuid,numeric,uuid,date,text,timestamp with time zone)', 'EXECUTE'
) then 'ok 3 - authenticated role can execute RPC' else 'not ok 3 - authenticated execute privilege is missing' end;

select case when not has_function_privilege(
  'anon', 'public.update_financial_event_v2(uuid,uuid,numeric,uuid,date,text,timestamp with time zone)', 'EXECUTE'
) then 'ok 4 - anonymous role cannot execute RPC' else 'not ok 4 - anonymous role can execute RPC' end;

select case when position('public.is_current_owner()' in pg_get_functiondef(
  to_regprocedure('public.update_financial_event_v2(uuid,uuid,numeric,uuid,date,text,timestamp with time zone)')
)) > 0 then 'ok 5 - RPC contains owner authorization guard' else 'not ok 5 - owner guard is missing' end;

select case when position('category.owner_id = actor' in pg_get_functiondef(
  to_regprocedure('public.update_financial_event_v2(uuid,uuid,numeric,uuid,date,text,timestamp with time zone)')
)) > 0 then 'ok 6 - category ownership is checked' else 'not ok 6 - category ownership check is missing' end;

select case when position('category.archived_at is null' in lower(pg_get_functiondef(
  to_regprocedure('public.update_financial_event_v2(uuid,uuid,numeric,uuid,date,text,timestamp with time zone)')
))) > 0 then 'ok 7 - archived categories are rejected' else 'not ok 7 - archived category check is missing' end;

select case when position('Category type mismatch' in pg_get_functiondef(
  to_regprocedure('public.update_financial_event_v2(uuid,uuid,numeric,uuid,date,text,timestamp with time zone)')
)) > 0 then 'ok 8 - category type mismatch is rejected' else 'not ok 8 - category type check is missing' end;

select case when position('Category is required' in pg_get_functiondef(
  to_regprocedure('public.update_financial_event_v2(uuid,uuid,numeric,uuid,date,text,timestamp with time zone)')
)) > 0 then 'ok 9 - expense and income require categories' else 'not ok 9 - required category check is missing' end;

select case when not exists (
  select 1 from pg_class
  where oid = any(array[
    'public.accounts'::regclass, 'public.categories'::regclass, 'public.financial_events'::regclass,
    'public.ledger_entries'::regclass, 'public.transfer_details'::regclass, 'public.investment_valuations'::regclass,
    'public.exchange_rates'::regclass, 'public.user_settings'::regclass, 'public.report_snapshots'::regclass
  ]) and not relrowsecurity
) then 'ok 10 - RLS is enabled on every financial table' else 'not ok 10 - a financial table lacks RLS' end;

select case when not exists (
  select 1 from pg_class
  where oid = any(array[
    'public.accounts'::regclass, 'public.categories'::regclass, 'public.financial_events'::regclass,
    'public.ledger_entries'::regclass, 'public.transfer_details'::regclass, 'public.investment_valuations'::regclass,
    'public.exchange_rates'::regclass, 'public.user_settings'::regclass, 'public.report_snapshots'::regclass
  ]) and not relforcerowsecurity
) then 'ok 11 - RLS is forced on every financial table' else 'not ok 11 - a financial table does not force RLS' end;

select case when not exists (
  select table_names.table_name, commands.command
  from unnest(array[
    'accounts','categories','financial_events','ledger_entries','transfer_details',
    'investment_valuations','exchange_rates','user_settings','report_snapshots'
  ]) as table_names(table_name)
  cross join unnest(array['SELECT','INSERT','UPDATE','DELETE']) as commands(command)
  where not exists (
    select 1 from pg_policies policy
    where policy.schemaname = 'public' and policy.tablename = table_names.table_name and policy.cmd = commands.command
  )
) then 'ok 12 - every financial table has CRUD RLS policies' else 'not ok 12 - a CRUD RLS policy is missing' end;

select case when not exists (
  select 1 from information_schema.role_table_grants
  where table_schema = 'public' and grantee = 'anon' and privilege_type in ('SELECT','INSERT','UPDATE','DELETE')
) then 'ok 13 - anonymous role has no financial table grants' else 'not ok 13 - anonymous financial table grant exists' end;

create temporary table rpc_authorization_probe (passed boolean not null) on commit drop;
grant insert on rpc_authorization_probe to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub', '90000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
do $probe$
begin
  begin
    perform public.update_financial_event_v2(
      '90000000-0000-0000-0000-000000000002',
      '90000000-0000-0000-0000-000000000003',
      1,
      null,
      current_date,
      '',
      now()
    );
    insert into rpc_authorization_probe values (false);
  exception
    when sqlstate '42501' then insert into rpc_authorization_probe values (true);
    when others then insert into rpc_authorization_probe values (false);
  end;
end
$probe$;
reset role;

select case when (select coalesce(bool_and(passed), false) from rpc_authorization_probe)
  then 'ok 14 - unauthorized authenticated RPC call is denied before data access'
  else 'not ok 14 - unauthorized authenticated RPC call was not denied as expected' end;

rollback;
