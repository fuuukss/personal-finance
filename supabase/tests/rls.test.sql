begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

select has_table('private','owner_allowlist','owner allowlist exists outside public schema');
select ok(not has_schema_privilege('authenticated','private','USAGE'),'authenticated cannot access private schema');
select ok(not has_function_privilege('authenticated','private.is_owner(uuid)','EXECUTE'),'authenticated cannot invoke private authorization helper');
select ok(has_function_privilege('authenticated','public.is_current_owner()','EXECUTE'),'authenticated can invoke the public authorization wrapper');
select policies_are('public','accounts',array['accounts_select','accounts_insert','accounts_update','accounts_delete']);
select policies_are('public','categories',array['categories_select','categories_insert','categories_update','categories_delete']);
select policies_are('public','financial_events',array['financial_events_select','financial_events_insert','financial_events_update','financial_events_delete']);
select policies_are('public','ledger_entries',array['ledger_entries_select','ledger_entries_insert','ledger_entries_update','ledger_entries_delete']);
select policies_are('public','transfer_details',array['transfer_details_select','transfer_details_insert','transfer_details_update','transfer_details_delete']);
select policies_are('public','investment_valuations',array['investment_valuations_select','investment_valuations_insert','investment_valuations_update','investment_valuations_delete']);
select policies_are('public','exchange_rates',array['exchange_rates_select','exchange_rates_insert','exchange_rates_update','exchange_rates_delete']);
select policies_are('public','user_settings',array['user_settings_select','user_settings_insert','user_settings_update','user_settings_delete']);
select policies_are('public','report_snapshots',array['report_snapshots_select','report_snapshots_insert','report_snapshots_update','report_snapshots_delete']);
select is((select relrowsecurity from pg_class where oid='public.accounts'::regclass),true,'accounts RLS enabled');
select is((select relforcerowsecurity from pg_class where oid='public.accounts'::regclass),true,'accounts RLS forced');
select is((select count(*)::integer from information_schema.role_table_grants where table_schema='public' and grantee='anon' and privilege_type in ('SELECT','INSERT','UPDATE','DELETE')),0,'anonymous has no financial table grants');

select * from finish();
rollback;
