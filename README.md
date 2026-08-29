<div align="center">

# 🧠 Personal Knowledge Assistant

**Chat with your own documents.** A full-stack, AI-powered knowledge assistant using Retrieval-Augmented Generation (RAG) — upload PDFs, ask questions, get answers grounded in your own content.

Built with **Next.js 16**, **Vercel AI SDK v7**, **Supabase (`pgvector`)**, and **Groq** for blazing-fast inference.

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Groq](https://img.shields.io/badge/Inference-Groq-F55036?logo=groq&logoColor=white)](https://groq.com/)
[![Supabase](https://img.shields.io/badge/Vector_DB-Supabase_pgvector-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Tailwind](https://img.shields.io/badge/Styling-Tailwind_v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

</div>

---

## 📑 Table of Contents

- [Features](#-features)
- [Tech Stack](#️-tech-stack)
- [Architecture](#-architecture)
- [RAG Query Flow](#-rag-query-flow)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [Contributing](#-contributing)

---

## 🚀 Features

| Feature | Description |
|---|---|
| 🔍 **RAG over your documents** | Chunks your PDFs, generates embeddings, and retrieves relevant context to answer questions accurately |
| ⚡ **Fast inference with Groq** | Uses `llama-3.3-70b-versatile` via Groq for high-speed, high-quality responses |
| 🧬 **Local-style embeddings** | HuggingFace Inference API (`sentence-transformers/all-MiniLM-L6-v2`) generates 384-dim vector embeddings |
| 🗄️ **Vector database** | Supabase + `pgvector`, queried via cosine similarity |
| 💾 **Conversation persistence** | Chat history saved in PostgreSQL — revisit past conversations anytime |
| 🎨 **Polished UI** | Tailwind CSS v4, GSAP animation, Markdown rendering for code blocks |
| 🔄 **State management** | Redux Toolkit for seamless client-side state handling |

---

## 🛠️ Tech Stack

```mermaid
mindmap
  root((Knowledge<br/>Assistant))
    Frontend
      Next.js App Router
      React 19
      Tailwind CSS v4
      Redux Toolkit
    AI Layer
      Vercel AI SDK
      Groq — llama-3.3-70b
      HuggingFace embeddings
    Data
      Supabase Postgres
      pgvector
      Cosine similarity search
```

| Layer | Choice |
|---|---|
| **Framework** | Next.js (App Router) & React 19 |
| **AI SDK** | Vercel AI SDK |
| **LLM** | Groq (`llama-3.3-70b-versatile`) |
| **Embeddings** | HuggingFace (`all-MiniLM-L6-v2`) |
| **Database** | Supabase (PostgreSQL + pgvector) |
| **Styling** | Tailwind CSS v4 |
| **State** | Redux Toolkit |

---

## 🏛️ Architecture

```mermaid
flowchart LR
    subgraph Client["💻 Browser"]
        UI[Chat UI<br/>Tailwind + GSAP]
        RTK[Redux Toolkit<br/>State]
    end

    subgraph App["⚙️ Next.js App Router"]
        API["/api/chat"]
        UPLOAD["/api/upload-pdf"]
        CHUNK[chunker.ts]
        EMBED[embedder.ts]
    end

    subgraph External["☁️ External Services"]
        GROQ[Groq<br/>llama-3.3-70b]
        HF[HuggingFace<br/>all-MiniLM-L6-v2]
        SB[(Supabase<br/>Postgres + pgvector)]
    end

    UI <--> RTK
    UI -- "chat message" --> API
    UI -- "PDF upload" --> UPLOAD

    UPLOAD --> CHUNK
    CHUNK --> EMBED
    EMBED -- "384-dim vectors" --> HF
    EMBED -- "store embeddings" --> SB

    API -- "embed query" --> HF
    API -- "match_chunks RPC" --> SB
    SB -- "top-k chunks" --> API
    API -- "context + question" --> GROQ
    GROQ -- "streamed answer" --> API
    API -- "stream response" --> UI

    API -- "save history" --> SB

    style GROQ fill:#F55036,color:#fff
    style HF fill:#FFD21E,color:#000
    style SB fill:#3ECF8E,color:#000
    style Client fill:#f5f5f5
    style App fill:#eef4ff
    style External fill:#f0fdf4
```

---

## 🔄 RAG Query Flow

```mermaid
sequenceDiagram
    actor User
    participant UI as Chat UI
    participant API as /api/chat
    participant HF as HuggingFace
    participant DB as Supabase (pgvector)
    participant Groq as Groq LLM

    User->>UI: Ask a question
    UI->>API: POST message
    API->>HF: Embed the query
    HF-->>API: 384-dim vector

    API->>DB: match_chunks(query_embedding, match_count)
    DB-->>API: Top-k relevant chunks + similarity scores

    API->>Groq: Prompt = context chunks + question
    Groq-->>API: Streamed answer

    API-->>UI: Streamed response + source chunks
    API->>DB: Persist conversation & messages

    UI-->>User: Answer + collapsible "Sources" panel
```

---

## 📦 Getting Started

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd personal-knowledge-assistant
```

### 2. Install dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

### 3. Set up Supabase

1. Create a new project on [Supabase](https://supabase.com)
2. Enable the `pgvector` extension (via the Supabase dashboard)
3. Run the SQL in `setup-db.sql` to create the `conversations` and `messages` tables
4. **Important**: create the `chunks` table and `match_chunks` function:

```sql
-- Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

-- Create the chunks table
create table if not exists public.chunks (
  id bigint generated by default as identity primary key,
  text text not null,
  embedding vector(384),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create the vector search function
create or replace function match_chunks (
  query_embedding vector(384),
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
  order by chunks.embedding <=> query_embedding
  limit match_count;
$$;
```

### 4. Configure environment variables

```bash
cp .env.example .env.local
```

| Variable | Description |
|---|---|
| `SUPABASE_URL` | `https://your-project-ref.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key |
| `GROQ_API_KEY` | Your Groq API key |
| `HUGGINGFACE_API_KEY` | Your HuggingFace API key |

> ⚠️ Do not commit `.env.local` to version control.

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see it in action.

---

## 📂 Project Structure

```
personal-knowledge-assistant/
├── app/                    # Next.js App Router pages & API routes
│   └── api/chat/           # Chat endpoint
├── app/components/         # React UI components
└── lib/
    ├── embedder.ts         # HuggingFace embedding integration
    ├── supabase.ts         # DB connection & vector search functions
    ├── chunker.ts          # Document (PDF) chunking logic
    └── rate-limit.ts       # API rate limiting logic
```

---

## 🤝 Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request if you have ideas for improvements or new features.

</div>
