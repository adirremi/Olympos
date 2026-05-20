"use client";

import { useState } from "react";
import { recruitmentTargets } from "@/lib/constants";

type FormState = {
  fullName: string;
  phone: string;
  region: string;
  recruitmentTarget: string;
  enlistmentDate: string;
  gibushDate: string;
  sayeretDayDate: string;
  run2kMinutes: string;
  maxPullups: string;
  maxPushups: string;
  weeklyTrainingDays: string;
  motivationLevel: string;
  hasInjury: boolean;
  injuryDetails: string;
  acceptedHealthDeclaration: boolean;
};

const initialState: FormState = {
  fullName: "",
  phone: "",
  region: "",
  recruitmentTarget: "combat_service",
  enlistmentDate: "",
  gibushDate: "",
  sayeretDayDate: "",
  run2kMinutes: "",
  maxPullups: "",
  maxPushups: "",
  weeklyTrainingDays: "",
  motivationLevel: "4",
  hasInjury: false,
  injuryDetails: "",
  acceptedHealthDeclaration: false,
};

export function OnboardingForm() {
  const [form, setForm] = useState<FormState>(initialState);
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const update = (field: keyof FormState, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("submitting");
    setErrorMessage(null);

    const response = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        targetEventDate: form.enlistmentDate,
      }),
    });

    if (response.ok) {
      window.location.href = "/dashboard";
      return;
    }

    const body = await response.json().catch(() => ({ error: "Unknown" }));
    setErrorMessage(body.error || "שמירה נכשלה");
    setStatus("error");
  };

  return (
    <main className="min-h-screen px-5 py-10">
      <form
        className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.85fr_1.15fr]"
        onSubmit={submit}
      >
        <aside className="brutal-border brutal-shadow-blood relative bg-paper p-7">
          <div className="absolute -inset-[3px] border border-blood pointer-events-none" />
          <div className="font-stencil mb-5 flex items-center justify-between border-b-2 border-ink pb-3 text-sm">
            <span className="font-bold text-blood">שאלון פתיחה</span>
            <span className="flex items-center gap-2">
              <span className="pulse-dot" />
              שלב 1
            </span>
          </div>
          <h1 className="font-display text-5xl leading-[0.9]">
            שאלון
            <br />
            <span className="text-blood">פתיחה.</span>
          </h1>
          <p className="mt-5 leading-7 text-steel">
            הנתונים קובעים יעד, רמת פתיחה, הקבצה, ותוכנית אימונים ראשונית.
            כל שדה משנה את התוכנית.
          </p>

          <div className="brutal-border mt-7 bg-ink p-5 text-paper">
            <p className="font-stencil text-xs text-blood">כללי המשחק</p>
            <ul className="mt-2 space-y-2 text-sm leading-6">
              <li>· אמת בלבד · בלי לייפות</li>
              <li>· מספר וואטסאפ תקין</li>
              <li>· תאריכי גיוס/גיבוש קובעים את הזמן</li>
            </ul>
          </div>
        </aside>

        <section className="space-y-6">
          <FieldGroup title="פרטים אישיים" tag="פרטים">
            <Input
              label="שם מלא"
              value={form.fullName}
              onChange={(value) => update("fullName", value)}
              required
            />
            <Input
              label="טלפון וואטסאפ"
              value={form.phone}
              placeholder="05XXXXXXXX"
              onChange={(value) => update("phone", value)}
              required
            />
            <Input
              label="אזור בארץ"
              value={form.region}
              onChange={(value) => update("region", value)}
            />
            <Select
              label="יעד גיוס"
              value={form.recruitmentTarget}
              onChange={(value) => update("recruitmentTarget", value)}
            >
              {recruitmentTargets.map((target) => (
                <option key={target.value} value={target.value}>
                  {target.label}
                </option>
              ))}
            </Select>
          </FieldGroup>

          <FieldGroup title="תאריכים קריטיים" tag="ציר זמן">
            <Input
              label="תאריך גיוס יעד"
              type="date"
              value={form.enlistmentDate}
              onChange={(value) => update("enlistmentDate", value)}
            />
            <Input
              label="תאריך גיבוש"
              type="date"
              value={form.gibushDate}
              onChange={(value) => update("gibushDate", value)}
            />
            <Input
              label="יום סיירות"
              type="date"
              value={form.sayeretDayDate}
              onChange={(value) => update("sayeretDayDate", value)}
            />
          </FieldGroup>

          <FieldGroup title="רמת כושר נוכחית" tag="פתיחה">
            <Input
              label="2 ק״מ בדקות"
              type="number"
              value={form.run2kMinutes}
              onChange={(value) => update("run2kMinutes", value)}
              required
            />
            <Input
              label="מקס מתח"
              type="number"
              value={form.maxPullups}
              onChange={(value) => update("maxPullups", value)}
              required
            />
            <Input
              label="מקס שכיבות סמיכה"
              type="number"
              value={form.maxPushups}
              onChange={(value) => update("maxPushups", value)}
              required
            />
            <Input
              label="ימי אימון בשבוע"
              type="number"
              value={form.weeklyTrainingDays}
              onChange={(value) => update("weeklyTrainingDays", value)}
              required
            />
          </FieldGroup>

          <FieldGroup title="מוטיבציה ומגבלות" tag="ראש · גוף">
            <label className="space-y-2 md:col-span-2">
              <span className="font-stencil text-sm">
                רמת מוטיבציה · {form.motivationLevel}/5
              </span>
              <input
                type="range"
                min="1"
                max="5"
                value={form.motivationLevel}
                onChange={(event) =>
                  update("motivationLevel", event.target.value)
                }
                className="w-full accent-blood"
              />
            </label>

            <label className="brutal-border flex items-center gap-3 bg-paper p-4 md:col-span-2">
              <input
                type="checkbox"
                checked={form.hasInjury}
                onChange={(event) => update("hasInjury", event.target.checked)}
                className="h-5 w-5 accent-blood"
              />
              <span className="font-bold">יש פציעה / מגבלה רפואית</span>
            </label>

            {form.hasInjury ? (
              <textarea
                className="brutal-input min-h-28 md:col-span-2"
                value={form.injuryDetails}
                onChange={(event) =>
                  update("injuryDetails", event.target.value)
                }
                placeholder="פירוט פציעה / מגבלה"
              />
            ) : null}
          </FieldGroup>

          <FieldGroup title="אישור" tag="חתימה">
            <label className="brutal-border flex items-start gap-3 bg-paper p-4 md:col-span-2">
              <input
                type="checkbox"
                checked={form.acceptedHealthDeclaration}
                onChange={(event) =>
                  update("acceptedHealthDeclaration", event.target.checked)
                }
                className="mt-1 h-5 w-5 accent-blood"
                required
              />
              <span className="leading-7">
                אני מאשר הצהרת בריאות ותקנון שימוש. נוסח משפטי סופי יוחלף לפני השקה.
              </span>
            </label>
          </FieldGroup>

          <button
            type="submit"
            disabled={status === "submitting"}
            className="brutal-button is-blood w-full text-lg disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "submitting" ? "שומר..." : "שמור · המשך לדשבורד"}
          </button>

          {status === "error" ? (
            <div className="brutal-border bg-blood p-4 text-paper">
              <p className="font-stencil">שגיאה</p>
              <p className="mt-1 text-sm">{errorMessage}</p>
            </div>
          ) : null}
        </section>
      </form>
    </main>
  );
}

function FieldGroup({
  title,
  tag,
  children,
}: {
  title: string;
  tag: string;
  children: React.ReactNode;
}) {
  return (
    <section className="brutal-border brutal-shadow-ink bg-paper">
      <header className="flex items-center justify-between border-b-2 border-ink bg-ink px-5 py-3 text-paper">
        <h2 className="font-display text-2xl">{title}</h2>
        <span className="font-stencil text-xs text-blood">{tag}</span>
      </header>
      <div className="grid gap-4 p-5 md:grid-cols-2">{children}</div>
    </section>
  );
}

function Input({
  label,
  onChange,
  value,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="space-y-2">
      <span className="font-stencil text-xs text-steel">{label}</span>
      <input
        className="brutal-input"
        type={type}
        value={value}
        placeholder={placeholder}
        required={required}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-2">
      <span className="font-stencil text-xs text-steel">{label}</span>
      <select
        className="brutal-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
    </label>
  );
}
