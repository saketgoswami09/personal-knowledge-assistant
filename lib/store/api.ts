/**
 * lib/store/api.ts
 *
 * RTK Query API slice — covers all REST endpoints used by the chat UI:
 *   GET  /api/conversations
 *   POST /api/conversations
 *   GET  /api/conversations/:id/messages
 *
 * The AI streaming endpoint (/api/chat) is intentionally NOT here;
 * that is still handled by @ai-sdk/react's useChat hook which speaks
 * the Vercel AI SDK streaming protocol natively.
 */

import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { DbConversation, DbMessage } from "@/lib/supabase";

export const conversationsApi = createApi({
  reducerPath: "conversationsApi",
  baseQuery: fetchBaseQuery({ baseUrl: "/api" }),
  tagTypes: ["Conversation", "Message"],

  endpoints: (builder) => ({
    // ── GET /api/conversations ──────────────────────────────────────────────
    getConversations: builder.query<DbConversation[], void>({
      query: () => "/conversations",
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Conversation" as const, id })),
              { type: "Conversation", id: "LIST" },
            ]
          : [{ type: "Conversation", id: "LIST" }],
    }),

    // ── POST /api/conversations ─────────────────────────────────────────────
    createConversation: builder.mutation<DbConversation, { title: string }>({
      query: (body) => ({
        url: "/conversations",
        method: "POST",
        body,
      }),
      // Optimistically prepend new conversation to the list
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data: newConvo } = await queryFulfilled;
          dispatch(
            conversationsApi.util.updateQueryData(
              "getConversations",
              undefined,
              (draft) => {
                draft.unshift(newConvo);
              }
            )
          );
        } catch {
          // No-op: list will be refetched via invalidation on next render
        }
      },
    }),

    // ── GET /api/conversations/:id/messages ─────────────────────────────────
    getMessages: builder.query<DbMessage[], string>({
      query: (id) => `/conversations/${id}/messages`,
      providesTags: (_result, _err, id) => [{ type: "Message", id }],
    }),

    // ── DELETE /api/conversations/:id ──────────────────────────────────────────
    deleteConversation: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `/conversations/${id}`,
        method: "DELETE",
      }),
      // Optimistically remove conversation from the list
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          conversationsApi.util.updateQueryData(
            "getConversations",
            undefined,
            (draft) => {
              return draft.filter((convo) => convo.id !== id);
            }
          )
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),
  }),
});

export const {
  useGetConversationsQuery,
  useCreateConversationMutation,
  useGetMessagesQuery,
  useDeleteConversationMutation,
} = conversationsApi;
