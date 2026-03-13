import { createTRPCReact, httpBatchLink } from "@trpc/react-query";

// AppRouter type lives in @missu/api and can't be imported without pulling
// the NestJS dependency tree. Since the API router uses `as any` on route
// definitions, end-to-end type inference is unavailable — use `any` via cast
// to avoid tRPC's ProtectedIntersection collision with built-in methods.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const trpc: any = createTRPCReact();

export function getTrpcClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/trpc",
      }),
    ],
  });
}
