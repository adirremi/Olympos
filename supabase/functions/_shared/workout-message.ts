import { todayPageLinkLine, todayPageUrl } from "./env.ts";

type WorkoutBlock = {
  title?: string;
  sets?: string;
  rest?: string;
  exercises?: string[];
};

type WorkoutSnapshot = {
  name?: string;
  tag?: string;
  warmup?: string;
  blocks?: WorkoutBlock[];
  finisher?: string;
  cooldown?: string;
};

export type MorningRow = {
  user_id: string;
  phone: string;
  full_name: string | null;
  workout_name: string;
  workout_type: string;
  workout_snapshot: WorkoutSnapshot | null;
};

export type EveningRow = MorningRow & {
  days_to_enlistment: number | null;
  days_to_gibush: number | null;
  days_to_sayeret: number | null;
};

function blocksToText(blocks: WorkoutBlock[] | undefined): string {
  if (!Array.isArray(blocks) || blocks.length === 0) return "";
  return blocks
    .map((block) => {
      const ex = Array.isArray(block.exercises) ? block.exercises.join(", ") : "";
      return [block.title, block.sets, ex].filter(Boolean).join(" · ");
    })
    .filter(Boolean)
    .join("\n");
}

export function buildMorningMessage(row: MorningRow): string {
  const snap = row.workout_snapshot ?? {};
  const name = row.full_name?.split(" ")[0] || "חניך";
  const workout = snap.name || row.workout_name;
  const blocks = blocksToText(snap.blocks);

  return [
    `בוקר טוב ${name}.`,
    "",
    "האימון שלך להיום:",
    workout,
    "",
    snap.warmup ? `חימום: ${snap.warmup}` : null,
    blocks ? `עיקרי:\n${blocks}` : null,
    snap.finisher ? `סיום: ${snap.finisher}` : null,
    snap.cooldown ? `שחרור: ${snap.cooldown}` : null,
    "",
    "בסיום האימון נכנסים לאתר, מסמנים סיום וממלאים תחקור קצר.",
    todayPageLinkLine(),
  ]
    .filter((line) => line !== null)
    .join("\n");
}

export function buildReminderMessage(row: MorningRow): string {
  const name = row.full_name?.split(" ")[0] || "חניך";
  const workout = row.workout_snapshot?.name || row.workout_name;
  return [
    `${name}, האימון של היום עדיין פתוח.`,
    workout,
    "",
    "כדי לשמור רצף ולסגור את היום, נכנסים לאתר וממלאים תחקור קצר.",
    todayPageLinkLine(),
  ]
    .filter((line) => line !== null)
    .join("\n");
}

function singleLine(value: string | undefined | null): string {
  if (!value) return "";
  return value.replace(/\s+/g, " ").trim();
}

/** daily_workout_he: {{1}} name, {{2}} workout, {{3}} short workout hint */
export function buildMorningTemplateParams(row: MorningRow): [string, string, string] {
  const snap = row.workout_snapshot ?? {};
  const name = row.full_name?.split(" ")[0] || "חניך";
  const workout = snap.name || row.workout_name;

  const detailParts: string[] = [];
  if (snap.warmup) detailParts.push(`חימום: ${snap.warmup}`);
  const firstBlock = snap.blocks?.[0];
  if (firstBlock) {
    const ex = Array.isArray(firstBlock.exercises) ? firstBlock.exercises.join(", ") : "";
    detailParts.push([firstBlock.title, firstBlock.sets, ex].filter(Boolean).join(" · "));
  }
  if (snap.finisher) detailParts.push(`סיום: ${snap.finisher}`);

  const link = todayPageUrl();
  let details = singleLine(detailParts.join(" | ")) || "פרטים מלאים באפליקציה";
  if (link) details = singleLine(`${details} | ${link}`);

  return [singleLine(name), singleLine(workout), details];
}

/** evening_reminder_he: {{1}} name, {{2}} workout name, {{3}} upcoming events only */
export function buildEveningTemplateParams(row: EveningRow): [string, string, string] {
  const name = row.full_name?.split(" ")[0] || "חניך";
  const workout = row.workout_snapshot?.name || row.workout_name;

  const events: string[] = [];
  if (row.days_to_sayeret !== null && row.days_to_sayeret >= 0) {
    events.push(`יום סיירות עוד ${row.days_to_sayeret} ימים`);
  }
  if (row.days_to_gibush !== null && row.days_to_gibush >= 0) {
    events.push(`גיבוש עוד ${row.days_to_gibush} ימים`);
  }
  if (row.days_to_enlistment !== null && row.days_to_enlistment >= 0) {
    events.push(`גיוס עוד ${row.days_to_enlistment} ימים`);
  }

  let eventsText = singleLine(events.join(", ")) || "אין אירועים קרובים מוגדרים";
  const link = todayPageUrl();
  if (link) eventsText = singleLine(`${eventsText} | ${link}`);

  return [singleLine(name), singleLine(workout), eventsText];
}

export function buildEveningMessage(row: EveningRow): string {
  const name = row.full_name?.split(" ")[0] || "חניך";
  const workout = row.workout_snapshot?.name || row.workout_name;

  const countdownLines: string[] = [];
  if (row.days_to_enlistment !== null && row.days_to_enlistment >= 0) {
    countdownLines.push(`גיוס: ${row.days_to_enlistment} ימים`);
  }
  if (row.days_to_gibush !== null && row.days_to_gibush >= 0) {
    countdownLines.push(`גיבוש: ${row.days_to_gibush} ימים`);
  }
  if (row.days_to_sayeret !== null && row.days_to_sayeret >= 0) {
    countdownLines.push(`יום סיירות: ${row.days_to_sayeret} ימים`);
  }

  return [
    `${name}, תזכורת אחרונה להיום.`,
    `אימון פתוח: ${workout}`,
    countdownLines.length ? "" : null,
    countdownLines.length ? "אירועים קרובים:" : null,
    ...countdownLines,
    "",
    "סגירת האימון והתחקור מתבצעים באתר בלבד.",
    todayPageLinkLine(),
  ]
    .filter((line) => line !== null)
    .join("\n");
}
