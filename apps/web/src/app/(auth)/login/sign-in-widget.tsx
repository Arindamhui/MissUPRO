"use client";

import { SignIn } from "@clerk/nextjs";

export default function SignInWidget({ role }: { role: "admin" | "agency" }) {
  return (
    <SignIn
      routing="hash"
      signUpUrl={role === "admin" ? "/auth/error?reason=admin_signup_forbidden&role=admin" : "/signup"}
      forceRedirectUrl={`/auth/callback?intent=login&role=${role}`}
      fallbackRedirectUrl={`/auth/callback?intent=login&role=${role}`}
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