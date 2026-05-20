import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountStrip } from "@/components/account-strip";
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
    <main className="min-h-screen px-5 py-10">
      <div className="mx-auto max-w-xl space-y-6">
        <AccountStrip />

        <section className="brutal-border brutal-shadow-blood relative bg-paper p-8">
          <div className="absolute -inset-[3px] border border-blood pointer-events-none" />

          <div className="font-stencil mb-5 flex items-center justify-between border-b-2 border-ink pb-3 text-sm">
            <Link href="/" className="hover:text-blood">
              → חזרה
            </Link>
            <span className="flex items-center gap-2">
              <span className="pulse-dot" />
              נקודת כניסה
            </span>
          </div>

          <h1 className="font-display text-5xl leading-none md:text-7xl">
            כניסה
            <br />
            <span className="text-blood">לחניך.</span>
          </h1>

          <p className="mt-5 leading-7 text-steel">
            התחברות פעם ראשונה דרך Google. אחרי זה ממלאים שאלון פתיחה
            ומקבלים אימון יומי.
          </p>

          <div className="mt-7">
            <GoogleButton />
          </div>

          <div className="font-stencil mt-7 flex items-center justify-between border-t-2 border-ink pt-4 text-xs text-steel">
            <span>אולימפוס · 2026</span>
            <span>אין ויתורים</span>
          </div>
        </section>
      </div>
    </main>
  );
}
