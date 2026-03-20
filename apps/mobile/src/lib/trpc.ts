import { createTRPCReact, httpBatchLink } from "@trpc/react-query";
import { Platform } from "react-native";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const trpc: any = createTRPCReact();

type TrpcClientOptions = {
  token?: string;
  getToken?: () => Promise<string | null>;
};

function resolveApiUrl() {
  const fallback = Platform.OS === "android"
    ? "http://10.0.2.2:4000/trpc"
    : "http://localhost:4000/trpc";

  const configured = process.env.EXPO_PUBLIC_API_URL ?? fallback;

  if (Platform.OS !== "android") {
    return configured;
  }

  return configured
    .replace("://localhost", "://10.0.2.2")
    .replace("://127.0.0.1", "://10.0.2.2");
}

export function createTrpcClient(options?: TrpcClientOptions) {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: resolveApiUrl(),
        headers: async () => {
          const token = options?.getToken ? await options.getToken() : options?.token;
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
      }),
    ],
  });
}
