begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'finance-test@example.invalid', '', now(),
  '{}'::jsonb, '{}'::jsonb, now(), now()
);

insert into private.owner_allowlist(user_id)
values ('10000000-0000-0000-0000-000000000001');

insert into public.accounts(id, owner_id, name, currency, kind, sort_order) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'RSD Cash', 'RSD', 'cash', 0),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'RSD Card', 'RSD', 'bank', 1),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'EUR Savings', 'EUR', 'savings', 2),
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'RSD Test', 'RSD', 'bank', 3);

insert into public.categories(id, owner_id, name, kind, color) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Synthetic expense', 'expense', '#112233'),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Synthetic income', 'income', '#223344');

insert into public.financial_events(id, owner_id, event_type, effective_date, idempotency_key, updated_at) values
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'expense', '2026-10-01', '50000000-0000-0000-0000-000000000001', '2026-10-29T08:00:00Z'),
  ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'expense', '2026-10-01', '50000000-0000-0000-0000-000000000002', '2026-10-29T08:00:00Z'),
  ('40000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'income', '2026-10-01', '50000000-0000-0000-0000-000000000003', '2026-10-29T08:00:00Z'),
  ('40000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'balance_adjustment', '2026-10-01', '50000000-0000-0000-0000-000000000004', '2026-10-29T08:00:00Z');

insert into public.ledger_entries(id, owner_id, event_id, account_id, category_id, amount, currency) values
  ('60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', -500, 'RSD'),
  ('60000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', -500, 'RSD'),
  ('60000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000002', 1000, 'RSD'),
  ('60000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000004', null, 50, 'RSD');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select has_function(
  'public', 'update_financial_event_v2',
  array['uuid','uuid','numeric','uuid','date','text','timestamp with time zone'],
  'atomic account-edit RPC exists'
);

select throws_ok(
  $$select public.update_financial_event_v2(
    '40000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000001',
    500,
    '30000000-0000-0000-0000-000000000002',
    '2026-10-01',
    '',
    '2026-10-29T08:00:00Z'
  )$$,
  '22023',
  'Category type mismatch',
  'expense rejects an income category at the RPC boundary'
);

select throws_ok(
  $$select public.update_financial_event_v2(
    '40000000-0000-0000-0000-000000000003',
    '20000000-0000-0000-0000-000000000004',
    1000,
    '30000000-0000-0000-0000-000000000001',
    '2026-10-01',
    '',
    '2026-10-29T08:00:00Z'
  )$$,
  '22023',
  'Category type mismatch',
  'income rejects an expense category at the RPC boundary'
);

select lives_ok(
  $$select public.update_financial_event_v2(
    '40000000-0000-0000-0000-000000000004',
    '20000000-0000-0000-0000-000000000004',
    75,
    null,
    '2026-10-02',
    'Synthetic adjustment',
    '2026-10-29T08:00:00Z'
  )$$,
  'balance adjustment remains valid without a category'
);

select lives_ok(
  $$select public.update_financial_event_v2(
    '40000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000002',
    600,
    '30000000-0000-0000-0000-000000000001',
    '2026-10-02',
    'Synthetic edit',
    '2026-10-29T08:00:00Z'
  )$$,
  'expense account and amount change succeeds atomically'
);

select is((select coalesce(sum(amount), 0) from public.ledger_entries where account_id = '20000000-0000-0000-0000-000000000001'), (-500)::numeric, 'old account reverses only the edited expense and preserves unrelated history');
select is((select coalesce(sum(amount), 0) from public.ledger_entries where account_id = '20000000-0000-0000-0000-000000000002'), (-600)::numeric, 'new account receives the edited expense');
select is((select count(*) from public.financial_events where id = '40000000-0000-0000-0000-000000000001'), 1::bigint, 'only one financial event remains');
select is((select count(*) from public.ledger_entries where event_id = '40000000-0000-0000-0000-000000000001'), 1::bigint, 'only one ledger movement remains');
select is((select account_id from public.ledger_entries where event_id = '40000000-0000-0000-0000-000000000001'), '20000000-0000-0000-0000-000000000002'::uuid, 'ledger entry points to the new account');

select throws_ok(
  $$select public.update_financial_event_v2(
    '40000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000003',
    500,
    '30000000-0000-0000-0000-000000000001',
    '2026-10-01',
    '',
    '2026-10-29T08:00:00Z'
  )$$,
  '22023',
  'Account currency mismatch',
  'currency-incompatible account changes are rejected'
);

select throws_ok(
  $$select public.update_financial_event_v2(
    '40000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000002',
    700,
    '30000000-0000-0000-0000-000000000001',
    '2026-10-02',
    '',
    '2026-10-29T08:00:00Z'
  )$$,
  '40001',
  'Event changed since it was loaded',
  'stale concurrent edits are rejected'
);

select lives_ok(
  $$select public.delete_financial_event('40000000-0000-0000-0000-000000000001')$$,
  'edited expense can still be deleted through the protected RPC'
);
select is((select coalesce(sum(amount), 0) from public.ledger_entries where account_id = '20000000-0000-0000-0000-000000000002'), 0::numeric, 'expense deletion reverses the new account balance through ledger cascade');

select * from finish();
rollback;
