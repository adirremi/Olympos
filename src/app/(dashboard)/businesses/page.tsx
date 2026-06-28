import { BusinessManager } from "./business-manager";
import { GoogleBusinessImport } from "./google-import";
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

  const isGoogleConnected = user ? await hasGoogleBusinessConnection(user.id) : false;

  const { data: businesses } = await supabase
    .from("businesses")
    .select(
      `
      id,
      user_id,
      name,
      source,
      address,
      gmb_location_id,
      created_at,
      business_invitations (
        id,
        email,
        status,
        expires_at,
        invited_by,
        role,
        token,
        accepted_at,
        created_at,
        business_id
      )
    `,
    )
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">My Businesses</h1>
        <p className="mt-1 text-sm text-slate-600">
          Import from Google Business or add manually.
        </p>
      </header>

      <GoogleBusinessImport
        isConnected={isGoogleConnected}
        googleStatus={params.google}
        googleError={params.google_error}
      />

      <BusinessManager businesses={businesses ?? []} />
    </div>
  );
}
