begin;

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.owner_allowlist (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

revoke all on private.owner_allowlist from public, anon, authenticated;

create or replace function private.is_owner(candidate uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select candidate is not null
    and candidate = auth.uid()
    and exists (select 1 from private.owner_allowlist o where o.user_id = candidate);
$$;

revoke all on function private.is_owner(uuid) from public, anon, authenticated;

create or replace function public.is_current_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$ select private.is_owner(auth.uid()) $$;

revoke all on function public.is_current_owner() from public, anon;
grant execute on function public.is_current_owner() to authenticated;

create type public.account_kind as enum ('cash', 'bank', 'savings', 'investment');
create type public.category_kind as enum ('expense', 'income');
create type public.financial_event_type as enum (
  'expense', 'income', 'transfer', 'opening_balance', 'balance_adjustment',
  'investment_contribution', 'investment_withdrawal', 'currency_conversion'
);

create table public.accounts (
  id uuid primary key default extensions.gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  kind public.account_kind not null,
  sort_order integer not null default 0 check (sort_order >= 0),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id),
  unique (owner_id, name)
);

create table public.categories (
  id uuid primary key default extensions.gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 60),
  kind public.category_kind not null,
  color text not null default '#5b8cff' check (color ~ '^#[0-9a-fA-F]{6}$'),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id),
  unique (owner_id, kind, name)
);

create table public.financial_events (
  id uuid primary key default extensions.gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  event_type public.financial_event_type not null,
  effective_date date not null default current_date,
  description text check (description is null or char_length(description) <= 500),
  idempotency_key uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id),
  unique (owner_id, idempotency_key)
);

