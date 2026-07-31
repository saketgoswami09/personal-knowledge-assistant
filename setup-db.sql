-- Paste this into your Supabase SQL Editor to create the persistence schema

-- 1. Create the conversations table
create table if not exists public.conversations (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create the messages table
create table if not exists public.messages (
  id text primary key, -- Text because the AI SDK generates string IDs (e.g. "msg_123")
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  sources jsonb, -- To store the retrieved SearchResult[]
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Create indexes for faster lookups
create index if not exists messages_conversation_id_idx on public.messages(conversation_id);
create index if not exists conversations_created_at_idx on public.conversations(created_at desc);

-- 4. Set up Row Level Security (RLS)
-- Since this is a personal assistant without auth right now, we can enable RLS
-- but allow anon/public access for demo purposes. Alternatively, since we use the
-- SERVICE_ROLE key in the backend, the backend bypasses RLS anyway.
-- For the frontend fetching past conversations, we need an anon policy:
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

create policy "Allow public read access to conversations" on public.conversations for select using (true);
create policy "Allow public read access to messages" on public.messages for select using (true);
-- Note: Inserts are done via the backend route handler with the service_role key, so we don't need an insert policy here.
