import { WidgetView } from "./widget-view";
import { createClient } from "@/lib/supabase/server";
import type { WidgetData } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function WidgetPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  const supabase = await createClient();

  const { data } = await supabase.rpc("get_widget_data", {
    p_business_id: businessId,
  });

  const widgetData = (data as WidgetData) ?? { business: null, check_ins: [] };

  if (!widgetData.business) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
        Widget not found.
      </div>
    );
  }

  return <WidgetView data={widgetData} />;
}
