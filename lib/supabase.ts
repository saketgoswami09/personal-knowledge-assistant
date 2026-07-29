import { createClient } from "@supabase/supabase-js";

// Make sure to add these to your .env.local:
// SUPABASE_URL=https://your-project-ref.supabase.co
// SUPABASE_SERVICE_ROLE_KEY=eyJ...
// 
// Note: We use the SERVICE_ROLE key here because this runs server-side 
// and we want to bypass Row Level Security (RLS) for inserting chunks.
// If you only use the anon key, you'll need to configure RLS policies in Supabase.
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseKey);

export interface DbChunk {
  id: number;
  text: string;
  embedding: number[];
  created_at: string;
}

/**
 * 1. Insert a chunk + embedding into the database
 */
export async function insertChunk(text: string, embedding: number[]) {
  const { data, error } = await supabase
    .from("chunks")
    .insert([
      {
        text,
        // Supabase/pgvector automatically handles the number[] to vector cast
        embedding, 
      },
    ])
    .select()
    .single();

  if (error) {
    throw new Error(`Error inserting chunk: ${error.message}`);
  }

  return data as DbChunk;
}

export interface SearchResult {
  id: number;
  text: string;
  similarity: number;
}

/**
 * 2. Search for the top-k most similar chunks
 * 
 * Note: Supabase's auto-generated REST API doesn't support ordering by 
 * vector distance directly yet. We have to call a custom Postgres function 
 * (RPC) that uses the `<=>` operator under the hood.
 * 
 * You'll need to run this SQL in your Supabase SQL editor first:
 * 
 * create or replace function match_chunks (
 *   query_embedding vector(384),
 *   match_count int default 5
 * )
 * returns table (
 *   id bigint,
 *   text text,
 *   similarity float
 * )
 * language sql stable
 * as $$
 *   select
 *     chunks.id,
 *     chunks.text,
 *     1 - (chunks.embedding <=> query_embedding) as similarity
 *   from chunks
 *   order by chunks.embedding <=> query_embedding
 *   limit match_count;
 * $$;
 */
export async function searchChunks(
  queryEmbedding: number[],
  matchCount: number = 5
): Promise<SearchResult[]> {
  const { data, error } = await supabase.rpc("match_chunks", {
    query_embedding: queryEmbedding,
    match_count: matchCount,
  });

  if (error) {
    throw new Error(`Error searching chunks: ${error.message}`);
  }

  return data as SearchResult[];
}
