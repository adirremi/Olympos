import Link from "next/link";
import { hasGoogleBusinessConnection } from "@/lib/google-business/tokens";
import { hasMetaConnection } from "@/lib/meta/tokens";
import { createClient } from "@/lib/supabase/server";

const providers = [
  {
    id: "gmb",
    name: "Google Business Profile",
    description: "Import locations and publish updates to your Google listing.",
    connectHref: "/api/google-business/connect",
    available: true,
  },
  {
    id: "facebook",
    name: "Facebook Page",
    description: "Post check-ins to your Facebook page.",
    connectHref: "/api/meta/connect",
    available: true,
  },
  {
    id: "instagram",
    name: "Instagram",
    description: "Share field job photos to Instagram (via a linked Page).",
    connectHref: "/api/meta/connect",
    available: true,
  },
  {
    id: "youtube",
    name: "YouTube",
    description: "Upload short job recap videos.",
    available: false,
  },
] as const;

export default async function ConnectionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isGoogleConnected = user ? await hasGoogleBusinessConnection(user.id) : false;
  const isMetaConnected = user ? await hasMetaConnection(user.id) : false;

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

  const gmbConnections = connections?.filter((row) => row.provider === "gmb") ?? [];

  const businessesWithMeta = (businesses ?? [])
    .map((business) => {
      const rows = connections?.filter(
        (row) => row.business_id === business.id,
      );
      return {
        ...business,
        facebook: rows?.find((row) => row.provider === "facebook") ?? null,
        instagram: rows?.find((row) => row.provider === "instagram") ?? null,
      };
    })
    .filter((business) => business.facebook || business.instagram);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Connections</h1>
        <p className="mt-1 text-sm text-slate-600">
          Connect Google Business to import locations. Other platforms come next.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {providers.map((provider) => {
          const connection =
            provider.id === "gmb"
              ? gmbConnections[0]
              : connections?.find((row) => row.provider === provider.id);

          const isMeta = provider.id === "facebook" || provider.id === "instagram";
          const isConnected =
            provider.id === "gmb"
              ? isGoogleConnected || connection?.status === "connected"
              : isMeta
                ? isMetaConnected || connection?.status === "connected"
                : connection?.status === "connected";

          const connectHref =
            "connectHref" in provider ? provider.connectHref : undefined;
          const connectLabel = isConnected
            ? provider.id === "gmb"
              ? "Reconnect Google"
              : "Manage / Reconnect"
            : provider.id === "gmb"
              ? "Connect Google Business"
              : "Connect";

          return (
            <article
              key={provider.id}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-slate-900">{provider.name}</h2>
                  <p className="mt-1 text-sm text-slate-600">{provider.description}</p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    isConnected
                      ? "bg-green-100 text-green-800"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {isConnected ? "connected" : "disconnected"}
                </span>
              </div>

              {connection?.account_name ? (
                <p className="mt-3 text-xs text-slate-500">
                  Connected as {connection.account_name}
                </p>
              ) : null}

              {provider.available && connectHref ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={connectHref}
                    className="inline-flex h-9 items-center justify-center rounded-lg bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    {connectLabel}
                  </Link>
                  {isMeta && isMetaConnected ? (
                    <Link
                      href="/connections/meta"
                      className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Choose pages
                    </Link>
                  ) : null}
                </div>
              ) : (
                <button
                  type="button"
                  disabled
                  className="mt-4 h-9 rounded-lg border border-slate-200 px-3 text-sm text-slate-500"
                >
                  Coming soon
                </button>
              )}
            </article>
          );
        })}
      </div>

      {isMetaConnected ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Linked social accounts
            </h2>
            <Link
              href="/connections/meta"
              className="text-sm font-medium text-slate-900 underline"
            >
              Edit links
            </Link>
          </div>

          {businessesWithMeta.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
              Facebook is connected, but no Page is linked to a business yet.{" "}
              <Link
                href="/connections/meta"
                className="font-medium text-slate-900 underline"
              >
                Choose pages
              </Link>
            </p>
          ) : (
            <ul className="space-y-3">
              {businessesWithMeta.map((business) => (
                <li
                  key={business.id}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <p className="font-semibold text-slate-900">{business.name}</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm">
                      <span className="font-medium text-blue-800">Facebook</span>
                      <span className="text-slate-600">
                        {business.facebook?.account_name ?? "Not linked"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg bg-pink-50 px-3 py-2 text-sm">
                      <span className="font-medium text-pink-800">Instagram</span>
                      <span className="text-slate-600">
                        {business.instagram?.account_name
                          ? `@${business.instagram.account_name}`
                          : "Not linked"}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {isGoogleConnected ? (
        <p className="text-sm text-slate-600">
          Google connected. Go to{" "}
          <Link href="/businesses" className="font-medium text-slate-900 underline">
            My Businesses
          </Link>{" "}
          to import locations.
        </p>
      ) : null}
    </div>
  );
}
