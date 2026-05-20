import Link from "next/link";
import { AccountStrip } from "@/components/account-strip";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isLoggedIn = Boolean(user);

  return (
    <main className="min-h-screen px-5 py-10">
      <section className="mx-auto max-w-6xl space-y-7">
        <AccountStrip />

        <header className="brutal-border brutal-shadow-ink relative bg-paper p-8">
          <div className="absolute -inset-[3px] border border-blood pointer-events-none" />
          <div className="font-stencil mb-5 flex flex-wrap items-center justify-between gap-3 border-b-2 border-ink pb-3 text-sm">
            <span className="font-bold text-blood">אולימפוס · הכנה לקרב</span>
            <span className="flex items-center gap-2">
              <span className="pulse-dot" />
              מערכת פעילה
            </span>
          </div>

          <div className="space-y-3">
            <h1 className="font-display text-6xl leading-[0.85] md:text-[120px]">
              <span className="text-blood">לקראת</span>
              <br />
              <span className="text-ink">הגיוס.</span>
            </h1>
            <p className="font-stencil border-r-4 border-blood pr-3 text-lg md:text-xl">
              ליווי אישי · אימון יומי · WhatsApp · מאמן אישי
            </p>
          </div>
        </header>

        <section className="brutal-border brutal-shadow-blood grid bg-ink md:grid-cols-3">
          <Stat number="3" label="הקבצות כושר" accent="blood" />
          <Stat number="∞" label="בלי תירוצים" accent="ink" />
          <Stat number="78" label="יעד יומי" accent="blood" />
        </section>

        <section className="grid gap-5 md:grid-cols-2">
          <div className="brutal-card p-7">
            <p className="font-stencil mb-2 text-sm text-steel">01 · המוצר</p>
            <h2 className="font-display text-3xl md:text-4xl">
              חניך → תוכנית → ביצוע
            </h2>
            <p className="mt-3 leading-7">
              בוחר יעד גיוס, ממלא שאלון, מקבל תוכנית אישית, מדווח ביצוע
              בדשבורד או ב־WhatsApp. המאמן רואה הכל.
            </p>
          </div>
          <div className="brutal-card p-7">
            <p className="font-stencil mb-2 text-sm text-steel">02 · המנוע</p>
            <h2 className="font-display text-3xl md:text-4xl">3 הודעות ביום</h2>
            <p className="mt-3 leading-7">
              בוקר טוב עם האימון, תזכורת לפני, דיווח אחרי. תשובת חניך =
              עדכון אוטומטי ב־DB.
            </p>
          </div>
        </section>

        <section className="brutal-border relative overflow-hidden bg-ink p-12 text-paper">
          <div className="marquee-bg">
            <div className="marquee-track">
              אולימפוס · אולימפוס · אולימפוס · אולימפוס ·
            </div>
          </div>
          <div className="relative space-y-5 text-center">
            <h2 className="font-display text-4xl leading-[0.95] md:text-6xl">
              לא עוד תוכנית
              <br />
              <span className="text-blood">תוכנית בשבילך.</span>
            </h2>
            <div className="flex flex-wrap items-center justify-center gap-4 pt-3">
              {isLoggedIn ? (
                <Link href="/dashboard" className="brutal-button is-blood">
                  לפאנל האישי
                </Link>
              ) : (
                <>
                  <Link href="/login" className="brutal-button is-blood">
                    התחלת תהליך
                  </Link>
                  <Link href="/onboarding" className="brutal-button is-paper">
                    לשאלון
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>

        <footer className="font-stencil flex flex-wrap items-center justify-between gap-3 border-t-[3px] border-ink pt-5 text-sm">
          <span>אולימפוס · 2026</span>
          <span className="border-[3px] border-blood px-3 py-1 text-blood">
            אין ויתורים
          </span>
          <span>בית · פרוטוקול · שטח</span>
        </footer>
      </section>
    </main>
  );
}

function Stat({
  number,
  label,
  accent,
}: {
  number: string;
  label: string;
  accent: "blood" | "ink";
}) {
  return (
    <div className="border-l-2 border-ink bg-paper p-6 text-center first:border-l-0">
      <div
        className={`font-display text-6xl leading-none ${
          accent === "blood" ? "text-blood" : "text-ink"
        }`}
      >
        {number}
      </div>
      <div className="font-stencil mt-2 text-xs text-steel">{label}</div>
    </div>
  );
}
