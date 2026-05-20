import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountStrip } from "@/components/account-strip";
import { SettingsDatesButton } from "@/components/settings-dates-button";
import { UnitEmblem } from "@/components/unit-emblem";
import {
  baselineFromQuestionnaire,
  formatRunTime,
  getPerformanceInsight,
  trainingLevelLabel,
  type TrainingLevel,
} from "@/lib/performance";
import { createClient } from "@/lib/supabase/server";
import { getUnitTheme, type UnitTheme } from "@/lib/units";
import { parseWorkoutSnapshot } from "@/lib/workout";
import { updateReadinessLevel } from "./actions";

type ProfileRow = {
  recruitment_target: string;
  training_level: string;
  questionnaire_data: unknown;
  target_event_date: string | null;
  gibush_date: string | null;
  sayeret_day_date: string | null;
  readiness_level: number;
};

type PlanRow = {
  id: string;
  day_in_week: number;
  workout_name: string;
  workout_type: string;
  details: unknown;
};

type LogStatusRow = {
  scheduled_for: string;
  status: string;
};

type PerformanceRow = {
  test_month: string;
  run_2000_seconds: number;
  pullups: number;
  pushups: number;
  derived_training_level: TrainingLevel;
};

const HEBREW_DAYS = [
  "",
  "ראשון",
  "שני",
  "שלישי",
  "רביעי",
  "חמישי",
  "שישי",
  "שבת",
];

const STATUS_HEBREW: Record<string, string> = {
  scheduled: "מתוכנן",
  completed: "בוצע",
  missed: "פוספס",
  skipped: "דולג",
};

