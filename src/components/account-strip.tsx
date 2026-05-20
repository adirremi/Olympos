import Link from "next/link";
import { signOut } from "@/lib/auth-actions";
import { createClient } from "@/lib/supabase/server";

export async function AccountStrip() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let firstName: string | null = null;
  if (user) {
    const { data } = await supabase
      .from("users")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle<{ full_name: string | null }>();
    firstName =
      data?.full_name?.split(" ")[0] ?? user.email?.split("@")[0] ?? null;
  }

  return (
    <nav className="font-stencil flex items-center justify-between gap-3 rounded-2xl border border-slate-200/70 bg-white/85 px-3 py-2 text-xs shadow-sm backdrop-blur md:px-4 md:py-2.5">
      <Link
        href="/"
        className="shrink-0 text-sm font-bold tracking-widest text-slate-900"
      >
        אולימפוס
      </Link>

      <div className="no-scrollbar flex min-w-0 flex-1 items-center justify-end gap-2 overflow-x-auto">
        {user ? (
          <>
            {firstName ? (
              <span className="hidden text-slate-500 md:inline">
                שלום, {firstName}
              </span>
            ) : null}
            <Link
              href="/dashboard"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-700 transition hover:border-slate-400 hover:bg-slate-900 hover:text-white"
            >
              פאנל אישי
            </Link>
            <Link
              href="/today"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-700 transition hover:border-slate-400 hover:bg-slate-900 hover:text-white"
            >
              אימון היום
            </Link>
            <Link
              href="/performance"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-700 transition hover:border-slate-400 hover:bg-slate-900 hover:text-white"
            >
              ביצועים
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-lg border border-red-200 px-3 py-1.5 text-red-600 transition hover:bg-red-600 hover:text-white"
              >
                התנתק
              </button>
            </form>
          </>
        ) : (
          <Link
            href="/login"
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-white transition hover:bg-slate-700"
          >
            התחבר
          </Link>
        )}
      </div>
    </nav>
  );
}
