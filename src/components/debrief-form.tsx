"use client";

import { useState } from "react";
import { submitDebrief } from "@/app/today/actions";
import type { UnitTheme } from "@/lib/units";

type Pace = "cant_keep_up" | "on_target" | "could_do_more";

type Existing = {
  rpe: number;
  perceived_pace: Pace;
  has_pain: boolean;
  pain_locations: string[];
  coach_note: string | null;
} | null;

const LOAD_FACES: Array<{ value: number; emoji: string; label: string }> = [
  { value: 2, emoji: "😴", label: "קל מאוד" },
  { value: 4, emoji: "🙂", label: "קליל" },
  { value: 6, emoji: "😤", label: "מאתגר" },
  { value: 8, emoji: "😰", label: "קשה" },
  { value: 10, emoji: "🥵", label: "רצחני" },
];

const PACE_OPTIONS: Array<{ value: Pace; emoji: string; label: string }> = [
  { value: "cant_keep_up", emoji: "🦥", label: "קשה לעמוד בקצב" },
  { value: "on_target", emoji: "🎯", label: "בול בזמן" },
  { value: "could_do_more", emoji: "🚀", label: "יכולתי יותר" },
];

const PAIN_LOCATIONS: Array<{ value: string; label: string }> = [
  { value: "knee_right", label: "ברך ימין" },
  { value: "knee_left", label: "ברך שמאל" },
  { value: "shin_right", label: "שוק ימין" },
  { value: "shin_left", label: "שוק שמאל" },
  { value: "ankle_right", label: "קרסול ימין" },
  { value: "ankle_left", label: "קרסול שמאל" },
  { value: "lower_back", label: "גב תחתון" },
  { value: "upper_back", label: "גב עליון" },
  { value: "shoulder_right", label: "כתף ימין" },
  { value: "shoulder_left", label: "כתף שמאל" },
  { value: "hip", label: "מותן" },
  { value: "neck", label: "צוואר" },
  { value: "other", label: "אחר" },
];

