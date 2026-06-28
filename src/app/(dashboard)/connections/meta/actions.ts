"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getMetaPages } from "@/lib/meta/api";
import { getUserMetaToken, linkPageToBusiness } from "@/lib/meta/tokens";
import { createClient } from "@/lib/supabase/server";

export async function linkMetaPage(formData: FormData) {
  const businessId = String(formData.get("business_id") ?? "");
  const pageId = String(formData.get("page_id") ?? "");

  let outcome = "/connections?meta=linked";

  try {
    if (!businessId || !pageId) {
      redirect("/connections/meta?error=Please+select+a+business.");
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    const { data: business } = await supabase
      .from("businesses")
      .select("id")
      .eq("id", businessId)
      .eq("user_id", user!.id)
      .maybeSingle();

    if (!business) {
      redirect("/connections/meta?error=Business+not+found.");
    }

    const token = await getUserMetaToken(user!.id);
    if (!token) {
      redirect("/connections?meta_error=not_connected");
    }

    const pages = await getMetaPages(token!.accessToken);
    const page = pages.find((candidate) => candidate.id === pageId);

    if (!page) {
      redirect("/connections/meta?error=Page+not+found.+Reconnect+Facebook.");
    }

    await linkPageToBusiness(businessId, page!, token!.expiresAt);
    revalidatePath("/connections");
  } catch (error) {
    // redirect() throws a special NEXT_REDIRECT error we must rethrow.
    if (
      error instanceof Error &&
      "digest" in error &&
      typeof (error as { digest?: string }).digest === "string" &&
      (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }

    const message = error instanceof Error ? error.message : "Linking failed.";
    outcome = `/connections/meta?error=${encodeURIComponent(message)}`;
  }

  redirect(outcome);
}
