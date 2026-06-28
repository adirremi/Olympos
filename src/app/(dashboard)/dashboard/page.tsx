import Link from "next/link";
import { joinedBusinessName } from "@/lib/business-name";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { count: businessCount } = await supabase
    .from("businesses")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user!.id);

  const { data: ownedBusinesses } = await supabase
    .from("businesses")
    .select("id")
    .eq("user_id", user!.id);

  const businessIds = ownedBusinesses?.map((business) => business.id) ?? [];

  const { count: checkInCount } =
    businessIds.length > 0
      ? await supabase
          .from("check_ins")
          .select("*", { count: "exact", head: true })
          .in("business_id", businessIds)
      : { count: 0 };

  const { count: publishedCount } =
    businessIds.length > 0
      ? await supabase
          .from("check_ins")
          .select("*", { count: "exact", head: true })
          .in("business_id", businessIds)
          .eq("status", "published")
      : { count: 0 };

  const { data: recentCheckIns } =
    businessIds.length > 0
      ? await supabase
          .from("check_ins")
          .select("id, full_address, status, created_at, businesses(name)")
          .in("business_id", businessIds)
          .order("created_at", { ascending: false })
          .limit(5)
      : { data: [] };

  const stats = [
    { label: "Businesses", value: businessCount ?? 0 },
    { label: "Check-ins", value: checkInCount ?? 0 },
    { label: "Published", value: publishedCount ?? 0 },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">
          Overview of your field jobs and publishing activity.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <article
            key={stat.label}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm text-slate-500">{stat.label}</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">
              {stat.value}
            </p>
          </article>
        ))}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold text-slate-900">Recent check-ins</h2>
          <Link href="/check-ins" className="text-sm text-slate-600 hover:text-slate-900">
            View all
          </Link>
        </div>

        {recentCheckIns?.length ? (
          <ul className="mt-4 divide-y divide-slate-100">
            {recentCheckIns.map((checkIn) => (
              <li key={checkIn.id} className="flex items-start justify-between gap-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {joinedBusinessName(checkIn.businesses)}
                  </p>
                  <p className="text-sm text-slate-600">{checkIn.full_address}</p>
                </div>
                <span className="text-xs uppercase text-slate-500">{checkIn.status}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-slate-600">
            No check-ins yet.{" "}
            <Link href="/check-ins" className="font-medium text-slate-900 underline">
              Log your first one
            </Link>
            .
          </p>
        )}
      </section>
    </div>
  );
}
