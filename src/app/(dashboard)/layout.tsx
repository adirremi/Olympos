import { redirect } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { signOut } from "@/lib/auth-actions";
import { acceptPendingInvitations } from "@/lib/invitations";
import { getProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  try {
    await acceptPendingInvitations(user.id, user.email);
  } catch {
    // Invitations table may not exist yet — ignore during migration rollout.
  }

  let profile = null;
  try {
    profile = await getProfile(user.id);
  } catch {
    profile = null;
  }

  if (!profile?.onboarding_completed_at) {
    redirect("/onboarding");
  }

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <DashboardSidebar userEmail={user.email} signOutAction={signOut} />
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
