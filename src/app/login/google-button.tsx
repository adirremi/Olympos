"use client";

import { createClient } from "@/lib/supabase/client";

export function GoogleButton() {
  const handleGoogleLogin = async () => {
    const supabase = createClient();

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: "email profile",
      },
    });
  };

  return (
    <button
      type="button"
      onClick={handleGoogleLogin}
      className="flex h-11 w-full items-center justify-center rounded-lg bg-slate-900 text-sm font-medium text-white transition-colors hover:bg-slate-800"
    >
      Continue with Google
    </button>
  );
}
