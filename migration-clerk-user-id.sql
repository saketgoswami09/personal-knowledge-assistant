-- =============================================================================
-- Migration: Add Clerk User ID Scoping to Supabase Database
-- Run this in your Supabase SQL Editor to migrate existing tables safely.
-- =============================================================================

-- 1. Add user_id column to chunks and conversations tables if they do not exist
alter table public.chunks add column if not exists user_id text;
alter table public.conversations add column if not exists user_id text;

-- 2. Create indexes for performance on the new user_id column
create index if not exists chunks_user_id_idx on public.chunks(user_id);
create index if not exists conversations_user_id_idx on public.conversations(user_id);

-- 3. Recreate the match_chunks function to include user_id filtering
create or replace function match_chunks (
  query_embedding vector(384),
  p_user_id text,
  match_count int default 5
)
returns table (
  id bigint,
  text text,
  similarity float
)
language sql stable
as $$
  select
    chunks.id,
    chunks.text,
    1 - (chunks.embedding <=> query_embedding) as similarity
  from chunks
  where chunks.user_id = p_user_id
  order by chunks.embedding <=> query_embedding
  limit match_count;
$$;
