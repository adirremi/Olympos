import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountStrip } from "@/components/account-strip";
import {
  calculateCurrentStreak,
  currentMonthStart,
  formatRunTime,
  getPerformanceInsight,
  trainingLevelLabel,
  type TrainingLevel,
} from "@/lib/performance";
import { createClient } from "@/lib/supabase/server";
import { getUnitTheme, type UnitTheme } from "@/lib/units";
import { submitMonthlyPerformance } from "./actions";

type TestRow = {
  test_month: string;
  run_2000_seconds: number;
  pullups: number;
  pushups: number;
  derived_training_level: TrainingLevel;
};

type BaselineRow = {
  assessment_date: string;
  assessment_month: string;
  run_2000_seconds: number;
  pullups: number;
  pushups: number;
  derived_training_level: TrainingLevel;
  source: "baseline" | "monthly";
};

type LogRow = {
  scheduled_for: string;
  status: string;
};

export default async function PerformancePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("user_profile")
    .select("training_level,recruitment_target")
    .eq("user_id", user.id)
    .maybeSingle<{
      training_level: TrainingLevel;
      recruitment_target: string;
    }>();

  if (!profile) {
    redirect("/onboarding");
  }

  const theme = getUnitTheme(profile.recruitment_target);

  const { data: tests } = await supabase
    .from("monthly_performance_tests")
    .select(
      "test_month,run_2000_seconds,pullups,pushups,derived_training_level",
    )
    .eq("user_id", user.id)
    .order("test_month")
    .returns<TestRow[]>();

  const { data: timeline } = await supabase
    .from("user_performance_timeline")
    .select(
      "source,assessment_date,assessment_month,run_2000_seconds,pullups,pushups,derived_training_level,created_at",
    )
    .eq("user_id", user.id)
    .order("assessment_date")
    .order("created_at")
    .returns<(BaselineRow & { created_at: string })[]>();

  const { data: logs } = await supabase
    .from("training_log")
    .select("scheduled_for,status")
    .eq("user_id", user.id)
    .order("scheduled_for", { ascending: false })
    .limit(365)
    .returns<LogRow[]>();

  const monthStart = currentMonthStart();
  const currentMonthTest =
    tests?.find((test) => test.test_month === monthStart) ?? null;
  const chartRows = (timeline ?? []).map((row) => ({
    assessment_date: row.assessment_date,
    assessment_month: row.assessment_month,
    run_2000_seconds: row.run_2000_seconds,
    pullups: row.pullups,
    pushups: row.pushups,
    derived_training_level: row.derived_training_level,
    source: row.source,
  }));
  const baseline = chartRows.find((row) => row.source === "baseline") ?? null;
  const displayLatest = chartRows.at(-1) ?? null;
  const insight = displayLatest
    ? getPerformanceInsight({
        run2000Seconds: displayLatest.run_2000_seconds,
        pullups: displayLatest.pullups,
        pushups: displayLatest.pushups,
      })
    : "אין עדיין נתוני פתיחה או בוחן חודשי. הזן בוחן חודשי כדי לקבל סטטוס התקדמות.";
  const streak = calculateCurrentStreak(logs ?? []);

  const pageStyle = {
    "--unit-primary": theme.palette.primary,
    "--unit-secondary": theme.palette.secondary,
    "--unit-accent": theme.palette.accent,
    "--unit-surface": theme.palette.surface,
    "--unit-on": theme.palette.onPrimary,
  } as React.CSSProperties;

  return (
    <main className="unit-page px-4 py-10 md:px-6" style={pageStyle}>
      <div className="mx-auto max-w-6xl space-y-7">
        <AccountStrip />

        <header
          className="unit-hero p-7 md:p-9"
          style={{
            color: theme.palette.onPrimary,
            background: `linear-gradient(140deg, ${theme.palette.primary} 0%, ${theme.palette.secondary} 100%)`,
          }}
        >
          <div className={`ambience ambience-${theme.ambience}`} aria-hidden />
          <div className="relative z-10 grid gap-5 md:grid-cols-[1.4fr_0.6fr] md:items-end">
            <div>
              <div
                className="font-stencil inline-block rounded-md px-3 py-1 text-xs tracking-widest"
                style={{
                  background: "rgba(0,0,0,0.3)",
                  color: theme.palette.accent,
                  border: `1px solid ${theme.palette.accent}55`,
                }}
              >
                ביצועים
              </div>
              <h1 className="font-display mt-3 text-4xl leading-none md:text-6xl">
                התקדמות ומדדים.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 opacity-90">
                ההתקדמות נמדדת תמיד משאלון הפתיחה ועד הבוחן האחרון. כל בוחן
                חודשי נשמר, מעדכן הקבצה, ומשנה את תוכנית האימונים.
              </p>
            </div>
            <div
              className="rounded-2xl p-5"
              style={{
                background: "rgba(0,0,0,0.25)",
                border: `1px solid ${theme.palette.accent}55`,
              }}
            >
              <div
                className="font-stencil text-[11px] tracking-widest"
                style={{ color: theme.palette.accent }}
              >
                הקבצה נוכחית
              </div>
              <div className="font-display mt-2 text-5xl">
                {trainingLevelLabel(profile.training_level)}
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <MonthlyTestCard
            hasCurrentMonthTest={Boolean(currentMonthTest)}
            theme={theme}
          />
          <InsightCard
            latest={displayLatest}
            insight={insight}
            streak={streak}
            theme={theme}
          />
        </section>

        <ProgressDelta baseline={baseline} latest={displayLatest} theme={theme} />

        <Charts tests={chartRows} theme={theme} />

        <HistoryTable tests={tests ?? []} theme={theme} />

        <Link
          href="/dashboard"
          className="unit-button is-ghost"
          style={
            {
              "--unit-primary": theme.palette.primary,
              color: theme.palette.primary,
            } as React.CSSProperties
          }
        >
          חזרה לדשבורד
        </Link>
      </div>
    </main>
  );
}

