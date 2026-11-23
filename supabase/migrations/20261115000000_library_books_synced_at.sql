-- MyHomeLib: incremental sync (ADR-013). Run once after 20261107000000_library_books.sql:
-- Supabase dashboard -> SQL Editor -> New query -> paste this file -> Run. Safe to run again.
--
-- synced_at: when the server stored the row, in milliseconds since 1970, set by the
-- trigger below (never by a phone). A phone remembers the newest synced_at it has
-- seen and next time asks only for rows stored after it, so a sync downloads what
-- changed instead of the whole library. The server's clock is used because the
-- phones' clocks can be wrong, and a row stamped "in the past" would be skipped.

alter table public.library_books add column if not exists synced_at bigint;
update public.library_books
  set synced_at = (extract(epoch from now()) * 1000)::bigint
  where synced_at is null;
alter table public.library_books alter column synced_at set not null;
alter table public.library_books
  alter column synced_at set default (extract(epoch from clock_timestamp()) * 1000)::bigint;

-- "Rows of this account stored after X", in order: one index range scan.
create index if not exists library_books_owner_synced
  on public.library_books (owner_id, synced_at, isbn);

-- Every insert or update is stamped here. An update that is not newer than the
-- stored row (same or older updated_at) is skipped: a phone that uploads late can
-- never overwrite a newer change, and resending the same change does nothing.
create or replace function public.library_books_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.updated_at <= old.updated_at then
    return null;
  end if;
  new.synced_at := (extract(epoch from clock_timestamp()) * 1000)::bigint;
  return new;
end;
$$;

drop trigger if exists library_books_before_write on public.library_books;
create trigger library_books_before_write
  before insert or update on public.library_books
  for each row execute function public.library_books_before_write();
