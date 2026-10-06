/**
 * chatApi — RTK Query slice for conversation and message REST endpoints.
 * Extends the existing RTK Query setup in store.js.
 * chat.md §6.1
 */

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const chatApi = createApi({
  reducerPath: 'chatApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api',
    prepareHeaders: (headers) => {
      // Attach the JWT access token stored in localStorage (project convention)
      const token = localStorage.getItem('accessToken');
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ['Conversation', 'Message'],
  endpoints: (builder) => ({

    // POST /api/conversations
    createOrGetConversation: builder.mutation({
      query: (listingId) => ({
        url: '/conversations',
        method: 'POST',
        body: { listingId },
      }),
      invalidatesTags: ['Conversation'],
    }),

    // GET /api/conversations
    getConversations: builder.query({
      query: () => '/conversations',
      providesTags: ['Conversation'],
    }),

    // GET /api/conversations/:id
    getConversation: builder.query({
      query: (id) => `/conversations/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Conversation', id }],
    }),

    // GET /api/conversations/:id/messages
    getMessages: builder.query({
      query: ({ conversationId, before, limit = 30 }) => {
        const params = new URLSearchParams({ limit });
        if (before) params.set('before', before);
        return `/conversations/${conversationId}/messages?${params}`;
      },
      providesTags: (_r, _e, { conversationId }) => [{ type: 'Message', id: conversationId }],
    }),

    // POST /api/conversations/:id/messages  — REST fallback
    sendMessageRest: builder.mutation({
      query: ({ conversationId, body }) => ({
        url: `/conversations/${conversationId}/messages`,
        method: 'POST',
        body: { body },
      }),
    }),

    // PATCH /api/conversations/:id/read
    markRead: builder.mutation({
      query: (conversationId) => ({
        url: `/conversations/${conversationId}/read`,
        method: 'PATCH',
      }),
      invalidatesTags: (_r, _e, id) => [{ type: 'Conversation', id }],
    }),

  }),
});

export const {
  useCreateOrGetConversationMutation,
  useGetConversationsQuery,
  useGetConversationQuery,
  useGetMessagesQuery,
  useSendMessageRestMutation,
  useMarkReadMutation,
} = chatApi;
