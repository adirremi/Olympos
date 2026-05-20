export type TrainingLevel = "beginner" | "intermediate" | "advanced";

export type PerformanceInput = {
  run2000Seconds: number;
  pullups: number;
  pushups: number;
};

export type MonthlyPerformanceTest = PerformanceInput & {
  testMonth: string;
  derivedTrainingLevel: TrainingLevel;
};

export type BaselinePerformance = PerformanceInput & {
  derivedTrainingLevel: TrainingLevel;
};

type QuestionnaireData = {
  run2kMinutes?: unknown;
  maxPullups?: unknown;
  maxPushups?: unknown;
  trainingLevel?: unknown;
};

export function classifyPerformance(input: PerformanceInput): TrainingLevel {
  if (
    input.run2000Seconds < 450 &&
    input.pullups > 15 &&
    input.pushups > 25
  ) {
    return "advanced";
  }

  if (
    input.run2000Seconds >= 450 &&
    input.run2000Seconds < 500 &&
    input.pullups > 10 &&
    input.pushups > 18
  ) {
    return "intermediate";
  }

  return "beginner";
}

export function trainingLevelLabel(level: string): string {
  if (level === "advanced") return "הקבצה A";
  if (level === "intermediate") return "הקבצה B";
  return "הקבצה C";
}

export function formatRunTime(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return "—";
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}

export function baselineFromQuestionnaire(
  questionnaireData: unknown,
  fallbackLevel: TrainingLevel,
): BaselinePerformance | null {
  const data = questionnaireData as QuestionnaireData | null;
  if (!data) return null;

  const run2kMinutes = Number(data.run2kMinutes);
  const maxPullups = Number(data.maxPullups);
  const maxPushups = Number(data.maxPushups);

  if (
    !Number.isFinite(run2kMinutes) ||
    !Number.isFinite(maxPullups) ||
    !Number.isFinite(maxPushups)
  ) {
    return null;
  }

  return {
    run2000Seconds: Math.round(run2kMinutes * 60),
    pullups: maxPullups,
    pushups: maxPushups,
    derivedTrainingLevel: fallbackLevel,
  };
}

export function parseRunTimeToSeconds(minutes: FormDataEntryValue | null, seconds: FormDataEntryValue | null) {
  const min = Number(minutes);
  const sec = Number(seconds);

  if (
    !Number.isInteger(min) ||
    !Number.isInteger(sec) ||
    min < 0 ||
    sec < 0 ||
    sec > 59
  ) {
    return null;
  }

  return min * 60 + sec;
}

export function currentMonthStart(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
}

export function getPerformanceInsight(input: PerformanceInput): string {
  const level = classifyPerformance(input);

  if (level === "advanced") {
    return "אתה עומד ברף הקבצה A. המטרה עכשיו: לשמור יציבות חודשית ולא לתת לנתון אחד להישחק.";
  }

  const blockersToA = [
    input.run2000Seconds >= 450
      ? {
          label: "ריצת 2000",
          gap: input.run2000Seconds - 449,
          text: `החסם העיקרי הוא הריצה: צריך לרדת ל-7:29 ומטה. חסרות ${input.run2000Seconds - 449} שניות.`,
        }
      : null,
    input.pullups <= 15
      ? {
          label: "מתח",
          gap: 16 - input.pullups,
          text: `החסם העיקרי הוא מתח: צריך 16 חזרות נקיות. חסרות ${16 - input.pullups}.`,
        }
      : null,
    input.pushups <= 25
      ? {
          label: "שכיבות סמיכה",
          gap: 26 - input.pushups,
          text: `החסם העיקרי הוא שכיבות סמיכה: צריך 26 נקיות. חסרות ${26 - input.pushups}.`,
        }
      : null,
  ].filter((item): item is { label: string; gap: number; text: string } =>
    Boolean(item),
  );

  if (level === "intermediate" && blockersToA.length) {
    const blocker = blockersToA.sort((a, b) => a.gap - b.gap)[0];
    return `${blocker.text} זה הפער הקרוב ביותר להקבצה A.`;
  }

  const blockersToB = [
    input.run2000Seconds < 450 || input.run2000Seconds >= 500
      ? {
          gap: input.run2000Seconds >= 500 ? input.run2000Seconds - 499 : 999,
          text:
            input.run2000Seconds >= 500
              ? `החסם המרכזי להקבצה B הוא הריצה: צריך לרדת מתחת ל-8:20. חסרות ${input.run2000Seconds - 499} שניות.`
              : "הריצה כבר מתאימה ל-A, אבל למדד B נדרשת התאמה מלאה בכל המדדים.",
        }
      : null,
    input.pullups <= 10
      ? {
          gap: 11 - input.pullups,
          text: `החסם המרכזי להקבצה B הוא מתח: צריך 11 חזרות נקיות. חסרות ${11 - input.pullups}.`,
        }
      : null,
    input.pushups <= 18
      ? {
          gap: 19 - input.pushups,
          text: `החסם המרכזי להקבצה B הוא שכיבות סמיכה: צריך 19 נקיות. חסרות ${19 - input.pushups}.`,
        }
      : null,
  ].filter((item): item is { gap: number; text: string } => Boolean(item));

  if (blockersToB.length) {
    return blockersToB.sort((a, b) => a.gap - b.gap)[0].text;
  }

  return "הנתונים קרובים להקבצה B. צריך להשלים את כל שלושת הספים באותו חודש.";
}

export function calculateCurrentStreak(
  logs: Array<{ scheduled_for: string; status: string }>,
): number {
  const completedDates = new Set(
    logs
      .filter((log) => log.status === "completed")
      .map((log) => log.scheduled_for),
  );
  const missedDates = new Set(
    logs
      .filter((log) => log.status === "missed")
      .map((log) => log.scheduled_for),
  );

  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  for (let i = 0; i < 365; i += 1) {
    const key = cursor.toISOString().slice(0, 10);
    if (missedDates.has(key)) break;
    if (completedDates.has(key)) {
      streak += 1;
    }
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}
