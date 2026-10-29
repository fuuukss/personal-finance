begin;

create or replace function public.update_financial_event_v2(
  p_event_id uuid,
  p_account_id uuid,
  p_amount numeric,
  p_category_id uuid,
  p_effective_date date,
  p_description text,
  p_expected_updated_at timestamptz
) returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  kind public.financial_event_type;
  current_version timestamptz;
  entry_id uuid;
  current_account_id uuid;
  entry_currency text;
  target_currency text;
  entry_count integer;
  signed_amount numeric(24,6);
begin
  if not public.is_current_owner() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select event_type, updated_at
    into kind, current_version
    from public.financial_events
    where id = p_event_id and owner_id = actor
    for update;

  if kind is null then
    raise exception 'Event not found' using errcode = 'P0002';
  end if;
  if kind not in ('expense','income','balance_adjustment') then
    raise exception 'This event must be reversed, not edited' using errcode = '22023';
  end if;
  if p_expected_updated_at is null or current_version <> p_expected_updated_at then
    raise exception 'Event changed since it was loaded' using errcode = '40001';
  end if;
  if p_amount is null or p_amount = 0 or abs(p_amount) > 999999999999999999::numeric then
    raise exception 'Invalid amount' using errcode = '22023';
  end if;
  if kind in ('expense','income') and p_amount < 0 then
    raise exception 'Amount must be positive' using errcode = '22023';
  end if;

  select count(*) into entry_count
    from public.ledger_entries
    where event_id = p_event_id and owner_id = actor;
  if entry_count <> 1 then
    raise exception 'Editable event must have exactly one ledger entry' using errcode = '22023';
  end if;

  select id, account_id, currency
    into entry_id, current_account_id, entry_currency
    from public.ledger_entries
    where event_id = p_event_id and owner_id = actor
    for update;

  perform id
    from public.accounts
    where owner_id = actor and id in (current_account_id, p_account_id)
    order by id
    for update;

  select currency into target_currency
    from public.accounts
    where id = p_account_id and owner_id = actor and archived_at is null;
  if target_currency is null then
    raise exception 'Target account not found' using errcode = 'P0002';
  end if;
  if target_currency <> entry_currency then
    raise exception 'Account currency mismatch' using errcode = '22023';
  end if;

  signed_amount := case when kind = 'expense' then -abs(p_amount) else p_amount end;

  update public.financial_events
    set effective_date = p_effective_date,
        description = nullif(trim(p_description),'')
    where id = p_event_id and owner_id = actor;

  update public.ledger_entries
    set account_id = p_account_id,
        amount = signed_amount,
        category_id = p_category_id
    where id = entry_id and owner_id = actor;
end;
$$;

revoke all on function public.update_financial_event_v2(uuid,uuid,numeric,uuid,date,text,timestamptz) from public, anon;
grant execute on function public.update_financial_event_v2(uuid,uuid,numeric,uuid,date,text,timestamptz) to authenticated;

commit;
