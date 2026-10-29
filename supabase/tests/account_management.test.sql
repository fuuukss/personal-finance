begin;
create extension if not exists pgtap with schema extensions;
select plan(43);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('11000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'account-owner@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('11000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'account-outsider@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

insert into private.owner_allowlist(user_id)
values ('11000000-0000-0000-0000-000000000001');

insert into public.accounts(id, owner_id, name, currency, kind, sort_order, archived_at) values
  ('21000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', 'EUR Savings', 'EUR', 'savings', 0, '2026-10-20T10:00:00Z'),
  ('21000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000001', 'EUR', 'EUR', 'savings', 1, null),
  ('21000000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000001', 'Empty EUR', 'EUR', 'savings', 2, null),
  ('21000000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000001', 'Expense EUR', 'EUR', 'bank', 3, null),
  ('21000000-0000-0000-0000-000000000005', '11000000-0000-0000-0000-000000000001', 'Transfer EUR', 'EUR', 'bank', 4, null),
  ('21000000-0000-0000-0000-000000000006', '11000000-0000-0000-0000-000000000001', 'Synthetic IBKR', 'EUR', 'investment', 5, null),
  ('21000000-0000-0000-0000-000000000007', '11000000-0000-0000-0000-000000000001', 'Transfer destination EUR', 'EUR', 'savings', 6, null);

insert into public.categories(id, owner_id, name, kind, color)
values ('31000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', 'Synthetic account expense', 'expense', '#334455');

insert into public.financial_events(id, owner_id, event_type, effective_date, idempotency_key) values
  ('41000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', 'opening_balance', '2026-01-01', '51000000-0000-0000-0000-000000000001'),
  ('41000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000001', 'opening_balance', '2026-01-01', '51000000-0000-0000-0000-000000000002'),
  ('41000000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000001', 'expense', '2026-02-01', '51000000-0000-0000-0000-000000000003'),
  ('41000000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000001', 'transfer', '2026-03-01', '51000000-0000-0000-0000-000000000004');

insert into public.ledger_entries(id, owner_id, event_id, account_id, category_id, amount, currency) values
  ('61000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', null, 120, 'EUR'),
  ('61000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-000000000002', null, 321.45, 'EUR'),
  ('61000000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000003', '21000000-0000-0000-0000-000000000004', '31000000-0000-0000-0000-000000000001', -20, 'EUR'),
  ('61000000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000004', '21000000-0000-0000-0000-000000000005', null, -10, 'EUR'),
  ('61000000-0000-0000-0000-000000000005', '11000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000004', '21000000-0000-0000-0000-000000000007', null, 10, 'EUR');

insert into public.transfer_details(event_id, owner_id, source_account_id, destination_account_id, source_amount, destination_amount, effective_rate, source_currency, destination_currency)
values ('41000000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000005', '21000000-0000-0000-0000-000000000007', 10, 10, 1, 'EUR', 'EUR');

insert into public.investment_valuations(id, owner_id, account_id, valuation_date, amount, currency)
values ('71000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000006', '2026-10-29', 1000, 'EUR');

select has_function('public', 'rename_account', array['uuid','text'], 'protected rename RPC exists');
select has_function('public', 'get_account_removal_strategy', array['uuid'], 'removal strategy RPC exists');
select has_function('public', 'remove_or_archive_account', array['uuid'], 'atomic removal RPC exists');
select has_function('public', 'restore_account', array['uuid'], 'restore RPC exists');
select ok(has_function_privilege('authenticated', 'public.rename_account(uuid,text)', 'EXECUTE'), 'authenticated can invoke account management RPCs');
select ok(not has_function_privilege('anon', 'public.rename_account(uuid,text)', 'EXECUTE'), 'anonymous cannot invoke account management RPCs');
select ok(has_function_privilege('authenticated', 'public.get_account_removal_strategy(uuid)', 'EXECUTE'), 'authenticated can inspect its account removal strategy');
select ok(has_function_privilege('authenticated', 'public.remove_or_archive_account(uuid)', 'EXECUTE'), 'authenticated can invoke safe account removal');
select ok(has_function_privilege('authenticated', 'public.restore_account(uuid)', 'EXECUTE'), 'authenticated can invoke account restore');
select ok(not has_function_privilege('anon', 'public.get_account_removal_strategy(uuid)', 'EXECUTE'), 'anonymous cannot inspect account removal strategy');
select ok(not has_function_privilege('anon', 'public.remove_or_archive_account(uuid)', 'EXECUTE'), 'anonymous cannot invoke account removal');
select ok(not has_function_privilege('anon', 'public.restore_account(uuid)', 'EXECUTE'), 'anonymous cannot invoke account restore');
select ok(not (select prosecdef from pg_proc where oid = 'public.rename_account(uuid,text)'::regprocedure), 'rename RPC is security invoker');
select ok(not (select prosecdef from pg_proc where oid = 'public.get_account_removal_strategy(uuid)'::regprocedure), 'strategy RPC is security invoker');
select ok(not (select prosecdef from pg_proc where oid = 'public.remove_or_archive_account(uuid)'::regprocedure), 'removal RPC is security invoker');
select ok(not (select prosecdef from pg_proc where oid = 'public.restore_account(uuid)'::regprocedure), 'restore RPC is security invoker');

set local role authenticated;
select set_config('request.jwt.claim.sub', '11000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(public.get_account_removal_strategy('21000000-0000-0000-0000-000000000001'), 'archive', 'archived original opening-balance account remains recoverable');
select is(public.get_account_removal_strategy('21000000-0000-0000-0000-000000000002'), 'archive', 'manual opening-balance-only account is safely archivable');
select is(public.get_account_removal_strategy('21000000-0000-0000-0000-000000000003'), 'delete', 'empty account is deletable');
select is(public.get_account_removal_strategy('21000000-0000-0000-0000-000000000004'), 'blocked_transactions', 'expense history blocks removal');
select is(public.get_account_removal_strategy('21000000-0000-0000-0000-000000000005'), 'blocked_transfers', 'transfer history blocks removal');
select is(public.get_account_removal_strategy('21000000-0000-0000-0000-000000000006'), 'blocked_valuations', 'valuation history blocks removal');

select lives_ok($$select public.rename_account('21000000-0000-0000-0000-000000000002', 'EUR Reserve')$$, 'manual account can be renamed without changing identity');
select is((select name from public.accounts where id = '21000000-0000-0000-0000-000000000002'), 'EUR Reserve', 'rename preserves the account row');
select throws_ok(
  $$select public.rename_account('21000000-0000-0000-0000-000000000002', 'EUR Savings')$$,
  '23505',
  'duplicate key value violates unique constraint "accounts_owner_id_name_key"',
  'archived names remain protected from ambiguous duplicates'
);
select lives_ok(
  $$select public.create_account_with_opening_balance('Second EUR', 'EUR', 'savings', 0, '2026-10-29', '51000000-0000-0000-0000-000000000010')$$,
  'a second account with the same currency and a distinct name is allowed'
);
select is((select count(*) from public.accounts where owner_id = '11000000-0000-0000-0000-000000000001' and currency = 'EUR' and name = 'Second EUR'), 1::bigint, 'same-currency account creation produces exactly one account');

select is(public.remove_or_archive_account('21000000-0000-0000-0000-000000000002'), 'archived', 'opening-balance-only account is archived rather than deleted');
select ok((select archived_at is not null from public.accounts where id = '21000000-0000-0000-0000-000000000002'), 'manual account is inactive after safe removal');
select is((select count(*) from public.ledger_entries where account_id = '21000000-0000-0000-0000-000000000002'), 1::bigint, 'manual account ledger history is preserved');
select is((select count(*) from public.financial_events where id = '41000000-0000-0000-0000-000000000002'), 1::bigint, 'manual account opening event is preserved');

select lives_ok($$select public.restore_account('21000000-0000-0000-0000-000000000001')$$, 'original account can be restored');
select ok((select archived_at is null from public.accounts where id = '21000000-0000-0000-0000-000000000001'), 'restored original is active');
select is((select sum(amount) from public.ledger_entries where account_id = '21000000-0000-0000-0000-000000000001'), 120::numeric, 'restore preserves original balance history');

select is(public.remove_or_archive_account('21000000-0000-0000-0000-000000000003'), 'deleted', 'empty account is permanently deleted');
select is((select count(*) from public.accounts where id = '21000000-0000-0000-0000-000000000003'), 0::bigint, 'deleted empty account no longer exists');
select throws_ok($$select public.remove_or_archive_account('21000000-0000-0000-0000-000000000004')$$, 'P2003', 'Account has transaction history', 'expense account remains protected');
select throws_ok($$select public.remove_or_archive_account('21000000-0000-0000-0000-000000000005')$$, 'P2002', 'Account has transfer history', 'transfer account remains protected');
select throws_ok($$select public.remove_or_archive_account('21000000-0000-0000-0000-000000000006')$$, 'P2001', 'Account has investment valuation history', 'investment account remains protected');

select set_config('request.jwt.claim.sub', '11000000-0000-0000-0000-000000000002', true);
select throws_ok($$select public.get_account_removal_strategy('21000000-0000-0000-0000-000000000001')$$, '42501', 'Not authorized', 'unauthorized identity cannot inspect account management status');
select throws_ok($$select public.rename_account('21000000-0000-0000-0000-000000000001', 'Hijacked')$$, '42501', 'Not authorized', 'unauthorized identity cannot rename accounts');
select throws_ok($$select public.remove_or_archive_account('21000000-0000-0000-0000-000000000001')$$, '42501', 'Not authorized', 'unauthorized identity cannot remove accounts');
select throws_ok($$select public.restore_account('21000000-0000-0000-0000-000000000002')$$, '42501', 'Not authorized', 'unauthorized identity cannot restore accounts');

select * from finish();
rollback;
