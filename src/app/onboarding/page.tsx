import { redirect } from "next/navigation";
import { getProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getProfile(user.id);

  if (profile?.onboarding_completed_at) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Welcome</h1>
        <p className="mt-2 text-sm text-slate-600">
          Set up your account and first business to start logging field jobs.
        </p>
        <div className="mt-8">
          <OnboardingForm />
        </div>
      </section>
    </main>
  );
}
