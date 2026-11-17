-- MyHomeLib: when each book was added (the Account tab's "Latest addition").
-- Run once after 20261115000000_library_books_synced_at.sql:
-- Supabase dashboard -> SQL Editor -> New query -> paste this file -> Run. Safe to run again.
--
-- added_at: milliseconds since 1970, set by the phone that first saved the book and
-- kept from then on. Books saved before this column existed count as added on
-- Nov 7, 2026 at noon Eastern Standard Time (1794070800000), when accounts and sync
-- began; the app reads a missing date the same way (BookRowMapper.EARLIEST_ADDED_AT).

alter table public.library_books add column if not exists added_at bigint;

-- The write trigger refuses an update that isn't a newer change, and this fill
-- changes no updated_at, so it runs with the trigger off (and doesn't restamp rows).
alter table public.library_books disable trigger library_books_before_write;
update public.library_books set added_at = 1794070800000 where added_at is null;
alter table public.library_books enable trigger library_books_before_write;
