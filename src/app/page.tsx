import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-lg space-y-8 text-center">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-wider text-slate-500">
            Field jobs SaaS
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            Log check-ins. Show your work on the map.
          </h1>
          <p className="text-base text-slate-600">
            A dashboard for local businesses to track field jobs, upload
            photos, and publish to social platforms.
          </p>
        </div>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/login"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-slate-900 px-6 text-sm font-medium text-white hover:bg-slate-800"
          >
            Sign in with Google
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-6 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
