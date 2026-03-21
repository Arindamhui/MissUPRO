import { createTRPCReact, httpBatchLink } from "@trpc/react-query";

// AppRouter type lives in @missu/api and can't be imported without pulling
// the NestJS dependency tree. Since the API router uses `as any` on route
// definitions, end-to-end type inference is unavailable — use `any` via cast
// to avoid tRPC's ProtectedIntersection collision with built-in methods.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const trpc: any = createTRPCReact();

function resolveTrpcUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (!configuredUrl) {
    return "http://localhost:4000/trpc";
  }

  const normalizedUrl = configuredUrl.replace(/\/+$/, "");
  return normalizedUrl.endsWith("/trpc") ? normalizedUrl : `${normalizedUrl}/trpc`;
}

type TrpcClientOptions = {
  token?: string;
  getToken?: () => Promise<string | null>;
};

export function createTrpcClient(options?: TrpcClientOptions) {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: resolveTrpcUrl(),
        headers: async () => {
          const token = options?.getToken ? await options.getToken() : options?.token;
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
      }),
    ],
  });
}

export function getTrpcClient() {
  return createTrpcClient();
}
