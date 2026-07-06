import { headers } from "next/headers";
import { EmbedCode } from "./embed-code";
import { createClient } from "@/lib/supabase/server";

export default async function WidgetSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: businesses } = await supabase
    .from("businesses")
    .select("id, name")
    .eq("user_id", user!.id)
    .order("name");

  // Derive the public base URL from the current request so preview links and
  // embed snippets always point at the real deployment (falls back to env).
  const headerList = await headers();
  const host =
    headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "";
  const proto = headerList.get("x-forwarded-proto") ?? "https";
  const baseUrl =
    process.env.APP_BASE_URL ??
    (host ? `${proto}://${host}` : "https://olympossync.com");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Widget</h1>
        <p className="mt-1 text-sm text-slate-600">
          Embed your published check-ins on any website. Only check-ins marked{" "}
          <span className="font-medium">published</span> appear in the widget.
        </p>
      </header>

      {!businesses?.length ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
          Create a business first.
        </p>
      ) : (
        <ul className="space-y-4">
          {businesses.map((business) => (
            <li
              key={business.id}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <h2 className="font-semibold text-slate-900">{business.name}</h2>
              <div className="mt-3">
                <EmbedCode businessId={business.id} baseUrl={baseUrl} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
