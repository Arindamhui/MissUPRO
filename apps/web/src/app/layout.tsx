import type { Metadata } from "next";
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
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