function MonthlyTestCard({
  hasCurrentMonthTest,
  theme,
}: {
  hasCurrentMonthTest: boolean;
  theme: UnitTheme;
}) {
  return (
    <section className="unit-card overflow-hidden">
      <header
        className="px-5 py-4"
        style={{
          background: `linear-gradient(135deg, ${theme.palette.primary}, ${theme.palette.secondary})`,
          color: theme.palette.onPrimary,
        }}
      >
        <h2 className="font-display text-2xl">בוחן החודש</h2>
        <p className="text-xs opacity-80">
          פתוח עד שיש תוצאה לחודש הנוכחי. אפשר לעדכן שוב אם המאמן מאפשר.
        </p>
      </header>

      <div className="p-5">
        {hasCurrentMonthTest ? (
          <div
            className="rounded-2xl p-5"
            style={{
              background: `${theme.palette.accent}18`,
              border: `1px solid ${theme.palette.accent}`,
              color: theme.palette.ink,
            }}
          >
            <p className="font-display text-2xl">יש תוצאה לחודש הנוכחי.</p>
            <p className="mt-1 text-sm opacity-85">
              אפשר לעדכן אם נעשה בוחן חוזר; הערך האחרון יחליף את הקודם.
            </p>
          </div>
        ) : null}
        <PerformanceForm theme={theme} />
      </div>
    </section>
  );
}

function PerformanceForm({ theme }: { theme: UnitTheme }) {
  return (
    <form action={submitMonthlyPerformance} className="mt-5 grid gap-4 md:grid-cols-2">
      <NumberField label="2000 · דקות" name="runMinutes" required min={0} />
      <NumberField label="2000 · שניות" name="runSeconds" required min={0} max={59} />
      <NumberField label="מתח נקי" name="pullups" required min={0} />
      <NumberField label="שכיבות סמיכה נקי" name="pushups" required min={0} />
      <button
        className="unit-button is-solid md:col-span-2"
        style={
          {
            "--unit-primary": theme.palette.primary,
            "--unit-on": theme.palette.onPrimary,
          } as React.CSSProperties
        }
        type="submit"
      >
        שמור בוחן חודשי
      </button>
    </form>
  );
}

function NumberField({
  label,
  name,
  required,
  min,
  max,
}: {
  label: string;
  name: string;
  required?: boolean;
  min?: number;
  max?: number;
}) {
  return (
    <label className="space-y-2">
      <span className="font-stencil text-[11px] tracking-widest text-slate-500">
        {label}
      </span>
      <input
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
        max={max}
        min={min}
        name={name}
        required={required}
        type="number"
      />
    </label>
  );
}

