import { NextResponse } from "next/server";
import { META_GRAPH_BASE } from "@/lib/meta/auth";
import { getUserMetaToken } from "@/lib/meta/tokens";
import { createClient } from "@/lib/supabase/server";

// Diagnostic endpoint: shows what the Meta Graph API returns for the connected
// user (pages + granted permissions). Helps debug why no pages appear.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  }

  const token = await getUserMetaToken(user.id);
  if (!token) {
    return NextResponse.json({ error: "No Meta token saved." }, { status: 404 });
  }

  async function graph(path: string) {
    const sep = path.includes("?") ? "&" : "?";
    const response = await fetch(
      `${META_GRAPH_BASE}/${path}${sep}access_token=${token!.accessToken}`,
    );
    return response.json();
  }

  const [me, accounts, permissions] = await Promise.all([
    graph("me?fields=id,name"),
    graph(
      "me/accounts?fields=id,name,access_token,instagram_business_account{id,username}",
    ),
    graph("me/permissions"),
  ]);

  return NextResponse.json(
    {
      me,
      page_count: Array.isArray(accounts?.data) ? accounts.data.length : 0,
      accounts,
      permissions,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
