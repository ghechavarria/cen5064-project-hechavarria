-- MyHomeLib: the synced copy of each account's library (ADR-012).
-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste this file -> Run.
--
-- One row per account and ISBN, with the same fields as a stored book on the phone
-- (BookRowMapper) plus two sync columns:
--   updated_at  last change, in milliseconds since 1970; the newer change wins
--   deleted_at  set when the book is deleted (a tombstone), so other phones delete it too

create table if not exists public.library_books (
  owner_id       uuid    not null references auth.users (id) on delete cascade,
  isbn           text    not null,
  title          text    not null,
  author         text    not null,
  cover_url      text    not null default '',
  publisher      text    not null default '',
  shelf          text    not null check (shelf in ('OWNED', 'WANTED')),
  copy_count     integer not null default 1 check (copy_count >= 1),
  acquired_as    text             check (acquired_as in ('PURCHASED', 'GIFTED')),
  gifted_by      text,
  reading_status text    not null default 'UNREAD' check (reading_status in ('UNREAD', 'READ')),
  series         text    not null default '',
  description    text    not null default '',
  published      text    not null default '',
  page_count     integer not null default 0,
  subjects       text    not null default '',
  format         text    not null default 'UNKNOWN' check (format in ('HARDCOVER', 'PAPERBACK', 'UNKNOWN')),
  updated_at     bigint  not null,
  deleted_at     bigint,
  primary key (owner_id, isbn)
);

-- Row level security: a signed-in user reaches only their own rows. With this on,
-- the public (anon / publishable) key in the app cannot read anyone else's library.
alter table public.library_books enable row level security;

create policy "read own books" on public.library_books
  for select to authenticated using (auth.uid() = owner_id);

create policy "add own books" on public.library_books
  for insert to authenticated with check (auth.uid() = owner_id);

create policy "change own books" on public.library_books
  for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "remove own books" on public.library_books
  for delete to authenticated using (auth.uid() = owner_id);
