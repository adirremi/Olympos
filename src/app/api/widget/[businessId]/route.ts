import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { WidgetData } from "@/types/database";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ businessId: string }> },
) {
  const { businessId } = await params;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_widget_data", {
    p_business_id: businessId,
  });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: corsHeaders },
    );
  }

  const widgetData = (data as WidgetData) ?? { business: null, check_ins: [] };

  if (!widgetData.business) {
    return NextResponse.json(
      { error: "Business not found." },
      { status: 404, headers: corsHeaders },
    );
  }

  return NextResponse.json(widgetData, {
    headers: {
      ...corsHeaders,
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
