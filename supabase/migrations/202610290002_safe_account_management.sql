begin;

create or replace function public.rename_account(
  p_account_id uuid,
  p_name text
) returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  normalized_name text := trim(p_name);
begin
  if not public.is_current_owner() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if p_account_id is null or p_name is null or char_length(normalized_name) not between 1 and 80 then
    raise exception 'Invalid account name' using errcode = '22023';
  end if;

  update public.accounts
  set name = normalized_name
  where id = p_account_id and owner_id = actor;

  if not found then
    raise exception 'Account not found' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.get_account_removal_strategy(p_account_id uuid)
returns text
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
begin
  if not public.is_current_owner() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  perform 1 from public.accounts where id = p_account_id and owner_id = actor;
  if not found then
    raise exception 'Account not found' using errcode = 'P0002';
  end if;

  if exists (
    select 1 from public.investment_valuations
    where owner_id = actor and account_id = p_account_id
  ) then
    return 'blocked_valuations';
  end if;
  if exists (
    select 1 from public.transfer_details
    where owner_id = actor
      and (source_account_id = p_account_id or destination_account_id = p_account_id)
  ) then
    return 'blocked_transfers';
  end if;
  if exists (
    select 1
    from public.ledger_entries entry
    join public.financial_events event
      on event.id = entry.event_id and event.owner_id = entry.owner_id
    where entry.owner_id = actor
      and entry.account_id = p_account_id
      and event.event_type <> 'opening_balance'
  ) then
    return 'blocked_transactions';
  end if;
  if exists (
    select 1 from public.ledger_entries
    where owner_id = actor and account_id = p_account_id
  ) then
    return 'archive';
  end if;
  return 'delete';
end;
$$;

create or replace function public.remove_or_archive_account(p_account_id uuid)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
begin
  if not public.is_current_owner() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  perform 1
  from public.accounts
  where id = p_account_id and owner_id = actor
  for update;
  if not found then
    raise exception 'Account not found' using errcode = 'P0002';
  end if;

  if exists (
    select 1 from public.investment_valuations
    where owner_id = actor and account_id = p_account_id
  ) then
    raise exception 'Account has investment valuation history' using errcode = 'P2001';
  end if;
  if exists (
    select 1 from public.transfer_details
    where owner_id = actor
      and (source_account_id = p_account_id or destination_account_id = p_account_id)
  ) then
    raise exception 'Account has transfer history' using errcode = 'P2002';
  end if;
  if exists (
    select 1
    from public.ledger_entries entry
    join public.financial_events event
      on event.id = entry.event_id and event.owner_id = entry.owner_id
    where entry.owner_id = actor
      and entry.account_id = p_account_id
      and event.event_type <> 'opening_balance'
  ) then
    raise exception 'Account has transaction history' using errcode = 'P2003';
  end if;

  if exists (
    select 1 from public.ledger_entries
    where owner_id = actor and account_id = p_account_id
  ) then
    update public.accounts
    set archived_at = coalesce(archived_at, now())
    where id = p_account_id and owner_id = actor;
    return 'archived';
  end if;

  delete from public.accounts
  where id = p_account_id and owner_id = actor;
  return 'deleted';
end;
$$;

create or replace function public.restore_account(p_account_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
begin
  if not public.is_current_owner() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  update public.accounts
  set archived_at = null
  where id = p_account_id and owner_id = actor and archived_at is not null;
  if not found then
    raise exception 'Archived account not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.rename_account(uuid,text) from public, anon;
revoke all on function public.get_account_removal_strategy(uuid) from public, anon;
revoke all on function public.remove_or_archive_account(uuid) from public, anon;
revoke all on function public.restore_account(uuid) from public, anon;

grant execute on function public.rename_account(uuid,text) to authenticated;
grant execute on function public.get_account_removal_strategy(uuid) to authenticated;
grant execute on function public.remove_or_archive_account(uuid) to authenticated;
grant execute on function public.restore_account(uuid) to authenticated;

commit;