export function DebriefForm({
  logId,
  theme,
  existing,
}: {
  logId: string;
  theme: UnitTheme;
  existing: Existing;
}) {
  const [rpe, setRpe] = useState<number>(existing?.rpe ?? 6);
  const [pace, setPace] = useState<Pace>(existing?.perceived_pace ?? "on_target");
  const [hasPain, setHasPain] = useState<boolean>(existing?.has_pain ?? false);
  const [painLocations, setPainLocations] = useState<Set<string>>(
    new Set(existing?.pain_locations ?? []),
  );
  const [note, setNote] = useState<string>(existing?.coach_note ?? "");
  const [showNote, setShowNote] = useState<boolean>(Boolean(existing?.coach_note));

  const togglePain = (loc: string) => {
    setPainLocations((prev) => {
      const next = new Set(prev);
      if (next.has(loc)) {
        next.delete(loc);
      } else {
        next.add(loc);
      }
      return next;
    });
  };

  return (
    <form
      action={submitDebrief.bind(null, logId)}
      className="unit-card space-y-7 p-6 md:p-7"
    >
      <fieldset className="space-y-4">
        <legend className="flex items-baseline justify-between">
          <span className="font-display text-2xl text-slate-900">
            איך היה האימון?
          </span>
          <span
            className="font-stencil text-xs tracking-widest"
            style={{ color: theme.palette.primary }}
          >
            עומס נתפס · {rpe}/10
          </span>
        </legend>

        <div className="grid grid-cols-5 gap-2">
          {LOAD_FACES.map((face) => {
            const isActive = Math.abs(rpe - face.value) <= 1;
            return (
              <button
                key={face.value}
                type="button"
                onClick={() => setRpe(face.value)}
                className={`flex flex-col items-center gap-1 rounded-2xl border px-2 py-3 text-xs transition ${
                  isActive
                    ? "shadow-md"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
                style={
                  isActive
                    ? {
                        background: `${theme.palette.primary}12`,
                        borderColor: theme.palette.primary,
                        color: theme.palette.primary,
                      }
                    : undefined
                }
              >
                <span className="text-2xl leading-none">{face.emoji}</span>
                <span>{face.label}</span>
              </button>
            );
          })}
        </div>

        <input
          type="range"
          name="rpe"
          min={1}
          max={10}
          step={1}
          value={rpe}
          onChange={(event) => setRpe(Number(event.target.value))}
          className="w-full"
          style={{ accentColor: theme.palette.primary }}
        />
        <div className="flex justify-between text-[11px] text-slate-500">
          <span>1 · לא הרגשתי</span>
          <span>10 · קריסה</span>
        </div>
      </fieldset>

      <hr className="border-slate-200" />

      {/* 2. Perceived pace */}
      <fieldset className="space-y-3">
        <legend className="font-display text-2xl text-slate-900">
          איך הרגשת עם הקצב?
        </legend>
        <input type="hidden" name="pace" value={pace} />
        <div className="grid gap-3 sm:grid-cols-3">
          {PACE_OPTIONS.map((option) => {
            const isActive = pace === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setPace(option.value)}
                className={`flex flex-col items-start gap-1 rounded-2xl border p-4 text-right transition ${
                  isActive ? "shadow-md" : "border-slate-200 bg-white hover:border-slate-300"
                }`}
                style={
                  isActive
                    ? {
                        background: `${theme.palette.primary}12`,
                        borderColor: theme.palette.primary,
                        color: theme.palette.primary,
                      }
                    : undefined
                }
              >
                <span className="text-3xl leading-none">{option.emoji}</span>
                <span className="text-sm font-semibold">{option.label}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <hr className="border-slate-200" />

      {/* 3. Pain check */}
      <fieldset className="space-y-3">
        <legend className="font-display text-2xl text-slate-900">
          משהו כואב בצורה חריגה?
        </legend>
        <input type="hidden" name="hasPain" value={hasPain ? "yes" : "no"} />
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              setHasPain(false);
              setPainLocations(new Set());
            }}
            className={`rounded-2xl border p-4 text-base font-semibold transition ${
              !hasPain
                ? "shadow-md"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
            style={
              !hasPain
                ? {
                    background: `${theme.palette.primary}12`,
                    borderColor: theme.palette.primary,
                    color: theme.palette.primary,
                  }
                : undefined
            }
          >
            ✓ הכל בסדר
          </button>
          <button
            type="button"
            onClick={() => setHasPain(true)}
            className={`rounded-2xl border p-4 text-base font-semibold transition ${
              hasPain
                ? "shadow-md"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
            style={
              hasPain
                ? {
                    background: "#fee2e2",
                    borderColor: "#dc2626",
                    color: "#991b1b",
                  }
                : undefined
            }
          >
            ✕ יש כאב
          </button>
        </div>

        {hasPain ? (
          <div className="space-y-3 pt-2">
            <p className="text-sm text-slate-600">
              סמן איפה. כאב חוזר באותו אזור פעמיים תוך שבועיים פותח התראה למאמן
              ומשנה את האימון הבא אוטומטית.
            </p>
            <div className="flex flex-wrap gap-2">
              {PAIN_LOCATIONS.map((loc) => {
                const selected = painLocations.has(loc.value);
                return (
                  <label
                    key={loc.value}
                    className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm transition ${
                      selected
                        ? "border-red-500 bg-red-50 text-red-700"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      name="painLocations"
                      value={loc.value}
                      checked={selected}
                      onChange={() => togglePain(loc.value)}
                      className="sr-only"
                    />
                    {loc.label}
                  </label>
                );
              })}
            </div>
          </div>
        ) : null}
      </fieldset>

      <hr className="border-slate-200" />

      {/* Optional coach note */}
      <div className="space-y-2">
        {showNote ? (
          <>
            <label className="font-stencil text-xs tracking-widest text-slate-500">
              הערה למאמן (רשות)
            </label>
            <textarea
              name="coachNote"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              maxLength={600}
              placeholder="לדוגמה: רצתי עם נעליים חדשות, נשבר לי הקצב באמצע."
              className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />
          </>
        ) : (
          <button
            type="button"
            onClick={() => setShowNote(true)}
            className="text-sm font-medium text-slate-500 underline-offset-4 hover:text-slate-800 hover:underline"
          >
            + הוסף הערה למאמן
          </button>
        )}
      </div>

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
        שלח תחקור
      </button>
    </form>
  );
}
