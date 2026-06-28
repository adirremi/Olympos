import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { exchangeGoogleCodeForTokens } from "@/lib/google-business/auth";
import { saveUserGoogleTokens } from "@/lib/google-business/tokens";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const error = requestUrl.searchParams.get("error");
  const baseUrl = process.env.APP_BASE_URL ?? requestUrl.origin;

  if (error) {
    return NextResponse.redirect(
      new URL(`/businesses?google_error=${encodeURIComponent(error)}`, baseUrl),
    );
  }

  const cookieStore = await cookies();
  const savedState = cookieStore.get("google_business_oauth_state")?.value;
  cookieStore.delete("google_business_oauth_state");

  if (!code || !state || !savedState || state !== savedState) {
    return NextResponse.redirect(
      new URL("/businesses?google_error=invalid_state", baseUrl),
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", baseUrl));
  }

  try {
    const tokens = await exchangeGoogleCodeForTokens(code);
    await saveUserGoogleTokens(user.id, tokens);
    return NextResponse.redirect(new URL("/businesses?google=connected", baseUrl));
  } catch (callbackError) {
    const message =
      callbackError instanceof Error ? callbackError.message : "oauth_failed";
    return NextResponse.redirect(
      new URL(
        `/businesses?google_error=${encodeURIComponent(message)}`,
        baseUrl,
      ),
    );
  }
}