function statusLabel(status: string | undefined): string {
  if (!status) return "—";
  return STATUS_HEBREW[status] ?? status;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function daysUntil(value: string | null): number | null {
  if (!value) return null;
  const target = new Date(value);
  const today = new Date();
  target.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function addDays(date: Date, days: number): string {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("user_profile")
    .select(
      "recruitment_target,training_level,questionnaire_data,target_event_date,gibush_date,sayeret_day_date,readiness_level",
    )
    .eq("user_id", user.id)
    .maybeSingle<ProfileRow>();

  if (!profile) {
    redirect("/onboarding");
  }

  const { data: trainee } = await supabase
    .from("users")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle<{ full_name: string | null }>();

  const { data: latestPerformance } = await supabase
    .from("monthly_performance_tests")
    .select(
      "test_month,run_2000_seconds,pullups,pushups,derived_training_level",
    )
    .eq("user_id", user.id)
    .order("test_month", { ascending: false })
    .limit(1)
    .maybeSingle<PerformanceRow>();

  const baseline = baselineFromQuestionnaire(
    profile.questionnaire_data,
    profile.training_level as TrainingLevel,
  );

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("cohort_id")
    .eq("user_id", user.id)
    .maybeSingle<{ cohort_id: string | null }>();

  const cohortId = enrollment?.cohort_id ?? null;

  const { data: weekPlanRaw } = cohortId
    ? await supabase
        .from("training_plans")
        .select("id,day_in_week,workout_name,workout_type,details")
        .eq("cohort_id", cohortId)
        .eq("week_number", 1)
        .order("day_in_week")
        .returns<PlanRow[]>()
    : { data: null };

  const weekPlan = weekPlanRaw ?? [];
  const currentDay = new Date().getDay() + 1;
  const todayPlan =
    weekPlan.find((plan) => plan.day_in_week === currentDay) ?? null;

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const weekStart = addDays(now, -now.getDay());
  const weekEnd = addDays(new Date(weekStart), 6);

  const { data: weekLogs } = await supabase
    .from("training_log")
    .select("scheduled_for,status")
    .eq("user_id", user.id)
    .gte("scheduled_for", weekStart)
    .lte("scheduled_for", weekEnd)
    .returns<LogStatusRow[]>();

  const logsByDate = new Map<string, string>();
  (weekLogs ?? []).forEach((log) => {
    logsByDate.set(log.scheduled_for, log.status);
  });

  const todayStatus = logsByDate.get(today) ?? "scheduled";
  const todaySnapshot = parseWorkoutSnapshot(todayPlan?.details);

  const theme = getUnitTheme(profile.recruitment_target);
  const firstName = trainee?.full_name?.split(" ")[0] ?? "חניך";

  const enlistmentDays = daysUntil(profile.target_event_date);
  const gibushDays = daysUntil(profile.gibush_date);
  const sayeretDays = daysUntil(profile.sayeret_day_date);

  const pageStyle = {
    "--unit-primary": theme.palette.primary,
    "--unit-secondary": theme.palette.secondary,
    "--unit-accent": theme.palette.accent,
    "--unit-surface": theme.palette.surface,
    "--unit-on": theme.palette.onPrimary,
    "--unit-ink": theme.palette.ink,
  } as React.CSSProperties;

  return (
    <main className="unit-page px-4 py-8 md:px-6 md:py-10" style={pageStyle}>
      <div className="mx-auto max-w-6xl space-y-6">
        <AccountStrip />

        <UnitHero
          firstName={firstName}
          theme={theme}
          enlistment={profile.target_event_date}
          enlistmentDays={enlistmentDays}
          gibush={profile.gibush_date}
          gibushDays={gibushDays}
          sayeret={profile.sayeret_day_date}
          sayeretDays={sayeretDays}
          trainingLevel={profile.training_level}
        />

        <PerformanceSummary
          baseline={baseline}
          latest={latestPerformance ?? null}
          trainingLevel={profile.training_level}
          theme={theme}
        />

        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <TodayCard
            planExists={Boolean(todayPlan?.id)}
            snapshot={todaySnapshot}
            status={todayStatus}
            currentDay={currentDay}
            theme={theme}
          />
          <ReadinessCard
            level={profile.readiness_level}
            theme={theme}
          />
        </div>

        <WeeklyProgram
          weekPlan={weekPlan}
          currentDay={currentDay}
          weekStart={weekStart}
          logsByDate={logsByDate}
          theme={theme}
        />

        <RulesGrid theme={theme} />

        <Signature firstName={firstName} theme={theme} />
      </div>
    </main>
  );
}

function UnitHero({
  firstName,
  theme,
  enlistment,
  enlistmentDays,
  gibush,
  gibushDays,
  sayeret,
  sayeretDays,
  trainingLevel,
}: {
  firstName: string;
  theme: UnitTheme;
  enlistment: string | null;
  enlistmentDays: number | null;
  gibush: string | null;
  gibushDays: number | null;
  sayeret: string | null;
  sayeretDays: number | null;
  trainingLevel: string;
}) {
  return (
    <section
      className="unit-hero p-7 md:p-10"
      style={{
        color: theme.palette.onPrimary,
        background: `linear-gradient(140deg, ${theme.palette.primary} 0%, ${theme.palette.secondary} 100%)`,
      }}
    >
      <div className={`ambience ambience-${theme.ambience}`} aria-hidden />
      <div className="insignia-watermark" aria-hidden>
        <Image
          alt=""
          height={520}
          src={theme.assetPath}
          width={520}
          priority
        />
      </div>

      <div className="relative z-10 mb-6 flex flex-wrap items-center justify-between gap-3 text-xs">
        <span
          className="font-stencil rounded-full px-3 py-1 tracking-widest"
          style={{
            background: "rgba(255,255,255,0.12)",
            border: "1px solid rgba(255,255,255,0.2)",
          }}
        >
          {theme.hebrewName}
        </span>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className="font-stencil flex items-center gap-2 rounded-full px-3 py-1 tracking-widest"
            style={{
              background: "rgba(0,0,0,0.25)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: theme.palette.accent }}
            />
            במהלך הכנה
          </span>
          <SettingsDatesButton
            enlistmentDate={enlistment}
            gibushDate={gibush}
            sayeretDayDate={sayeret}
            theme={theme}
          />
        </div>
      </div>

      <div className="relative z-10 grid items-center gap-8 md:grid-cols-[1fr_240px]">
        <div className="space-y-5">
          <div
            className="font-stencil inline-block rounded-md px-3 py-1 text-xs tracking-widest"
            style={{
              background: "rgba(0,0,0,0.3)",
              color: theme.palette.accent,
              border: `1px solid ${theme.palette.accent}55`,
            }}
          >
            {theme.tagline}
          </div>
          <h1 className="font-display text-5xl leading-[0.95] tracking-tight md:text-7xl">
            {firstName}
            <br />
            <span style={{ color: theme.palette.accent }}>
              נכנס למשימה.
            </span>
          </h1>
          <p
            className="max-w-lg text-base leading-7 opacity-85"
            style={{ color: theme.palette.onPrimary }}
          >
            {theme.motto}.
          </p>

          <div className="grid gap-3 sm:grid-cols-3">
            <CountdownChip date={enlistment} days={enlistmentDays} label="גיוס" theme={theme} />
            <CountdownChip date={gibush} days={gibushDays} label="גיבוש" theme={theme} />
            <CountdownChip date={sayeret} days={sayeretDays} label="יום סיירות" theme={theme} />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <MetaChip label="יעד" value={theme.hebrewName} />
            <MetaChip label="הקבצה" value={trainingLevelLabel(trainingLevel)} />
            <MetaChip label="סטטוס" value="בתוכנית פעילה" />
          </div>
        </div>

        <UnitEmblem theme={theme} className="mx-auto" size={220} />
      </div>
    </section>
  );
}

function CountdownChip({
  date,
  days,
  label,
  theme,
}: {
  date: string | null;
  days: number | null;
  label: string;
  theme: UnitTheme;
}) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.15)",
        backdropFilter: "blur(6px)",
      }}
    >
      <div className="font-stencil text-[11px] tracking-widest opacity-80">
        {label}
      </div>
      <div
        className="font-display mt-1 text-4xl leading-none"
        style={{ color: theme.palette.accent }}
      >
        {days === null ? "—" : days >= 0 ? days : 0}
      </div>
      <div className="font-stencil mt-1 text-[10px] opacity-70">
        {days === null ? "לא הוגדר" : "ימים"}
      </div>
      <div className="mt-1 text-[11px] opacity-70">{formatDate(date)}</div>
    </div>
  );
}

