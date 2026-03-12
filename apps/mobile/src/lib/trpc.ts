import { createTRPCReact, httpBatchLink } from "@trpc/react-query";
import type { AppRouter } from "@missu/api/trpc/trpc.router";
import superjson from "superjson";

export const trpc = createTRPCReact<AppRouter>();

export function createTrpcClient(token?: string) {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000/trpc",
        transformer: superjson,
        headers: () => (token ? { Authorization: `Bearer ${token}` } : {}),
      }),
    ],
  });
}
