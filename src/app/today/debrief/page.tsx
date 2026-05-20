import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountStrip } from "@/components/account-strip";
import { DebriefForm } from "@/components/debrief-form";
import { createClient } from "@/lib/supabase/server";
import { getUnitTheme } from "@/lib/units";

type LogRow = {
  id: string;
  user_id: string;
  scheduled_for: string;
  workout_snapshot: { name?: string } | null;
};

type DebriefRow = {
  rpe: number;
  perceived_pace: "cant_keep_up" | "on_target" | "could_do_more";
  has_pain: boolean;
  pain_locations: string[];
  coach_note: string | null;
};

export default async function DebriefPage({
  searchParams,
}: {
  searchParams: Promise<{ log?: string; done?: string }>;
}) {
  const params = await searchParams;
  const logId = params.log;
  const isDone = params.done === "1";

  if (!logId) {
    redirect("/today");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: log } = await supabase
    .from("training_log")
    .select("id, user_id, scheduled_for, workout_snapshot")
    .eq("id", logId)
    .eq("user_id", user.id)
    .maybeSingle<LogRow>();

  if (!log) {
    redirect("/today");
  }

  const { data: profile } = await supabase
    .from("user_profile")
    .select("recruitment_target")
    .eq("user_id", user.id)
    .maybeSingle<{ recruitment_target: string }>();

  const theme = getUnitTheme(profile?.recruitment_target);

  const { data: existing } = await supabase
    .from("training_debriefs")
    .select("rpe, perceived_pace, has_pain, pain_locations, coach_note")
    .eq("training_log_id", logId)
    .maybeSingle<DebriefRow>();

  const workoutName = log.workout_snapshot?.name ?? "אימון יומי";

  const pageStyle = {
    "--unit-primary": theme.palette.primary,
    "--unit-secondary": theme.palette.secondary,
    "--unit-accent": theme.palette.accent,
    "--unit-surface": theme.palette.surface,
    "--unit-on": theme.palette.onPrimary,
  } as React.CSSProperties;

  if (isDone && existing) {
    return (
      <main className="unit-page px-4 py-10 md:px-6" style={pageStyle}>
        <div className="mx-auto max-w-3xl space-y-6">
          <AccountStrip />
          <DebriefDone
            theme={theme}
            workoutName={workoutName}
            rpe={existing.rpe}
            hasPain={existing.has_pain}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="unit-page px-4 py-10 md:px-6" style={pageStyle}>
      <div className="mx-auto max-w-3xl space-y-6">
        <AccountStrip />

        <section
          className="unit-hero p-7 md:p-9"
          style={{
            color: theme.palette.onPrimary,
            background: `linear-gradient(140deg, ${theme.palette.primary} 0%, ${theme.palette.secondary} 100%)`,
          }}
        >
          <div className={`ambience ambience-${theme.ambience}`} aria-hidden />
          <div className="relative z-10">
            <div
              className="font-stencil inline-block rounded-md px-3 py-1 text-xs"
              style={{
                background: "rgba(0,0,0,0.3)",
                color: theme.palette.accent,
                border: `1px solid ${theme.palette.accent}55`,
              }}
            >
              תחקור משימה
            </div>
            <h1 className="font-display mt-3 text-4xl leading-tight md:text-5xl">
              סיימת את {workoutName}.
            </h1>
            <p className="mt-3 max-w-xl text-base leading-7 opacity-90">
              שלוש שאלות זריזות. זה הדלק לתוכנית שלך מחר - וזה יציל אותך
              מפציעות שתופסות חבר&apos;ה לפני צבא.
            </p>
          </div>
        </section>

        <DebriefForm
          logId={logId}
          theme={theme}
          existing={existing ?? null}
        />

        <Link
          href="/today"
          className="font-stencil block text-center text-sm text-slate-500 hover:text-slate-800"
        >
          חזרה לאימון
        </Link>
      </div>
    </main>
  );
}

function DebriefDone({
  theme,
  workoutName,
  rpe,
  hasPain,
}: {
  theme: ReturnType<typeof getUnitTheme>;
  workoutName: string;
  rpe: number;
  hasPain: boolean;
}) {
  const message = motivationFor(rpe, theme.hebrewName);

  return (
    <section
      className="unit-hero p-8 md:p-10"
      style={{
        color: theme.palette.onPrimary,
        background: `linear-gradient(140deg, ${theme.palette.primary} 0%, ${theme.palette.secondary} 100%)`,
      }}
    >
      <div className={`ambience ambience-${theme.ambience}`} aria-hidden />
      <div className="relative z-10 space-y-5">
        <div
          className="font-stencil inline-block rounded-md px-3 py-1 text-xs"
          style={{
            background: "rgba(0,0,0,0.3)",
            color: theme.palette.accent,
            border: `1px solid ${theme.palette.accent}55`,
          }}
        >
          דיווח נקלט
        </div>
        <h1 className="font-display text-4xl leading-tight md:text-5xl">
          סגרת את {workoutName}.
        </h1>
        <p className="text-lg leading-8 opacity-95">{message}</p>

        {hasPain ? (
          <div
            className="rounded-2xl p-4"
            style={{
              background: "rgba(0,0,0,0.25)",
              border: `1px solid ${theme.palette.accent}55`,
            }}
          >
            <p className="text-sm leading-7 opacity-90">
              סימנת כאב. אם זה חוזר על עצמו, האימון הבא ישונה אוטומטית - והמאמן
              יקבל התראה.
            </p>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href="/dashboard"
            className="unit-button is-solid"
            style={
              {
                "--unit-primary": theme.palette.accent,
                "--unit-on": theme.palette.ink,
              } as React.CSSProperties
            }
          >
            חזרה לפאנל →
          </Link>
          <Link
            href="/performance"
            className="unit-button is-ghost"
            style={
              {
                "--unit-primary": theme.palette.onPrimary,
                color: theme.palette.onPrimary,
              } as React.CSSProperties
            }
          >
            לעמוד הביצועים
          </Link>
        </div>
      </div>
    </section>
  );
}

function motivationFor(rpe: number, unitHebrew: string): string {
  if (rpe <= 3) {
    return `היה לך קל מדי. נעלה את העומס באימון הבא כדי לקרב אותך ל${unitHebrew}.`;
  }
  if (rpe <= 6) {
    return `בדיוק בקצב. ממשיכים בתוכנית ונבנים שכבה אחר שכבה ל${unitHebrew}.`;
  }
  if (rpe <= 8) {
    return `אימון איכותי. שינה טובה הלילה, מים, חלבון - והגוף יחזיר את העבודה.`;
  }
  return `קשה באימונים, קל בקרב. עוד אימון כזה ואתה צעד נוסף ל${unitHebrew}.`;
}
