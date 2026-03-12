import { createTRPCReact, httpBatchLink } from "@trpc/react-query";
import type { AppRouter } from "@missu/api/trpc/trpc.router";
import superjson from "superjson";

export const trpc = createTRPCReact<AppRouter>();

export function getTrpcClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/trpc",
        transformer: superjson,
      }),
    ],
  });
}
