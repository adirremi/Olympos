import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountStrip } from "@/components/account-strip";
import { createClient } from "@/lib/supabase/server";
import { getUnitTheme, type UnitTheme } from "@/lib/units";
import { parseWorkoutSnapshot } from "@/lib/workout";
import { markWorkoutCompleted, markWorkoutMissed } from "./actions";

type ProfileRow = {
  recruitment_target: string;
  training_level: string;
};

type PlanRow = {
  id: string;
  day_in_week: number;
  workout_name: string;
  workout_type: string;
  details: unknown;
};

type TodayLogRow = {
  status: string;
};

const STATUS_HEBREW: Record<string, string> = {
  scheduled: "מתוכנן",
  completed: "בוצע",
  missed: "פוספס",
  skipped: "דולג",
};

export default async function TodayPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("user_profile")
    .select("recruitment_target,training_level")
    .eq("user_id", user.id)
    .maybeSingle<ProfileRow>();

  if (!profile) {
    redirect("/onboarding");
  }

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("cohort_id")
    .eq("user_id", user.id)
    .maybeSingle<{ cohort_id: string | null }>();

  const cohortId = enrollment?.cohort_id ?? null;
  const currentDay = new Date().getDay() + 1;

  const { data: todayPlan } = cohortId
    ? await supabase
        .from("training_plans")
        .select("id,day_in_week,workout_name,workout_type,details")
        .eq("cohort_id", cohortId)
        .eq("week_number", 1)
        .eq("day_in_week", currentDay)
        .maybeSingle<PlanRow>()
    : { data: null };

  const today = new Date().toISOString().slice(0, 10);
  const { data: todayLog } = await supabase
    .from("training_log")
    .select("status")
    .eq("user_id", user.id)
    .eq("scheduled_for", today)
    .maybeSingle<TodayLogRow>();

  const theme = getUnitTheme(profile.recruitment_target);
  const snapshot = parseWorkoutSnapshot(todayPlan?.details);
  const status = todayLog?.status ?? "scheduled";

  const isRestDay = todayPlan?.workout_type === "rest";
  const hasPlan = Boolean(todayPlan?.id);

  const pageStyle = {
    "--unit-primary": theme.palette.primary,
    "--unit-secondary": theme.palette.secondary,
    "--unit-accent": theme.palette.accent,
    "--unit-surface": theme.palette.surface,
    "--unit-on": theme.palette.onPrimary,
  } as React.CSSProperties;

  return (
    <main className="unit-page px-4 py-10 md:px-6" style={pageStyle}>
      <section className="mx-auto max-w-4xl space-y-6">
        <AccountStrip />

        <div className="font-stencil flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white/80 px-4 py-2 text-xs text-slate-600 backdrop-blur">
          <Link href="/dashboard" className="hover:text-slate-900">
            → דשבורד
          </Link>
          <span style={{ color: theme.palette.primary }}>
            {theme.hebrewName}
          </span>
          <span className="flex items-center gap-2">
            <span className="pulse-dot" />
            {formatToday(today)}
          </span>
        </div>

        {hasPlan ? (
          <WorkoutCard
            status={status}
            theme={theme}
            snapshot={snapshot}
            isRestDay={isRestDay}
          />
        ) : (
          <EmptyState theme={theme} />
        )}
      </section>
    </main>
  );
}

