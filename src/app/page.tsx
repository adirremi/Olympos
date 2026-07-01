import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <LogoStrip />
        <Features />
        <HowItWorks />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white">
            F
          </span>
          <span className="text-lg font-semibold tracking-tight text-slate-900">
            FieldCheck
          </span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
          <a href="#features" className="transition-colors hover:text-slate-900">
            Features
          </a>
          <a href="#how" className="transition-colors hover:text-slate-900">
            How it works
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 sm:inline"
          >
            Sign in
          </Link>
          <Link
            href="/login"
            className="inline-flex h-9 items-center justify-center rounded-lg bg-slate-900 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-800"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(37,99,235,0.10),transparent)]"
      />
      <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
            For local & field-service businesses
          </span>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-900 sm:text-6xl">
            Log every job. Show your work{" "}
            <span className="text-blue-600">on the map.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
            FieldCheck turns each on-site check-in into branded photos, an
            interactive map widget for your website, and a post published across
            Facebook, Instagram, Google Business, and YouTube — automatically.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-slate-900 px-7 text-sm font-medium text-white transition-colors hover:bg-slate-800 sm:w-auto"
            >
              Sign in with Google
            </Link>
            <a
              href="#how"
              className="inline-flex h-12 w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-7 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 sm:w-auto"
            >
              See how it works
            </a>
          </div>
          <p className="mt-4 text-xs text-slate-400">
            No credit card required · Set up in minutes
          </p>
        </div>
      </div>
    </section>
  );
}

function LogoStrip() {
  const channels = [
    "Facebook",
    "Instagram",
    "Google Business",
    "YouTube",
    "Your website",
  ];
  return (
    <section className="border-y border-slate-200/70 bg-slate-50/60">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 py-8 sm:flex-row sm:justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
          Publish everywhere from one place
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
          {channels.map((channel) => (
            <span
              key={channel}
              className="text-sm font-semibold text-slate-400"
            >
              {channel}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  const features = [
    {
      title: "On-site check-ins",
      description:
        "Capture the address, description, and photos of every field job in seconds — from any phone.",
      icon: "📍",
    },
    {
      title: "Branded photos",
      description:
        "Your business name and location are automatically overlaid onto each photo before it goes live.",
      icon: "🖼️",
    },
    {
      title: "Interactive map widget",
      description:
        "Embed a live map on your website showing every job you've done, building trust with new customers.",
      icon: "🗺️",
    },
    {
      title: "One-click publishing",
      description:
        "Post to Facebook, Instagram, Google Business, and YouTube at once — with per-platform retry if one fails.",
      icon: "🚀",
    },
    {
      title: "Local SEO keywords",
      description:
        "Auto-suggested keywords and hashtags help each post rank for your service and city.",
      icon: "🔑",
    },
    {
      title: "Everything saved",
      description:
        "Every job, photo, caption, and publication result is stored securely and isolated per business.",
      icon: "🔒",
    },
  ];

  return (
    <section id="features" className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Everything you need to market your field work
        </h2>
        <p className="mt-4 text-lg text-slate-600">
          Stop juggling apps. FieldCheck takes a single check-in and turns it
          into content across every channel that matters.
        </p>
      </div>

      <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <article
            key={feature.title}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-xl">
              {feature.icon}
            </div>
            <h3 className="mt-5 text-lg font-semibold text-slate-900">
              {feature.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {feature.description}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      step: "01",
      title: "Check in on-site",
      description:
        "Snap photos and log the address while you're at the job. Takes less than a minute.",
    },
    {
      step: "02",
      title: "We brand & format",
      description:
        "FieldCheck overlays your business name and location, optimizes the image, and writes the caption.",
    },
    {
      step: "03",
      title: "Publish & show off",
      description:
        "Push to every connected platform and your website map with one tap. Your portfolio grows itself.",
    },
  ];

  return (
    <section id="how" className="border-y border-slate-200/70 bg-slate-50/60">
      <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            From job site to social feed in three steps
          </h2>
        </div>

        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {steps.map((step) => (
            <div key={step.step} className="relative">
              <span className="text-5xl font-bold text-slate-200">
                {step.step}
              </span>
              <h3 className="mt-3 text-lg font-semibold text-slate-900">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 px-8 py-16 text-center">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_80%_at_50%_0%,rgba(37,99,235,0.35),transparent)]"
        />
        <div className="relative mx-auto max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Ready to turn every job into marketing?
          </h2>
          <p className="mt-4 text-lg text-slate-300">
            Join local businesses using FieldCheck to build trust and win more
            work — automatically.
          </p>
          <Link
            href="/login"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-lg bg-white px-8 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-100"
          >
            Get started free
          </Link>
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-slate-200/70">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white">
            F
          </span>
          <span className="text-sm font-semibold text-slate-900">
            FieldCheck
          </span>
        </div>
        <p className="text-xs text-slate-500">
          © {new Date().getFullYear()} FieldCheck. All rights reserved.
        </p>
        <Link
          href="/login"
          className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
        >
          Sign in
        </Link>
      </div>
    </footer>
  );
}
