"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getMetaPages } from "@/lib/meta/api";
import { getUserMetaToken, linkPageToBusiness } from "@/lib/meta/tokens";
import { createClient } from "@/lib/supabase/server";

export async function linkMetaPage(formData: FormData) {
  const businessId = String(formData.get("business_id") ?? "");
  const pageId = String(formData.get("page_id") ?? "");

  if (!businessId || !pageId) {
    redirect("/connections/meta?error=missing_selection");
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
    redirect("/connections/meta?error=invalid_business");
  }

  const token = await getUserMetaToken(user!.id);
  if (!token) {
    redirect("/connections?meta_error=not_connected");
  }

  const pages = await getMetaPages(token!.accessToken);
  const page = pages.find((candidate) => candidate.id === pageId);

  if (!page) {
    redirect("/connections/meta?error=page_not_found");
  }

  await linkPageToBusiness(businessId, page!, token!.expiresAt);

  revalidatePath("/connections");
  redirect("/connections?meta=linked");
}
