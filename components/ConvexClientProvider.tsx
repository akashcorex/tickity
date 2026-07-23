"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

let convex: ConvexReactClient | null = null;

if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_CONVEX_URL) {
  convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL);
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  if (!convex) {
    throw new Error(
      "NEXT_PUBLIC_CONVEX_URL is not defined. Please define it in your .env.local file. See https://convex.dev/docs/getting-started#1-connect-your-project"
    );
  }

  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}