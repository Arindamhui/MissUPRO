"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: { client_id: string; callback: (response: { credential?: string }) => void }) => void;
          renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

let googleScriptPromise: Promise<void> | null = null;
let initializedGoogleClientId: string | null = null;

function ensureGoogleScript() {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }

  if (!googleScriptPromise) {
    googleScriptPromise = new Promise<void>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>('script[data-google-identity="true"]');
      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error("Google script failed to load")), { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.dataset.googleIdentity = "true";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Google script failed to load"));
      document.head.appendChild(script);
    });
  }

  return googleScriptPromise;
}

export function GoogleAuthButton({
  onCredential,
  text,
}: {
  onCredential: (credential: string) => void;
  text: "signin_with" | "signup_with" | "continue_with";
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const onCredentialRef = useRef(onCredential);

  useEffect(() => {
    onCredentialRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
    if (!clientId || !containerRef.current) {
      return;
    }

    let cancelled = false;

    void ensureGoogleScript().then(() => {
      if (cancelled || !containerRef.current || !window.google?.accounts?.id) {
        return;
      }

      containerRef.current.innerHTML = "";

      if (initializedGoogleClientId !== clientId) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response.credential) {
              onCredentialRef.current(response.credential);
            }
          },
        });
        initializedGoogleClientId = clientId;
      }

      window.google.accounts.id.renderButton(containerRef.current, {
        theme: "outline",
        size: "large",
        width: 360,
        text,
        shape: "pill",
      });
    }).catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [text]);

  if (!(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "")) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Set NEXT_PUBLIC_GOOGLE_CLIENT_ID to enable Google sign-in on the web app.
      </div>
    );
  }

  return <div className="flex justify-center" ref={containerRef} />;
}