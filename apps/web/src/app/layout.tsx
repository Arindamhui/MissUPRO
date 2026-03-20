import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Providers } from "@/components/providers";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "MissU Pro",
  description: "MissU Pro live streaming platform",
  icons: {
    icon: "/brand/missu-pro-app-icon.png",
    apple: "/brand/missu-pro-app-icon.png",
    shortcut: "/brand/missu-pro-app-icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
  const clerkEnabled = clerkPublishableKey.length > 0;

  if (clerkEnabled) {
    return (
      <ClerkProvider publishableKey={clerkPublishableKey}>
        <html lang="en" dir="ltr" suppressHydrationWarning>
          <body>
            <Providers clerkEnabled>{children}</Providers>
          </body>
        </html>
      </ClerkProvider>
    );
  }

  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <body>
        <Providers clerkEnabled={false}>{children}</Providers>
      </body>
    </html>
  );
}