function InsightCard({
  latest,
  insight,
  streak,
  theme,
}: {
  latest: BaselineRow | null;
  insight: string;
  streak: number;
  theme: UnitTheme;
}) {
  return (
    <section className="unit-card p-6">
      <div className="font-stencil text-[11px] tracking-widest text-slate-500">
        מאמן חכם
      </div>
      <h2 className="font-display mt-2 text-3xl text-slate-900">חסם מרכזי</h2>
      {latest?.source === "baseline" ? (
        <div
          className="font-stencil mt-3 inline-block rounded-md px-3 py-1 text-xs"
          style={{
            background: `${theme.palette.accent}22`,
            color: theme.palette.ink,
            border: `1px solid ${theme.palette.accent}`,
          }}
        >
          מבוסס שאלון פתיחה · מחכה לבוחן חודשי ראשון
        </div>
      ) : null}
      <p
        className="mt-4 border-r-[3px] pr-4 leading-7 text-slate-700"
        style={{ borderColor: theme.palette.accent }}
      >
        {insight}
      </p>

      <div className="mt-6 grid gap-3 md:grid-cols-4">
        <Metric label="רצף אימונים" value={`${streak}`} suffix="ימים" theme={theme} />
        <Metric
          label="2000 אחרון"
          value={formatRunTime(latest?.run_2000_seconds)}
          theme={theme}
        />
        <Metric
          label="מתח"
          value={latest ? `${latest.pullups}` : "—"}
          theme={theme}
        />
        <Metric
          label="סמיכה"
          value={latest ? `${latest.pushups}` : "—"}
          theme={theme}
        />
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  suffix,
  theme,
}: {
  label: string;
  value: string;
  suffix?: string;
  theme: UnitTheme;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="font-stencil text-[11px] tracking-widest text-slate-500">
        {label}
      </div>
      <div
        className="font-display mt-1 text-3xl"
        style={{ color: theme.palette.primary }}
      >
        {value}
      </div>
      {suffix ? <div className="text-xs text-slate-500">{suffix}</div> : null}
    </div>
  );
}

function Charts({ tests, theme }: { tests: BaselineRow[]; theme: UnitTheme }) {
  const maxRun = Math.max(...tests.map((test) => test.run_2000_seconds), 500);
  const maxPullups = Math.max(...tests.map((test) => test.pullups), 16);
  const maxPushups = Math.max(...tests.map((test) => test.pushups), 26);

  return (
    <section className="unit-card overflow-hidden">
      <header
        className="px-5 py-4"
        style={{
          background: `linear-gradient(135deg, ${theme.palette.primary}, ${theme.palette.secondary})`,
          color: theme.palette.onPrimary,
        }}
      >
        <h2 className="font-display text-2xl">גרף התקדמות</h2>
      </header>

      {tests.length ? (
        <div className="grid gap-5 p-5 lg:grid-cols-3">
          <BarChart
            better="down"
            items={tests.map((test) => ({
              label: monthLabel(test.assessment_month, test.source),
              value: test.run_2000_seconds,
              text: formatRunTime(test.run_2000_seconds),
            }))}
            max={maxRun}
            title="ריצת 2000"
            theme={theme}
          />
          <BarChart
            items={tests.map((test) => ({
              label: monthLabel(test.assessment_month, test.source),
              value: test.pullups,
              text: `${test.pullups}`,
            }))}
            max={maxPullups}
            title="מתח"
            theme={theme}
          />
          <BarChart
            items={tests.map((test) => ({
              label: monthLabel(test.assessment_month, test.source),
              value: test.pushups,
              text: `${test.pushups}`,
            }))}
            max={maxPushups}
            title="שכיבות סמיכה"
            theme={theme}
          />
        </div>
      ) : (
        <div className="p-5 text-slate-500">אין עדיין נתונים להצגה.</div>
      )}
    </section>
  );
}

