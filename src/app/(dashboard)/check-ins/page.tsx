import { CheckInForm } from "./check-in-form";
import { CheckInList } from "./check-in-list";
import { createClient } from "@/lib/supabase/server";

export default async function CheckInsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: businesses } = await supabase
    .from("businesses")
    .select("id, user_id, name, created_at")
    .eq("user_id", user!.id)
    .order("name");

  const businessIds = businesses?.map((business) => business.id) ?? [];

  const { data: checkIns } =
    businessIds.length > 0
      ? await supabase
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
          .limit(50)
      : { data: [] };

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Check-ins</h1>
        <p className="mt-1 text-sm text-slate-600">
          Log field jobs with address, notes, and status.
        </p>
      </header>

      <CheckInForm businesses={businesses ?? []} />
      <CheckInList checkIns={checkIns ?? []} />
    </div>
  );
}
