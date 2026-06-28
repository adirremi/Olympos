import Link from "next/link";
import { hasGoogleBusinessConnection } from "@/lib/google-business/tokens";
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
    available: false,
  },
  {
    id: "instagram",
    name: "Instagram",
    description: "Share field job photos to Instagram.",
    available: false,
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

          const isConnected =
            provider.id === "gmb"
              ? isGoogleConnected || connection?.status === "connected"
              : connection?.status === "connected";

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

              {provider.available && provider.id === "gmb" ? (
                <Link
                  href="/api/google-business/connect"
                  className="mt-4 inline-flex h-9 items-center justify-center rounded-lg bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-800"
                >
                  {isConnected ? "Reconnect Google" : "Connect Google Business"}
                </Link>
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
