import { NextResponse } from "next/server";
import { exchangeGoogleCodeForTokens } from "@/lib/google-business/auth";
import { saveUserGoogleTokens } from "@/lib/google-business/tokens";
import { createClient } from "@/lib/supabase/server";

function redirectWithClearedState(url: URL) {
  const response = NextResponse.redirect(url);
  response.cookies.delete("google_business_oauth_state");
  return response;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const error = requestUrl.searchParams.get("error");
  const baseUrl = process.env.APP_BASE_URL ?? requestUrl.origin;

  if (error) {
    return redirectWithClearedState(
      new URL(`/businesses?google_error=${encodeURIComponent(error)}`, baseUrl),
    );
  }

  const savedState = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("google_business_oauth_state="))
    ?.split("=")[1];

  if (!code || !state || !savedState || state !== savedState) {
    return redirectWithClearedState(
      new URL("/businesses?google_error=invalid_state", baseUrl),
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirectWithClearedState(new URL("/login", baseUrl));
  }

  try {
    const tokens = await exchangeGoogleCodeForTokens(code);
    await saveUserGoogleTokens(user.id, tokens);
    return redirectWithClearedState(
      new URL("/businesses?google=connected", baseUrl),
    );
  } catch (callbackError) {
    const message =
      callbackError instanceof Error ? callbackError.message : "oauth_failed";
    return redirectWithClearedState(
      new URL(`/businesses?google_error=${encodeURIComponent(message)}`, baseUrl),
    );
  }
}
