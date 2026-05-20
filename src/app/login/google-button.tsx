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
      className="brutal-button is-blood w-full text-lg"
    >
      התחבר עם גוגל
    </button>
  );
}
