import { BusinessManager } from "./business-manager";
import { GoogleBusinessImport } from "./google-import";
import { getBusinessesForUser } from "@/lib/businesses";
import { hasGoogleBusinessConnection } from "@/lib/google-business/tokens";
import { createClient } from "@/lib/supabase/server";

type BusinessesPageProps = {
  searchParams: Promise<{
    google?: string;
    google_error?: string;
  }>;
};

export default async function BusinessesPage({ searchParams }: BusinessesPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const isGoogleConnected = await hasGoogleBusinessConnection(user.id);
  const { businesses, dbWarning } = await getBusinessesForUser(user.id);
  const googleConfigured = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">My Businesses</h1>
        <p className="mt-1 text-sm text-slate-600">
          Import from Google Business or add manually.
        </p>
      </header>

      {!googleConfigured ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Google Business connect requires{" "}
          <code className="rounded bg-amber-100 px-1">SUPABASE_SERVICE_ROLE_KEY</code>{" "}
          in Vercel environment variables, then redeploy.
        </p>
      ) : null}

      {dbWarning ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {dbWarning}
        </p>
      ) : null}

      <GoogleBusinessImport
        isConnected={isGoogleConnected}
        googleStatus={params.google}
        googleError={params.google_error}
      />

      <BusinessManager businesses={businesses} />
    </div>
  );
}
