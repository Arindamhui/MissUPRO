"use client";

import { SignUp } from "@clerk/nextjs";

export default function SignUpWidget() {
  return (
    <SignUp
      routing="hash"
      signInUrl="/login?role=agency"
      forceRedirectUrl="/auth/callback?intent=signup&role=agency"
      fallbackRedirectUrl="/auth/callback?intent=signup&role=agency"
      appearance={{
        variables: { colorPrimary: "#ff6b3d" },
        elements: {
          card: "shadow-none border-0 p-0 w-full bg-transparent",
          headerTitle: "hidden",
          headerSubtitle: "hidden",
          footerAction: "text-sm",
        },
      }}
    />
  );
}