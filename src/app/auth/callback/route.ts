import { NextResponse } from "next/server";
import { acceptPendingInvitations } from "@/lib/invitations";
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
      await acceptPendingInvitations(user.id, user.email);
    }
  }

  return NextResponse.redirect(new URL("/dashboard", requestUrl.origin));
}
