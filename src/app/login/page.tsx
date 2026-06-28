import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GoogleButton } from "./google-button";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <Link
          href="/"
          className="text-sm text-slate-500 transition-colors hover:text-slate-900"
        >
          ← Back
        </Link>

        <div className="mt-6 space-y-2">
          <h1 className="text-2xl font-semibold text-slate-900">Sign in</h1>
          <p className="text-sm text-slate-600">
            Use your Google account to access your field jobs dashboard.
          </p>
        </div>

        <div className="mt-8">
          <GoogleButton />
        </div>
      </section>
    </main>
  );
}