function formatToday(value: string) {
  return new Intl.DateTimeFormat("he-IL", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

function WorkoutCard({
  status,
  theme,
  snapshot,
  isRestDay,
}: {
  status: string;
  theme: UnitTheme;
  snapshot: ReturnType<typeof parseWorkoutSnapshot>;
  isRestDay: boolean;
}) {
  return (
    <article className="unit-card overflow-hidden">
      <header
        className="flex flex-wrap items-center justify-between gap-3 px-7 py-5"
        style={{
          background: `linear-gradient(135deg, ${theme.palette.primary}, ${theme.palette.secondary})`,
          color: theme.palette.onPrimary,
        }}
      >
        <div>
          <div
            className="font-stencil text-[11px] tracking-widest"
            style={{ color: theme.palette.accent }}
          >
            {theme.hebrewName} · {snapshot.tag ?? "אימון"}
          </div>
          <h1 className="font-display text-3xl leading-none md:text-4xl">
            {snapshot.name ?? "אימון יומי"}
          </h1>
        </div>
        <div
          className="font-stencil rounded-full px-3 py-1 text-[11px] tracking-widest"
          style={{
            background: "rgba(0,0,0,0.25)",
            border: "1px solid rgba(255,255,255,0.18)",
          }}
        >
          {STATUS_HEBREW[status] ?? status}
        </div>
      </header>

      <div className="space-y-5 p-7">
        {snapshot.warmup ? (
          <div
            className="font-stencil inline-block rounded-md px-4 py-2 text-sm"
            style={{
              background: `${theme.palette.primary}10`,
              color: theme.palette.primary,
              border: `1px solid ${theme.palette.primary}25`,
            }}
          >
            ⚡ חימום · {snapshot.warmup}
          </div>
        ) : null}

        <div className="space-y-5">
          {(snapshot.blocks ?? []).map((block) => (
            <BlockView key={block.title} block={block} theme={theme} />
          ))}
        </div>

        {snapshot.finisher ? (
          <div
            className="rounded-2xl p-5"
            style={{
              background: `${theme.palette.primary}08`,
              border: `1px solid ${theme.palette.primary}20`,
            }}
          >
            <div
              className="font-stencil text-xs tracking-widest"
              style={{ color: theme.palette.primary }}
            >
              משימת סיום
            </div>
            <div className="font-display mt-1 text-2xl text-slate-900">
              {snapshot.finisher}
            </div>
          </div>
        ) : null}

        {snapshot.cooldown ? (
          <div className="border-t border-dashed border-slate-200 pt-4 text-sm text-slate-500">
            סיום · {snapshot.cooldown}
          </div>
        ) : null}

        {isRestDay ? (
          <div
            className="rounded-2xl p-5"
            style={{
              background: `${theme.palette.accent}18`,
              border: `1px solid ${theme.palette.accent}`,
              color: theme.palette.ink,
            }}
          >
            <p className="font-display text-2xl">יום מנוחה</p>
            <p className="mt-1 text-sm opacity-80">
              אפשר ללכת, להתמתח, לאכול ולישון.
            </p>
          </div>
        ) : (
          <div
            className="rounded-2xl p-5"
            style={{
              background: `${theme.palette.primary}08`,
              border: `1px solid ${theme.palette.primary}18`,
            }}
          >
            <div className="mb-4">
              <h2 className="font-display text-2xl text-slate-900">
                דיווח ביצוע אימון
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                האם ביצעת את האימון של היום? אם כן, תעבור מיד לתחקור קצר.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <form action={markWorkoutCompleted}>
                <button
                  type="submit"
                  className="unit-button is-solid w-full text-base"
                  style={
                    {
                      "--unit-primary": theme.palette.primary,
                      "--unit-on": theme.palette.onPrimary,
                    } as React.CSSProperties
                  }
                >
                  ביצעתי את האימון
                </button>
              </form>
              <form action={markWorkoutMissed}>
                <button
                  type="submit"
                  className="unit-button is-ghost w-full text-base"
                  style={
                    {
                      "--unit-primary": theme.palette.primary,
                      color: theme.palette.primary,
                    } as React.CSSProperties
                  }
                >
                  לא ביצעתי היום
                </button>
              </form>
            </div>
          </div>
        )}

        <div className="font-stencil border-t border-slate-200 pt-4 text-xs tracking-widest text-slate-500">
          יחידה · {theme.hebrewName}
        </div>
      </div>
    </article>
  );
}

function BlockView({
  block,
  theme,
}: {
  block: { title: string; sets?: string; rest?: string; exercises?: string[] };
  theme: UnitTheme;
}) {
  return (
    <section className="border-t border-dashed border-slate-200 pt-4 first:border-0 first:pt-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display flex items-center gap-3 text-2xl text-slate-900">
          <span
            className="block h-2 w-7 rounded-full"
            style={{ background: theme.palette.accent }}
          />
          {block.title}
        </h2>
        {block.sets ? (
          <span
            className="font-stencil text-2xl"
            style={{ color: theme.palette.primary }}
          >
            {block.sets}
          </span>
        ) : null}
      </div>

      {block.exercises ? (
        <ul className="mt-3 space-y-2">
          {block.exercises.map((line) => (
            <li key={line} className="flex items-start gap-2 text-base text-slate-700">
              <span className="font-bold" style={{ color: theme.palette.accent }}>
                ▸
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {block.rest ? (
        <div
          className="font-stencil mt-3 inline-block rounded-md px-3 py-1 text-xs"
          style={{
            background: `${theme.palette.accent}22`,
            color: theme.palette.ink,
            border: `1px solid ${theme.palette.accent}66`,
          }}
        >
          ⏱ מנוחה · {block.rest}
        </div>
      ) : null}
    </section>
  );
}

function EmptyState({ theme }: { theme: UnitTheme }) {
  return (
    <div className="unit-card p-10 text-center">
      <div className="font-stencil text-xs tracking-widest text-slate-500">
        אין תבנית
      </div>
      <h1 className="font-display mt-2 text-3xl text-slate-900">
        אין אימון להיום
      </h1>
      <p className="mt-3 text-slate-600">
        ייתכן שהקבצה זו עוד לא קיבלה תבנית. עדכן את המאמן לפני שממשיכים.
      </p>
      <Link
        href="/dashboard"
        className="unit-button is-solid mt-5 inline-flex"
        style={
          {
            "--unit-primary": theme.palette.primary,
            "--unit-on": theme.palette.onPrimary,
          } as React.CSSProperties
        }
      >
        חזרה לדשבורד
      </Link>
    </div>
  );
}