function BarChart({
  title,
  items,
  max,
  better = "up",
  theme,
}: {
  title: string;
  items: Array<{ label: string; value: number; text: string }>;
  max: number;
  better?: "up" | "down";
  theme: UnitTheme;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="font-display text-xl text-slate-900">{title}</div>
      <div className="mt-4 flex h-56 items-end gap-3 border-b border-r border-slate-200 pr-3">
        {items.map((item) => {
          const normalized =
            better === "down" ? max - item.value + max * 0.15 : item.value;
          const height = Math.max(12, Math.round((normalized / max) * 180));
          return (
            <div className="flex flex-1 flex-col items-center gap-2" key={item.label}>
              <div
                className="font-stencil text-xs"
                style={{ color: theme.palette.primary }}
              >
                {item.text}
              </div>
              <div
                className="w-full rounded-t-md"
                style={{
                  height,
                  background: `linear-gradient(180deg, ${theme.palette.primary}, ${theme.palette.secondary})`,
                }}
              />
              <div className="font-stencil text-[10px] text-slate-500">{item.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HistoryTable({ tests, theme }: { tests: TestRow[]; theme: UnitTheme }) {
  return (
    <section className="unit-card overflow-hidden">
      <header
        className="px-5 py-4"
        style={{
          background: `linear-gradient(135deg, ${theme.palette.primary}, ${theme.palette.secondary})`,
          color: theme.palette.onPrimary,
        }}
      >
        <h2 className="font-display text-2xl">היסטוריית בחנים</h2>
      </header>
      <div className="divide-y divide-slate-200">
        {tests.length ? (
          tests
            .slice()
            .reverse()
            .map((test) => (
              <div
                className="grid gap-3 p-4 text-sm md:grid-cols-5 md:items-center"
                key={test.test_month}
              >
                <div className="font-stencil text-slate-500">
                  {monthLabel(test.test_month)}
                </div>
                <div>2000: {formatRunTime(test.run_2000_seconds)}</div>
                <div>מתח: {test.pullups}</div>
                <div>סמיכה: {test.pushups}</div>
                <div
                  className="font-bold"
                  style={{ color: theme.palette.primary }}
                >
                  {trainingLevelLabel(test.derived_training_level)}
                </div>
              </div>
            ))
        ) : (
          <div className="p-4 text-slate-500">אין בחנים קודמים.</div>
        )}
      </div>
    </section>
  );
}

function ProgressDelta({
  baseline,
  latest,
  theme,
}: {
  baseline: BaselineRow | null;
  latest: BaselineRow | null;
  theme: UnitTheme;
}) {
  if (!baseline || !latest || latest.source === "baseline") {
    return (
      <section
        className="rounded-2xl border p-5"
        style={{
          background: `${theme.palette.accent}18`,
          borderColor: theme.palette.accent,
          color: theme.palette.ink,
        }}
      >
        <div className="font-stencil text-[11px] tracking-widest opacity-70">
          סטטוס התקדמות
        </div>
        <p className="font-display mt-2 text-2xl">
          מחכה לבוחן חודשי ראשון כדי לחשב התקדמות מהפתיחה.
        </p>
      </section>
    );
  }

  const runDelta = baseline.run_2000_seconds - latest.run_2000_seconds;
  const pullDelta = latest.pullups - baseline.pullups;
  const pushDelta = latest.pushups - baseline.pushups;

  return (
    <section className="unit-card grid gap-0 md:grid-cols-4">
      <div
        className="rounded-t-[22px] p-5 md:rounded-r-none md:rounded-t-[22px] md:rounded-br-none md:rounded-bl-none"
        style={{
          background: `linear-gradient(135deg, ${theme.palette.primary}, ${theme.palette.secondary})`,
          color: theme.palette.onPrimary,
        }}
      >
        <div className="font-stencil text-[11px] tracking-widest opacity-80">
          מהפתיחה
        </div>
        <div className="font-display mt-2 text-3xl">התקדמות מהפתיחה</div>
      </div>
      <DeltaMetric label="ריצת 2000" value={runDelta} suffix="שניות" theme={theme} />
      <DeltaMetric label="מתח" value={pullDelta} suffix="חזרות" theme={theme} />
      <DeltaMetric label="סמיכה" value={pushDelta} suffix="חזרות" theme={theme} />
    </section>
  );
}

function DeltaMetric({
  label,
  value,
  suffix,
  theme,
}: {
  label: string;
  value: number;
  suffix: string;
  theme: UnitTheme;
}) {
  const improved = value > 0;
  const prefix = value > 0 ? "+" : value < 0 ? "-" : "";

  return (
    <div className="border-t border-slate-200 p-5 first:border-t-0 md:border-l md:border-t-0">
      <div className="font-stencil text-[11px] tracking-widest text-slate-500">
        {label}
      </div>
      <div
        className="font-display mt-1 text-3xl"
        style={{
          color: improved ? theme.palette.primary : "#64748b",
        }}
      >
        {prefix}
        {Math.abs(value)}
      </div>
      <div className="text-xs text-slate-500">{suffix}</div>
    </div>
  );
}

function monthLabel(value: string, source: "baseline" | "monthly" = "monthly") {
  if (source === "baseline") return "פתיחה";
  return new Intl.DateTimeFormat("he-IL", {
    month: "short",
    year: "2-digit",
  }).format(new Date(value));
}
