/**
 * lib/store/store.ts
 *
 * Central Redux store. Add any additional slices or middleware here as the
 * application grows.
 */

import { configureStore } from "@reduxjs/toolkit";
import { conversationsApi } from "./api";

export const store = configureStore({
  reducer: {
    [conversationsApi.reducerPath]: conversationsApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(conversationsApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
