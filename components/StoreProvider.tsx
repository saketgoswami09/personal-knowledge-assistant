"use client";

/**
 * components/StoreProvider.tsx
 *
 * Wraps children in the Redux <Provider>. Must be a Client Component
 * because Redux uses React context internally.
 */

import { Provider } from "react-redux";
import { store } from "@/lib/store/store";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  return <Provider store={store}>{children}</Provider>;
}
