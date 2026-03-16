import { createTRPCReact, httpBatchLink } from "@trpc/react-query";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const trpc: any = createTRPCReact();

type TrpcClientOptions = {
  token?: string;
  getToken?: () => Promise<string | null>;
};

export function createTrpcClient(options?: TrpcClientOptions) {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000/trpc",
        headers: async () => {
          const token = options?.getToken ? await options.getToken() : options?.token;
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
      }),
    ],
  });
}
