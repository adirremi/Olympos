import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { buildGoogleBusinessAuthUrl } from "@/lib/google-business/auth";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";

  if (!user) {
    return NextResponse.redirect(new URL("/login", baseUrl));
  }

  const state = randomBytes(16).toString("hex");
  const authUrl = buildGoogleBusinessAuthUrl(state);

  const response = NextResponse.redirect(authUrl);
  response.cookies.set("google_business_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return response;
}
