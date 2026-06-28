import { createClient } from "@/lib/supabase/server";

const providers = [
  {
    id: "gmb",
    name: "Google Business Profile",
    description: "Publish updates to your Google listing.",
  },
  {
    id: "facebook",
    name: "Facebook Page",
    description: "Post check-ins to your Facebook page.",
  },
  {
    id: "instagram",
    name: "Instagram",
    description: "Share field job photos to Instagram.",
  },
  {
    id: "youtube",
    name: "YouTube",
    description: "Upload short job recap videos.",
  },
] as const;

export default async function ConnectionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: businesses } = await supabase
    .from("businesses")
    .select("id, name")
    .eq("user_id", user!.id)
    .order("name");

  const businessIds = businesses?.map((business) => business.id) ?? [];

  const { data: connections } =
    businessIds.length > 0
      ? await supabase
          .from("platform_connections")
          .select("id, business_id, provider, account_name, status")
          .in("business_id", businessIds)
      : { data: [] };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Connections</h1>
        <p className="mt-1 text-sm text-slate-600">
          Connect social accounts once. Published check-ins will use these
          connections automatically in the next phase.
        </p>
      </header>

      {!businesses?.length ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
          Create a business first, then connect platforms here.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {providers.map((provider) => {
            const connection = connections?.find(
              (row) => row.provider === provider.id,
            );

            return (
              <article
                key={provider.id}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-slate-900">{provider.name}</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      {provider.description}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      connection?.status === "connected"
                        ? "bg-green-100 text-green-800"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {connection?.status ?? "disconnected"}
                  </span>
                </div>

                {connection?.account_name ? (
                  <p className="mt-3 text-xs text-slate-500">
                    Connected as {connection.account_name}
                  </p>
                ) : null}

                <button
                  type="button"
                  disabled
                  className="mt-4 h-9 rounded-lg border border-slate-200 px-3 text-sm text-slate-500"
                  title="OAuth wiring comes in Phase 4"
                >
                  Connect (Phase 4)
                </button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
