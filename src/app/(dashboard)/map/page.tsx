import Link from "next/link";
import { joinedBusinessName } from "@/lib/business-name";
import { createClient } from "@/lib/supabase/server";

export default async function MapCheckInsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: businesses } = await supabase
    .from("businesses")
    .select("id")
    .eq("user_id", user!.id);

  const businessIds = businesses?.map((business) => business.id) ?? [];

  const { data: checkIns } =
    businessIds.length > 0
      ? await supabase
          .from("check_ins")
          .select("id, full_address, lat, lng, status, created_at, businesses(name)")
          .in("business_id", businessIds)
          .order("created_at", { ascending: false })
          .limit(100)
      : { data: [] };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Map Check-ins</h1>
        <p className="mt-1 text-sm text-slate-600">
          All logged addresses with coordinates. Interactive map widget comes next.
        </p>
      </header>

      {checkIns?.length ? (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm">
          {checkIns.map((checkIn) => (
            <li key={checkIn.id} className="p-5">
              <p className="font-medium text-slate-900">
                {joinedBusinessName(checkIn.businesses)}
              </p>
              <p className="mt-1 text-sm text-slate-600">{checkIn.full_address}</p>
              <p className="mt-1 font-mono text-xs text-slate-500">
                {checkIn.lat.toFixed(6)}, {checkIn.lng.toFixed(6)}
              </p>
              <a
                href={`https://www.google.com/maps?q=${checkIn.lat},${checkIn.lng}`}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-sm text-slate-700 underline"
              >
                Open in Google Maps
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
          No check-ins with coordinates yet.{" "}
          <Link href="/check-ins" className="font-medium text-slate-900 underline">
            Create one
          </Link>
          .
        </p>
      )}
    </div>
  );
}
