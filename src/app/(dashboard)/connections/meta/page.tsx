import Link from "next/link";
import { linkMetaPage } from "./actions";
import { getMetaPages } from "@/lib/meta/api";
import { getUserMetaToken } from "@/lib/meta/tokens";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MetaSelectPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const token = user ? await getUserMetaToken(user.id) : null;

  if (!token) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900">Connect Facebook</h1>
        <p className="text-sm text-slate-600">
          You are not connected yet.{" "}
          <Link
            href="/api/meta/connect"
            className="font-medium text-slate-900 underline"
          >
            Connect Facebook
          </Link>
        </p>
      </div>
    );
  }

  const { data: businesses } = await supabase
    .from("businesses")
    .select("id, name")
    .eq("user_id", user!.id)
    .order("name");

  let pages: Awaited<ReturnType<typeof getMetaPages>> = [];
  let fetchError: string | null = null;

  try {
    pages = await getMetaPages(token.accessToken);
  } catch (error) {
    fetchError = error instanceof Error ? error.message : "Failed to load pages.";
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">
          Link Facebook &amp; Instagram
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Choose which Page to connect to each business. Posts will publish to the
          Page and its linked Instagram account.
        </p>
      </header>

      {fetchError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {fetchError}
        </p>
      ) : null}

      {!businesses?.length ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
          Create a business first.
        </p>
      ) : pages.length === 0 && !fetchError ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
          No Facebook Pages found on this account. Make sure you manage at least
          one Page, then reconnect.
        </p>
      ) : (
        <ul className="space-y-4">
          {pages.map((page) => (
            <li
              key={page.id}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{page.name}</p>
                  <p className="text-xs text-slate-500">
                    {page.instagram_business_account
                      ? `Instagram: @${page.instagram_business_account.username ?? page.instagram_business_account.id}`
                      : "No linked Instagram account"}
                  </p>
                </div>
              </div>

              <form action={linkMetaPage} className="mt-3 flex flex-wrap gap-2">
                <input type="hidden" name="page_id" value={page.id} />
                <select
                  name="business_id"
                  required
                  defaultValue=""
                  className="h-9 rounded-lg border border-slate-200 px-3 text-sm"
                >
                  <option value="" disabled>
                    Select business…
                  </option>
                  {businesses.map((business) => (
                    <option key={business.id} value={business.id}>
                      {business.name}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="h-9 rounded-lg bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-800"
                >
                  Link this Page
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <Link href="/connections" className="text-sm text-slate-600 underline">
        Back to Connections
      </Link>
    </div>
  );
}
