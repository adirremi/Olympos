import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("user_profile")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profile) {
        return NextResponse.redirect(new URL("/dashboard", requestUrl.origin));
      }
    }
  }

  return NextResponse.redirect(new URL("/onboarding", requestUrl.origin));
}