create table public.ledger_entries (
  id uuid primary key default extensions.gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  event_id uuid not null,
  account_id uuid not null,
  category_id uuid,
  amount numeric(24, 6) not null check (amount <> 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default now(),
  unique (id, owner_id),
  constraint ledger_event_owner_fk foreign key (event_id, owner_id)
    references public.financial_events(id, owner_id) on delete cascade,
  constraint ledger_account_owner_fk foreign key (account_id, owner_id)
    references public.accounts(id, owner_id) on delete restrict,
  constraint ledger_category_owner_fk foreign key (category_id, owner_id)
    references public.categories(id, owner_id) on delete restrict
);

create table public.transfer_details (
  event_id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  source_account_id uuid not null,
  destination_account_id uuid not null,
  source_amount numeric(24, 6) not null check (source_amount > 0),
  destination_amount numeric(24, 6) not null check (destination_amount > 0),
  effective_rate numeric(30, 12) not null check (effective_rate > 0),
  source_currency text not null check (source_currency ~ '^[A-Z]{3}$'),
  destination_currency text not null check (destination_currency ~ '^[A-Z]{3}$'),
  constraint transfer_event_owner_fk foreign key (event_id, owner_id)
    references public.financial_events(id, owner_id) on delete cascade,
  constraint transfer_source_owner_fk foreign key (source_account_id, owner_id)
    references public.accounts(id, owner_id) on delete restrict,
  constraint transfer_destination_owner_fk foreign key (destination_account_id, owner_id)
    references public.accounts(id, owner_id) on delete restrict,
  check (source_account_id <> destination_account_id)
);

create table public.investment_valuations (
  id uuid primary key default extensions.gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  account_id uuid not null,
  valuation_date date not null,
  amount numeric(24, 6) not null check (amount >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  note text check (note is null or char_length(note) <= 500),
  created_at timestamptz not null default now(),
  unique (id, owner_id),
  unique (owner_id, account_id, valuation_date),
  constraint valuation_account_owner_fk foreign key (account_id, owner_id)
    references public.accounts(id, owner_id) on delete restrict
);

create table public.exchange_rates (
  id uuid primary key default extensions.gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  rate_date date not null,
  base_currency text not null check (base_currency ~ '^[A-Z]{3}$'),
  quote_currency text not null check (quote_currency ~ '^[A-Z]{3}$'),
  rate numeric(30, 12) not null check (rate > 0),
  source text not null check (char_length(source) between 1 and 80),
  is_actual boolean not null default false,
  created_at timestamptz not null default now(),
  unique (owner_id, rate_date, base_currency, quote_currency, source)
);

create table public.user_settings (
  owner_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  language text not null default 'sr-Latn' check (language in ('sr-Latn', 'en')),
  display_currency text not null default 'RSD' check (display_currency ~ '^[A-Z]{3}$'),
  tracking_start_date date,
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.report_snapshots (
  id uuid primary key default extensions.gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  display_currency text not null check (display_currency ~ '^[A-Z]{3}$'),
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  unique (id, owner_id),
  check (period_end >= period_start),
  check (pg_column_size(snapshot) <= 1048576)
);

create index accounts_owner_active_idx on public.accounts(owner_id, sort_order) where archived_at is null;
create index categories_owner_kind_idx on public.categories(owner_id, kind) where archived_at is null;
create index events_owner_date_idx on public.financial_events(owner_id, effective_date desc, created_at desc);
create index ledger_owner_account_idx on public.ledger_entries(owner_id, account_id);
create index ledger_owner_event_idx on public.ledger_entries(owner_id, event_id);
create index valuations_owner_account_date_idx on public.investment_valuations(owner_id, account_id, valuation_date desc);
create index rates_owner_date_idx on public.exchange_rates(owner_id, rate_date desc);

create or replace function private.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger accounts_touch before update on public.accounts
for each row execute function private.touch_updated_at();
create trigger categories_touch before update on public.categories
for each row execute function private.touch_updated_at();
create trigger events_touch before update on public.financial_events
for each row execute function private.touch_updated_at();
create trigger settings_touch before update on public.user_settings
for each row execute function private.touch_updated_at();

create or replace function private.validate_ledger_entry()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  account_currency text;
  category_type public.category_kind;
  event_kind public.financial_event_type;
begin
  select currency into account_currency from public.accounts
    where id = new.account_id and owner_id = new.owner_id;
  if account_currency is null or account_currency <> new.currency then
    raise exception 'Account currency mismatch' using errcode = '23514';
  end if;

  select event_type into event_kind from public.financial_events
    where id = new.event_id and owner_id = new.owner_id;

  if new.category_id is not null then
    select kind into category_type from public.categories
      where id = new.category_id and owner_id = new.owner_id and archived_at is null;
    if category_type is null
      or (event_kind = 'expense' and category_type <> 'expense')
      or (event_kind = 'income' and category_type <> 'income') then
      raise exception 'Category type mismatch' using errcode = '23514';
    end if;
  elsif event_kind in ('expense', 'income') then
    raise exception 'Category is required' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger validate_ledger_entry before insert or update on public.ledger_entries
for each row execute function private.validate_ledger_entry();

create or replace function private.validate_investment_valuation()
returns trigger language plpgsql set search_path = '' as $$
declare account_currency text; account_type public.account_kind;
begin
  select currency,kind into account_currency,account_type from public.accounts
    where id=new.account_id and owner_id=new.owner_id and archived_at is null;
  if account_type <> 'investment' or account_currency <> new.currency then
    raise exception 'Valuation requires a matching investment account' using errcode='23514';
  end if;
  return new;
end;
$$;

create trigger validate_investment_valuation before insert or update on public.investment_valuations
for each row execute function private.validate_investment_valuation();

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'accounts','categories','financial_events','ledger_entries','transfer_details',
    'investment_valuations','exchange_rates','user_settings','report_snapshots'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
    execute format(
      'create policy %I on public.%I for select to authenticated using (owner_id = auth.uid() and public.is_current_owner())',
      table_name || '_select', table_name
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (owner_id = auth.uid() and public.is_current_owner())',
      table_name || '_insert', table_name
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (owner_id = auth.uid() and public.is_current_owner()) with check (owner_id = auth.uid() and public.is_current_owner())',
      table_name || '_update', table_name
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using (owner_id = auth.uid() and public.is_current_owner())',
      table_name || '_delete', table_name
    );
  end loop;
end $$;

revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

create or replace function public.create_financial_event(
  p_event_type public.financial_event_type,
  p_account_id uuid,
  p_amount numeric,
  p_category_id uuid,
  p_effective_date date,
  p_description text,
  p_idempotency_key uuid
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  event_id uuid;
  account_currency text;
  signed_amount numeric(24,6);
begin
  if not public.is_current_owner() then raise exception 'Not authorized' using errcode = '42501'; end if;
  if p_event_type not in ('expense','income','opening_balance','balance_adjustment') then
    raise exception 'Unsupported event type' using errcode = '22023';
  end if;
  if p_amount is null or p_amount = 0 or abs(p_amount) > 999999999999999999::numeric then
    raise exception 'Invalid amount' using errcode = '22003';
  end if;
  if p_event_type in ('expense','income','opening_balance') and p_amount < 0 then
    raise exception 'Amount must be positive' using errcode = '22023';
  end if;
  select currency into account_currency from public.accounts
    where id = p_account_id and owner_id = actor and archived_at is null for update;
  if account_currency is null then raise exception 'Account not found' using errcode = 'P0002'; end if;

  select id into event_id from public.financial_events
    where owner_id = actor and idempotency_key = p_idempotency_key;
  if event_id is not null then return event_id; end if;

  signed_amount := case when p_event_type = 'expense' then -abs(p_amount) else p_amount end;
  insert into public.financial_events(owner_id,event_type,effective_date,description,idempotency_key)
    values(actor,p_event_type,coalesce(p_effective_date,current_date),nullif(trim(p_description),''),p_idempotency_key)
    returning id into event_id;
  insert into public.ledger_entries(owner_id,event_id,account_id,category_id,amount,currency)
    values(actor,event_id,p_account_id,p_category_id,signed_amount,account_currency);
  return event_id;
end;
$$;

create or replace function public.create_account_with_opening_balance(
  p_name text,
  p_currency text,
  p_kind public.account_kind,
  p_opening_balance numeric,
  p_start_date date,
  p_idempotency_key uuid
) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare actor uuid := auth.uid(); account_id uuid; next_order integer;
begin
  if not public.is_current_owner() then raise exception 'Not authorized' using errcode='42501'; end if;
  if char_length(trim(p_name)) not between 1 and 80 or upper(p_currency) !~ '^[A-Z]{3}$' then
    raise exception 'Invalid account' using errcode='22023';
  end if;
  select coalesce(max(sort_order),-1)+1 into next_order from public.accounts where owner_id=actor;
  insert into public.accounts(owner_id,name,currency,kind,sort_order)
    values(actor,trim(p_name),upper(p_currency),p_kind,next_order) returning id into account_id;
  if p_opening_balance <> 0 then
    perform public.create_financial_event('opening_balance',account_id,p_opening_balance,null,p_start_date,'Opening balance',p_idempotency_key);
  end if;
  return account_id;
end;
$$;

create or replace function public.reorder_account(p_account_id uuid, p_direction integer)
returns void language plpgsql security invoker set search_path = '' as $$
declare actor uuid := auth.uid(); current_order integer; neighbor_id uuid; neighbor_order integer;
begin
  if not public.is_current_owner() or p_direction not in (-1,1) then raise exception 'Not authorized' using errcode='42501'; end if;
  select sort_order into current_order from public.accounts where id=p_account_id and owner_id=actor for update;
  if current_order is null then raise exception 'Account not found' using errcode='P0002'; end if;
  select id,sort_order into neighbor_id,neighbor_order from public.accounts
    where owner_id=actor and archived_at is null
      and ((p_direction=-1 and sort_order < current_order) or (p_direction=1 and sort_order > current_order))
    order by case when p_direction=-1 then -sort_order else sort_order end asc limit 1 for update;
  if neighbor_id is null then return; end if;
  update public.accounts set sort_order=case when id=p_account_id then neighbor_order else current_order end
    where owner_id=actor and id in (p_account_id,neighbor_id);
end;
$$;

create or replace function public.reconcile_account_balance(
  p_account_id uuid,
  p_target_balance numeric,
  p_effective_date date,
  p_description text,
  p_idempotency_key uuid
) returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  current_balance numeric(24,6);
  adjustment numeric(24,6);
begin
  if not public.is_current_owner() then raise exception 'Not authorized' using errcode = '42501'; end if;
  perform 1 from public.accounts where id = p_account_id and owner_id = actor and archived_at is null for update;
  if not found then raise exception 'Account not found' using errcode = 'P0002'; end if;
  select coalesce(sum(amount),0) into current_balance from public.ledger_entries
    where owner_id = actor and account_id = p_account_id;
  adjustment := p_target_balance - current_balance;
  if adjustment = 0 then raise exception 'Balance already matches' using errcode = '22023'; end if;
  return public.create_financial_event('balance_adjustment',p_account_id,adjustment,null,p_effective_date,p_description,p_idempotency_key);
end;
$$;

create or replace function public.create_transfer(
  p_source_account_id uuid,
  p_destination_account_id uuid,
  p_source_amount numeric,
  p_destination_amount numeric,
  p_effective_date date,
  p_description text,
  p_idempotency_key uuid
) returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  event_id uuid;
  source_currency text;
  destination_currency text;
  source_kind public.account_kind;
  destination_kind public.account_kind;
  event_kind public.financial_event_type := 'transfer';
  effective_rate numeric(30,12);
begin
  if not public.is_current_owner() then raise exception 'Not authorized' using errcode = '42501'; end if;
  if p_source_account_id = p_destination_account_id then raise exception 'Accounts must differ' using errcode = '22023'; end if;
  if p_source_amount <= 0 or p_destination_amount <= 0 then raise exception 'Amounts must be positive' using errcode = '22023'; end if;

  perform id from public.accounts where owner_id = actor and id in (p_source_account_id,p_destination_account_id) order by id for update;
  select currency,kind into source_currency,source_kind from public.accounts
    where id = p_source_account_id and owner_id = actor and archived_at is null;
  select currency,kind into destination_currency,destination_kind from public.accounts
    where id = p_destination_account_id and owner_id = actor and archived_at is null;
  if source_currency is null or destination_currency is null then raise exception 'Account not found' using errcode = 'P0002'; end if;

  select id into event_id from public.financial_events where owner_id = actor and idempotency_key = p_idempotency_key;
  if event_id is not null then return event_id; end if;

  if source_kind <> 'investment' and destination_kind = 'investment' then event_kind := 'investment_contribution';
  elsif source_kind = 'investment' and destination_kind <> 'investment' then event_kind := 'investment_withdrawal';
  elsif source_currency <> destination_currency then event_kind := 'currency_conversion';
  end if;
  effective_rate := round(p_destination_amount / p_source_amount, 12);

  insert into public.financial_events(owner_id,event_type,effective_date,description,idempotency_key)
    values(actor,event_kind,coalesce(p_effective_date,current_date),nullif(trim(p_description),''),p_idempotency_key)
    returning id into event_id;
  insert into public.ledger_entries(owner_id,event_id,account_id,amount,currency) values
    (actor,event_id,p_source_account_id,-p_source_amount,source_currency),
    (actor,event_id,p_destination_account_id,p_destination_amount,destination_currency);
  insert into public.transfer_details(event_id,owner_id,source_account_id,destination_account_id,source_amount,destination_amount,effective_rate,source_currency,destination_currency)
    values(event_id,actor,p_source_account_id,p_destination_account_id,p_source_amount,p_destination_amount,effective_rate,source_currency,destination_currency);
  return event_id;
end;
$$;

create or replace function public.update_financial_event(
  p_event_id uuid,
  p_amount numeric,
  p_category_id uuid,
  p_effective_date date,
  p_description text
) returns void
language plpgsql security invoker set search_path = ''
as $$
declare actor uuid := auth.uid(); kind public.financial_event_type; signed_amount numeric(24,6);
begin
  if not public.is_current_owner() then raise exception 'Not authorized' using errcode = '42501'; end if;
  select event_type into kind from public.financial_events where id=p_event_id and owner_id=actor for update;
  if kind not in ('expense','income','balance_adjustment') then raise exception 'This event must be reversed, not edited' using errcode='22023'; end if;
  if p_amount = 0 then raise exception 'Invalid amount' using errcode='22023'; end if;
  if kind in ('expense','income') and p_amount < 0 then raise exception 'Amount must be positive' using errcode='22023'; end if;
  signed_amount := case when kind='expense' then -abs(p_amount) else p_amount end;
  update public.financial_events set effective_date=p_effective_date, description=nullif(trim(p_description),'') where id=p_event_id and owner_id=actor;
  update public.ledger_entries set amount=signed_amount, category_id=p_category_id where event_id=p_event_id and owner_id=actor;
end;
$$;

create or replace function public.delete_financial_event(p_event_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
declare actor uuid := auth.uid(); kind public.financial_event_type;
begin
  if not public.is_current_owner() then raise exception 'Not authorized' using errcode='42501'; end if;
  select event_type into kind from public.financial_events where id=p_event_id and owner_id=actor for update;
  if kind = 'opening_balance' then raise exception 'Opening balances cannot be deleted' using errcode='22023'; end if;
  delete from public.financial_events where id=p_event_id and owner_id=actor;
  if not found then raise exception 'Event not found' using errcode='P0002'; end if;
end;
$$;

create or replace function public.complete_onboarding(p_start_date date, p_opening_balances jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  actor uuid := auth.uid(); item jsonb; account_id uuid; account_currency text; account_kind public.account_kind;
  account_name text; opening numeric(24,6); position integer := 0;
begin
  if not public.is_current_owner() then raise exception 'Not authorized' using errcode='42501'; end if;
  insert into public.user_settings(owner_id,tracking_start_date) values(actor,p_start_date)
    on conflict(owner_id) do nothing;
  if (select onboarding_complete from public.user_settings where owner_id=actor for update) then return; end if;
  if jsonb_typeof(p_opening_balances) <> 'array' then raise exception 'Balances must be an array' using errcode='22023'; end if;

  for item in select * from jsonb_array_elements(p_opening_balances) loop
    account_name := trim(item->>'name'); account_currency := upper(item->>'currency');
    account_kind := (item->>'kind')::public.account_kind; opening := (item->>'balance')::numeric;
    insert into public.accounts(owner_id,name,currency,kind,sort_order)
      values(actor,account_name,account_currency,account_kind,position)
      on conflict(owner_id,name) do update set currency=excluded.currency,kind=excluded.kind
      returning id into account_id;
    if opening <> 0 then
      perform public.create_financial_event('opening_balance',account_id,opening,null,p_start_date,'Opening balance',extensions.gen_random_uuid());
    end if;
    position := position + 1;
  end loop;

  insert into public.categories(owner_id,name,kind,color) values
    (actor,'Hrana i namirnice','expense','#60a5fa'),(actor,'Restorani i dostava','expense','#f59e0b'),
    (actor,'Kafići i piće','expense','#a78bfa'),(actor,'Izlasci','expense','#f472b6'),
    (actor,'Cigare','expense','#94a3b8'),(actor,'Prevoz i gorivo','expense','#22d3ee'),
    (actor,'Kupovina i odeća','expense','#fb7185'),(actor,'Pretplate','expense','#818cf8'),
    (actor,'Zdravlje i sport','expense','#34d399'),(actor,'Putovanja','expense','#2dd4bf'),
    (actor,'Pokloni','expense','#e879f9'),(actor,'Ostalo / Random','expense','#64748b'),
    (actor,'Salary','income','#34d399'),(actor,'Gift','income','#a3e635'),
    (actor,'Refund','income','#22d3ee'),(actor,'Other income','income','#60a5fa')
    on conflict(owner_id,kind,name) do nothing;
  update public.user_settings set tracking_start_date=p_start_date,onboarding_complete=true where owner_id=actor;
end;
$$;

revoke all on function public.create_financial_event(public.financial_event_type,uuid,numeric,uuid,date,text,uuid) from public, anon;
revoke all on function public.create_account_with_opening_balance(text,text,public.account_kind,numeric,date,uuid) from public, anon;
revoke all on function public.reorder_account(uuid,integer) from public, anon;
revoke all on function public.reconcile_account_balance(uuid,numeric,date,text,uuid) from public, anon;
revoke all on function public.create_transfer(uuid,uuid,numeric,numeric,date,text,uuid) from public, anon;
revoke all on function public.update_financial_event(uuid,numeric,uuid,date,text) from public, anon;
revoke all on function public.delete_financial_event(uuid) from public, anon;
revoke all on function public.complete_onboarding(date,jsonb) from public, anon;
grant execute on function public.create_financial_event(public.financial_event_type,uuid,numeric,uuid,date,text,uuid) to authenticated;
grant execute on function public.create_account_with_opening_balance(text,text,public.account_kind,numeric,date,uuid) to authenticated;
grant execute on function public.reorder_account(uuid,integer) to authenticated;
grant execute on function public.reconcile_account_balance(uuid,numeric,date,text,uuid) to authenticated;
grant execute on function public.create_transfer(uuid,uuid,numeric,numeric,date,text,uuid) to authenticated;
grant execute on function public.update_financial_event(uuid,numeric,uuid,date,text) to authenticated;
grant execute on function public.delete_financial_event(uuid) to authenticated;
grant execute on function public.complete_onboarding(date,jsonb) to authenticated;

commit;
