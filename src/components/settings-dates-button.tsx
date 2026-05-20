"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { updateEventDates } from "@/app/dashboard/actions";
import type { UnitTheme } from "@/lib/units";

export function SettingsDatesButton({
  enlistmentDate,
  gibushDate,
  sayeretDayDate,
  theme,
}: {
  enlistmentDate: string | null;
  gibushDate: string | null;
  sayeretDayDate: string | null;
  theme: UnitTheme;
}) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const firstInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    window.setTimeout(() => firstInputRef.current?.focus(), 0);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="הגדרות תאריכים"
        className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition hover:scale-[1.02]"
        style={{
          background: "rgba(255,255,255,0.12)",
          color: theme.palette.onPrimary,
          borderColor: "rgba(255,255,255,0.25)",
        }}
      >
        <GearIcon />
        <span className="font-stencil tracking-widest">הגדרות</span>
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[9999] grid place-items-center bg-slate-950/70 p-4 backdrop-blur-md"
              onClick={(event) => {
                if (event.target === event.currentTarget) setOpen(false);
              }}
            >
              <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-label="עדכון תאריכים"
                className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-3xl bg-white text-slate-900 shadow-2xl"
              >
                <header
                  className="flex items-center justify-between px-6 py-4"
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
                      ציר זמן
                    </div>
                    <h2 className="font-display text-2xl">תאריכים חשובים</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="סגור"
                    className="rounded-full p-1.5 opacity-80 transition hover:bg-white/10 hover:opacity-100"
                  >
                    <CloseIcon />
                  </button>
                </header>

                <form
                  action={async (formData) => {
                    await updateEventDates(formData);
                    setOpen(false);
                  }}
                  className="space-y-4 p-6"
                >
                  <p className="text-sm text-slate-600">
                    העדכון נשמר ישירות במערכת. ספירות לאחור בדשבורד מתעדכנות מיד.
                  </p>

                  <DateField
                    inputRef={firstInputRef}
                    label="תאריך גיוס"
                    name="enlistmentDate"
                    defaultValue={enlistmentDate ?? ""}
                  />
                  <DateField
                    label="תאריך גיבוש"
                    name="gibushDate"
                    defaultValue={gibushDate ?? ""}
                  />
                  <DateField
                    label="יום סיירות"
                    name="sayeretDayDate"
                    defaultValue={sayeretDayDate ?? ""}
                  />

                  <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
                    >
                      ביטול
                    </button>
                    <button
                      type="submit"
                      className="unit-button is-solid"
                      style={
                        {
                          "--unit-primary": theme.palette.primary,
                          "--unit-on": theme.palette.onPrimary,
                        } as React.CSSProperties
                      }
                    >
                      שמור תאריכים
                    </button>
                  </div>
                </form>
              </div>
            </div>,
          document.body,
        )
        : null}
    </>
  );
}

function DateField({
  label,
  name,
  defaultValue,
  inputRef,
}: {
  label: string;
  name: string;
  defaultValue: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <label className="block space-y-2">
      <span className="font-stencil text-[11px] tracking-widest text-slate-500">
        {label}
      </span>
      <input
        ref={inputRef}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-300"
        name={name}
        type="date"
        defaultValue={defaultValue}
      />
    </label>
  );
}

function GearIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
