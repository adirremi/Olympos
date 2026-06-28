import { CheckInForm } from "./check-in-form";
import { CheckInList } from "./check-in-list";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CheckInsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let businesses: { id: string; user_id: string; name: string; created_at: string }[] = [];
  let checkIns: unknown[] = [];
  let loadError: string | null = null;

  try {
    if (!user) {
      throw new Error("Not authenticated.");
    }

    const businessesResult = await supabase
      .from("businesses")
      .select("id, user_id, name, created_at")
      .eq("user_id", user.id)
      .order("name");

    if (businessesResult.error) {
      throw new Error(`businesses: ${businessesResult.error.message}`);
    }

    businesses = businessesResult.data ?? [];
    const businessIds = businesses.map((business) => business.id);

    if (businessIds.length > 0) {
      const withMedia = await supabase
        .from("check_ins")
        .select(
          `
          id,
          business_id,
          full_address,
          lat,
          lng,
          description,
          cta_type,
          status,
          created_at,
          businesses ( name ),
          check_in_media ( image_url, media_type, sort_order )
        `,
        )
        .in("business_id", businessIds)
        .order("created_at", { ascending: false })
        .limit(50);

      if (withMedia.error) {
        const withoutMedia = await supabase
          .from("check_ins")
          .select(
            `
            id,
            business_id,
            full_address,
            lat,
            lng,
            description,
            cta_type,
            status,
            created_at,
            businesses ( name )
          `,
          )
          .in("business_id", businessIds)
          .order("created_at", { ascending: false })
          .limit(50);

        if (withoutMedia.error) {
          throw new Error(`check_ins: ${withoutMedia.error.message}`);
        }

        checkIns = withoutMedia.data ?? [];
      } else {
        checkIns = withMedia.data ?? [];
      }
    }
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Failed to load check-ins.";
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Check-ins</h1>
        <p className="mt-1 text-sm text-slate-600">
          Log field jobs with address, notes, and status.
        </p>
      </header>

      {loadError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-medium">Could not load some data:</p>
          <p className="mt-1">{loadError}</p>
          <p className="mt-2 text-xs text-red-700">
            If this mentions a missing column or relationship, run migration 005
            (and 007) in Supabase SQL Editor.
          </p>
        </div>
      ) : null}

      <CheckInForm businesses={businesses} />
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <CheckInList checkIns={checkIns as any} />
    </div>
  );
}