function MetaChip({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-xl p-3"
      style={{
        background: "rgba(0,0,0,0.22)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div className="font-stencil text-[10px] tracking-widest opacity-70">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}

function PerformanceSummary({
  baseline,
  latest,
  trainingLevel,
  theme,
}: {
  baseline: ReturnType<typeof baselineFromQuestionnaire>;
  latest: PerformanceRow | null;
  trainingLevel: string;
  theme: UnitTheme;
}) {
  const display = latest
    ? {
        run2000Seconds: latest.run_2000_seconds,
        pullups: latest.pullups,
        pushups: latest.pushups,
        source: "monthly" as const,
      }
    : baseline
      ? {
          run2000Seconds: baseline.run2000Seconds,
          pullups: baseline.pullups,
          pushups: baseline.pushups,
          source: "baseline" as const,
        }
      : null;
  const insight = display
    ? getPerformanceInsight({
        run2000Seconds: display.run2000Seconds,
        pullups: display.pullups,
        pushups: display.pushups,
      })
    : "אין עדיין נתוני ביצוע. מלא בוחן חודשי כדי לקבל תמונת התקדמות.";

  return (
    <section className="unit-card grid gap-0 md:grid-cols-[0.4fr_0.6fr]">
      <div
        className="rounded-t-[22px] p-6 md:rounded-r-none md:rounded-t-[22px] md:rounded-br-none md:rounded-bl-none"
        style={{
          background: `linear-gradient(135deg, ${theme.palette.primary}, ${theme.palette.secondary})`,
          color: theme.palette.onPrimary,
        }}
      >
        <div className="font-stencil text-[11px] tracking-widest opacity-80">
          הקבצה נוכחית
        </div>
        <div className="font-display mt-2 text-5xl leading-none">
          {trainingLevelLabel(trainingLevel)}
        </div>
        {display ? (
          <p className="mt-3 text-sm opacity-85">
            {display.source === "baseline" ? "שאלון פתיחה · " : "בוחן חודשי · "}
            2000: {formatRunTime(display.run2000Seconds)} · מתח:{" "}
            {display.pullups} · סמיכה: {display.pushups}
          </p>
        ) : null}
      </div>
      <div className="p-6">
        <div className="font-stencil text-[11px] tracking-widest text-slate-500">
          המשימה הקרובה
        </div>
        <p
          className="mt-2 border-r-[3px] pr-4 text-base leading-8 text-slate-800"
          style={{ borderColor: theme.palette.accent }}
        >
          {insight}
        </p>
        <Link
          href="/performance"
          className="unit-button is-solid mt-4"
          style={
            {
              "--unit-primary": theme.palette.primary,
              "--unit-on": theme.palette.onPrimary,
            } as React.CSSProperties
          }
        >
          לעמוד ביצועים →
        </Link>
      </div>
    </section>
  );
}

function TodayCard({
  planExists,
  snapshot,
  status,
  currentDay,
  theme,
}: {
  planExists: boolean;
  snapshot: ReturnType<typeof parseWorkoutSnapshot>;
  status: string;
  currentDay: number;
  theme: UnitTheme;
}) {
  return (
    <section className="unit-card overflow-hidden">
      <header
        className="flex items-center justify-between px-6 py-4"
        style={{
          background: `linear-gradient(135deg, ${theme.palette.primary}, ${theme.palette.secondary})`,
          color: theme.palette.onPrimary,
        }}
      >
        <div>
          <div className="font-stencil text-[11px] tracking-widest opacity-80">
            יום {HEBREW_DAYS[currentDay]} · האימון של היום
          </div>
          <div className="font-display mt-1 text-3xl leading-none">
            {snapshot.name ?? "אין אימון להיום"}
          </div>
        </div>
        <div
          className="font-stencil rounded-full px-3 py-1 text-[11px] tracking-widest"
          style={{
            background: "rgba(0,0,0,0.25)",
            border: "1px solid rgba(255,255,255,0.18)",
          }}
        >
          {statusLabel(status)}
        </div>
      </header>

      <div className="space-y-4 p-6">
        {snapshot.warmup ? (
          <div
            className="font-stencil inline-block rounded-md px-3 py-1 text-xs"
            style={{
              background: `${theme.palette.primary}10`,
              color: theme.palette.primary,
              border: `1px solid ${theme.palette.primary}20`,
            }}
          >
            ⚡ חימום · {snapshot.warmup}
          </div>
        ) : null}

        {snapshot.blocks?.length ? (
          <div className="space-y-4">
            {snapshot.blocks.slice(0, 2).map((block) => (
              <div
                className="border-t border-dashed border-slate-200 pt-3 first:border-0 first:pt-0"
                key={block.title}
              >
                <div className="font-display flex items-center gap-2 text-lg text-slate-900">
                  <span
                    className="block h-2 w-5 rounded-full"
                    style={{ background: theme.palette.accent }}
                  />
                  {block.title}
                </div>
                {block.sets ? (
                  <div
                    className="font-stencil mt-1 text-xl"
                    style={{ color: theme.palette.primary }}
                  >
                    {block.sets}
                  </div>
                ) : null}
                {block.exercises ? (
                  <ul className="mt-1 space-y-1 text-sm text-slate-700">
                    {block.exercises.map((line) => (
                      <li key={line} className="flex items-start gap-2">
                        <span style={{ color: theme.palette.accent }}>▸</span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            לא הוגדרה תבנית אימון להיום. עדכן את המאמן כדי להוסיף תבנית
            להקבצה זו.
          </p>
        )}

        {planExists ? (
          <Link
            href="/today"
            className="unit-button is-solid mt-3"
            style={
              {
                "--unit-primary": theme.palette.primary,
                "--unit-on": theme.palette.onPrimary,
              } as React.CSSProperties
            }
          >
            לאימון המלא ←
          </Link>
        ) : null}
      </div>
    </section>
  );
}

function ReadinessCard({
  level,
  theme,
}: {
  level: number;
  theme: UnitTheme;
}) {
  return (
    <section className="unit-card p-6">
      <header className="flex items-center justify-between">
        <div>
          <div className="font-stencil text-[11px] tracking-widest text-slate-500">
            מד מוכנות
          </div>
          <div className="font-display text-3xl leading-none text-slate-900">
            איך אתה מרגיש?
          </div>
        </div>
        <div
          className="font-display text-5xl"
          style={{ color: theme.palette.primary }}
        >
          {level}%
        </div>
      </header>

      <div className="soft-bar mt-5">
        <span
          style={{
            width: `${level}%`,
            background: `linear-gradient(90deg, ${theme.palette.primary}, ${theme.palette.accent})`,
          }}
        />
      </div>

      <form action={updateReadinessLevel} className="mt-5 space-y-3">
        <input
          type="range"
          name="level"
          min="0"
          max="100"
          step="5"
          defaultValue={level}
          className="w-full"
          style={{ accentColor: theme.palette.primary }}
        />
        <button
          type="submit"
          className="unit-button is-solid w-full"
          style={
            {
              "--unit-primary": theme.palette.primary,
              "--unit-on": theme.palette.onPrimary,
            } as React.CSSProperties
          }
        >
          עדכן מוכנות
        </button>
      </form>
    </section>
  );
}

function WeeklyProgram({
  weekPlan,
  currentDay,
  weekStart,
  logsByDate,
  theme,
}: {
  weekPlan: PlanRow[];
  currentDay: number;
  weekStart: string;
  logsByDate: Map<string, string>;
  theme: UnitTheme;
}) {
  return (
    <section className="unit-card overflow-hidden">
      <header
        className="flex flex-wrap items-center justify-between gap-3 px-6 py-4"
        style={{
          background: `linear-gradient(135deg, ${theme.palette.primary}, ${theme.palette.secondary})`,
          color: theme.palette.onPrimary,
        }}
      >
        <div>
          <h2 className="font-display text-2xl">תוכנית השבוע</h2>
          <p className="text-xs opacity-80">
            תבניות לפי הקבצה. עדכון תבנית במערכת מתעדכן כאן מיד.
          </p>
        </div>
        <span
          className="font-stencil text-[11px] tracking-widest"
          style={{ color: theme.palette.accent }}
        >
          שבוע נוכחי
        </span>
      </header>

      {weekPlan.length ? (
        <div className="grid gap-3 p-5 md:grid-cols-2 lg:grid-cols-7">
          {weekPlan.map((plan) => {
            const snapshot = parseWorkoutSnapshot(plan.details);
            const isToday = plan.day_in_week === currentDay;
            const dateStr = addDays(
              new Date(weekStart),
              plan.day_in_week - 1,
            );
            const status = logsByDate.get(dateStr);
            const isRest = plan.workout_type === "rest";

            return (
              <article
                className={`rounded-2xl border p-4 transition ${
                  isToday
                    ? "shadow-lg"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
                style={
                  isToday
                    ? {
                        background: `linear-gradient(160deg, ${theme.palette.primary}, ${theme.palette.secondary})`,
                        color: theme.palette.onPrimary,
                        borderColor: "transparent",
                      }
                    : undefined
                }
                key={plan.day_in_week}
              >
                <div className="font-stencil flex items-center justify-between text-[11px] opacity-80">
                  <span>יום {HEBREW_DAYS[plan.day_in_week]}</span>
                  <span>{formatDate(dateStr)}</span>
                </div>
                <h3 className="font-display mt-3 text-xl leading-tight">
                  {snapshot.name ?? plan.workout_name}
                </h3>
                <p
                  className="font-stencil mt-1 text-[11px]"
                  style={{
                    color: isToday
                      ? theme.palette.accent
                      : theme.palette.primary,
                  }}
                >
                  {snapshot.tag ?? typeLabel(plan.workout_type)}
                </p>
                <div
                  className={`mt-3 flex items-center justify-between border-t border-dashed pt-3 text-xs ${
                    isToday ? "border-white/30" : "border-slate-200"
                  }`}
                >
                  <span className="opacity-80">
                    {isRest ? "מנוחה" : "אימון"}
                  </span>
                  <span
                    className={`font-stencil text-[11px] ${
                      status === "completed"
                        ? "text-emerald-500"
                        : status === "missed"
                          ? "line-through opacity-60"
                          : "opacity-70"
                    }`}
                  >
                    {status ? statusLabel(status) : isToday ? "היום" : "—"}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="p-6">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
            <p className="font-display text-xl">אין תבניות להקבצה זו.</p>
            <p className="mt-1 text-sm opacity-80">
              צריך להוסיף תבניות אימון להקבצה במערכת.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function typeLabel(value: string): string {
  switch (value) {
    case "rest":
      return "מנוחה";
    case "run":
      return "ריצה";
    case "strength":
      return "כוח";
    case "endurance":
      return "סיבולת";
    case "mixed":
      return "משולב";
    default:
      return value;
  }
}

function RulesGrid({ theme }: { theme: UnitTheme }) {
  const rules = [
    { num: "01", title: "משמעת", desc: "לא מדלגים. מסמנים ביצוע. בונים רצף." },
    { num: "02", title: "שינה", desc: "7+ שעות. התאוששות היא חלק מהפקודה." },
    { num: "03", title: "תזונה", desc: "חלבון בכל ארוחה. מים לפני קפה." },
    { num: "04", title: "מדידה", desc: "בוחן חודשי קובע הקבצה ותוכנית." },
  ];

  return (
    <section className="grid gap-4 md:grid-cols-4">
      {rules.map((rule) => (
        <div key={rule.num} className="unit-card p-5">
          <div
            className="font-display text-5xl"
            style={{ color: theme.palette.primary }}
          >
            {rule.num}
          </div>
          <div className="font-display mt-2 text-lg text-slate-900">
            {rule.title}
          </div>
          <div className="mt-1 text-sm text-slate-600">{rule.desc}</div>
        </div>
      ))}
    </section>
  );
}

function Signature({
  firstName,
  theme,
}: {
  firstName: string;
  theme: UnitTheme;
}) {
  return (
    <footer className="font-stencil flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5 text-xs text-slate-500">
      <span>{firstName} · 2026</span>
      <span
        className="rounded-full px-3 py-1 tracking-widest"
        style={{
          color: theme.palette.primary,
          border: `1px solid ${theme.palette.primary}33`,
        }}
      >
        אין ויתורים
      </span>
      <span>{theme.hebrewName}</span>
    </footer>
  );
}
