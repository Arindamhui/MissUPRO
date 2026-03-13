import { createTRPCReact, httpBatchLink } from "@trpc/react-query";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const trpc: any = createTRPCReact();

export function createTrpcClient(token?: string) {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000/trpc",
        headers: () => (token ? { Authorization: `Bearer ${token}` } : {}),
      }),
    ],
  });
}
