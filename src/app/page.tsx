import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  FacebookIcon,
  GoogleBusinessIcon,
  InstagramIcon,
  MapPinIcon,
  YoutubeIcon,
} from "@/components/brand-icons";

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
        <Stats />
        <Channels />
        <Features />
        <HowItWorks />
        <Testimonials />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  );
}

function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2 ${className}`}>
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-sm font-bold text-white shadow-sm">
        F
      </span>
      <span className="text-lg font-bold tracking-tight text-slate-900">
        FieldCheck
      </span>
    </span>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
          <a href="#channels" className="transition-colors hover:text-slate-900">
            Channels
          </a>
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
            className="inline-flex h-9 items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
          >
            Get started free
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
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(45%_45%_at_15%_0%,rgba(37,99,235,0.14),transparent),radial-gradient(45%_45%_at_85%_10%,rgba(217,41,118,0.12),transparent)]"
      />
      <div className="mx-auto max-w-6xl px-6 pb-8 pt-16 sm:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
            The social workspace for field-service businesses
          </span>
          <h1 className="mt-6 text-4xl font-extrabold leading-[1.05] tracking-tight text-slate-900 sm:text-6xl">
            Every job, turned into{" "}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              marketing that wins work.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
            One on-site check-in becomes branded photos, a live map on your
            website, and a post published across Facebook, Instagram, Google
            Business, and YouTube — all in a single tap.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-7 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-opacity hover:opacity-90 sm:w-auto"
            >
              Start for free
            </Link>
            <a
              href="#how"
              className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-7 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 sm:w-auto"
            >
              See how it works
            </a>
          </div>
          <p className="mt-4 text-xs text-slate-400">
            No credit card required · Free forever plan
          </p>
        </div>

        <ProductMockup />
      </div>
    </section>
  );
}

function ProductMockup() {
  return (
    <div className="relative mx-auto mt-14 max-w-4xl">
      <div
        aria-hidden
        className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-r from-blue-600/20 via-indigo-600/20 to-purple-600/20 blur-2xl"
      />
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* browser bar */}
        <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-red-400" />
          <span className="h-3 w-3 rounded-full bg-yellow-400" />
          <span className="h-3 w-3 rounded-full bg-green-400" />
          <span className="ml-3 hidden rounded-md bg-white px-3 py-1 text-xs text-slate-400 shadow-inner sm:block">
            app.fieldcheck.io/check-ins
          </span>
        </div>

        <div className="grid gap-4 p-4 sm:grid-cols-5 sm:p-6">
          {/* map panel */}
          <div className="relative sm:col-span-3">
            <div className="relative h-56 overflow-hidden rounded-xl bg-gradient-to-br from-emerald-50 via-sky-50 to-indigo-50 sm:h-72">
              <div
                aria-hidden
                className="absolute inset-0 opacity-60 [background-image:linear-gradient(#cbd5e120_1px,transparent_1px),linear-gradient(90deg,#cbd5e120_1px,transparent_1px)] [background-size:28px_28px]"
              />
              <Pin className="left-[22%] top-[35%]" />
              <Pin className="left-[55%] top-[28%]" delay />
              <Pin className="left-[68%] top-[62%]" />
              <Pin className="left-[38%] top-[68%]" delay />
              <span className="absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
                42 jobs mapped this month
              </span>
            </div>
          </div>

          {/* check-in card */}
          <div className="sm:col-span-2">
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="h-24 rounded-lg bg-gradient-to-br from-slate-800 to-slate-600" />
              <p className="mt-3 text-sm font-semibold text-slate-900">
                Ace Locksmith
              </p>
              <p className="text-xs text-slate-500">Brooklyn, New York</p>

              <div className="mt-4 space-y-2">
                <PublishRow
                  icon={<FacebookIcon className="h-4 w-4" style={{ color: "#1877F2" }} />}
                  label="Facebook"
                />
                <PublishRow icon={<InstagramIcon className="h-4 w-4" />} label="Instagram" />
                <PublishRow
                  icon={<GoogleBusinessIcon className="h-4 w-4" />}
                  label="Google Business"
                />
                <PublishRow
                  icon={<YoutubeIcon className="h-4 w-4" />}
                  label="YouTube"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Pin({ className = "", delay = false }: { className?: string; delay?: boolean }) {
  return (
    <span className={`absolute ${className}`}>
      <span className="relative flex">
        <span
          className={`absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-60 ${
            delay ? "" : "animate-ping"
          }`}
        />
        <MapPinIcon className="relative h-6 w-6 text-blue-600 drop-shadow" />
      </span>
    </span>
  );
}

function PublishRow({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5">
      <span className="flex items-center gap-2 text-xs font-medium text-slate-700">
        {icon}
        {label}
      </span>
      <span className="flex items-center gap-1 text-xs font-semibold text-green-600">
        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.1 3.1 6.8-6.8a1 1 0 0 1 1.4 0z"
            clipRule="evenodd"
          />
        </svg>
        Posted
      </span>
    </div>
  );
}

function Stats() {
  const stats = [
    { value: "5", label: "Channels from one tap" },
    { value: "1-tap", label: "Publish everywhere" },
    { value: "100%", label: "Photos auto-branded" },
    { value: "24/7", label: "Live map on your site" },
  ];
  return (
    <section className="border-y border-slate-200/70 bg-slate-50/60">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-6 py-10 md:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="text-center">
            <p className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-3xl font-extrabold text-transparent">
              {stat.value}
            </p>
            <p className="mt-1 text-sm text-slate-600">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Channels() {
  const channels = [
    {
      name: "Facebook",
      icon: <FacebookIcon className="h-8 w-8" style={{ color: "#1877F2" }} />,
      bg: "bg-blue-50",
      ring: "group-hover:ring-blue-200",
    },
    {
      name: "Instagram",
      icon: <InstagramIcon className="h-8 w-8" />,
      bg: "bg-pink-50",
      ring: "group-hover:ring-pink-200",
    },
    {
      name: "Google Business",
      icon: <GoogleBusinessIcon className="h-8 w-8" />,
      bg: "bg-amber-50",
      ring: "group-hover:ring-amber-200",
    },
    {
      name: "YouTube",
      icon: <YoutubeIcon className="h-8 w-8" />,
      bg: "bg-red-50",
      ring: "group-hover:ring-red-200",
    },
    {
      name: "Website map",
      icon: <MapPinIcon className="h-8 w-8 text-emerald-600" />,
      bg: "bg-emerald-50",
      ring: "group-hover:ring-emerald-200",
    },
  ];

  return (
    <section id="channels" className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Publish everywhere from one place
        </h2>
        <p className="mt-4 text-lg text-slate-600">
          Connect your accounts once. Every check-in goes out to all of them —
          formatted correctly for each.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {channels.map((channel) => (
          <div
            key={channel.name}
            className="group flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <div
              className={`flex h-16 w-16 items-center justify-center rounded-2xl ${channel.bg} ring-2 ring-transparent transition ${channel.ring}`}
            >
              {channel.icon}
            </div>
            <span className="text-sm font-semibold text-slate-700">
              {channel.name}
            </span>
          </div>
        ))}
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
      emoji: "📍",
      tint: "bg-blue-50 text-blue-600",
    },
    {
      title: "Auto-branded photos",
      description:
        "Your business name and location are overlaid onto each photo automatically before it goes live.",
      emoji: "🖼️",
      tint: "bg-purple-50 text-purple-600",
    },
    {
      title: "Interactive map widget",
      description:
        "Embed a live map on your website showing every job you've done — instant social proof.",
      emoji: "🗺️",
      tint: "bg-emerald-50 text-emerald-600",
    },
    {
      title: "One-tap publishing",
      description:
        "Post to every connected platform at once, with per-platform retry if one fails.",
      emoji: "🚀",
      tint: "bg-orange-50 text-orange-600",
    },
    {
      title: "Local SEO keywords",
      description:
        "Auto-suggested keywords and hashtags help each post rank for your service and city.",
      emoji: "🔑",
      tint: "bg-amber-50 text-amber-600",
    },
    {
      title: "Secure & isolated",
      description:
        "Every job, photo, caption, and result is stored securely and kept separate per business.",
      emoji: "🔒",
      tint: "bg-slate-100 text-slate-600",
    },
  ];

  return (
    <section id="features" className="border-y border-slate-200/70 bg-slate-50/60">
      <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Everything you need to market your field work
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Stop juggling apps. FieldCheck turns a single check-in into content
            across every channel that matters.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl text-2xl ${feature.tint}`}
              >
                {feature.emoji}
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
      tint: "from-blue-600 to-indigo-600",
    },
    {
      step: "02",
      title: "We brand & format",
      description:
        "FieldCheck overlays your business name and location, optimizes the image, and writes the caption.",
      tint: "from-indigo-600 to-purple-600",
    },
    {
      step: "03",
      title: "Publish & show off",
      description:
        "Push to every platform and your website map with one tap. Your portfolio grows itself.",
      tint: "from-purple-600 to-pink-600",
    },
  ];

  return (
    <section id="how" className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          From job site to social feed in three steps
        </h2>
      </div>

      <div className="mt-14 grid gap-8 md:grid-cols-3">
        {steps.map((step) => (
          <div
            key={step.step}
            className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm"
          >
            <span
              className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${step.tint} text-lg font-bold text-white shadow`}
            >
              {step.step}
            </span>
            <h3 className="mt-5 text-lg font-semibold text-slate-900">
              {step.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Testimonials() {
  const items = [
    {
      quote:
        "Every job we finish is now a post on four platforms before we've packed up the van. Our Google Business traffic doubled.",
      name: "Marco R.",
      role: "Ace Locksmith",
      initial: "M",
      tint: "from-blue-500 to-indigo-500",
    },
    {
      quote:
        "The map on our website closes deals. New customers see we've worked right around their corner.",
      name: "Dana L.",
      role: "BrightClean Services",
      initial: "D",
      tint: "from-emerald-500 to-teal-500",
    },
    {
      quote:
        "I used to spend evenings posting photos. Now it's one tap on-site and I'm done. Total game changer.",
      name: "Sam K.",
      role: "Peak HVAC",
      initial: "S",
      tint: "from-orange-500 to-pink-500",
    },
  ];

  return (
    <section className="border-y border-slate-200/70 bg-slate-50/60">
      <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Loved by local businesses
          </h2>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {items.map((item) => (
            <figure
              key={item.name}
              className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex gap-1 text-amber-400">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg key={i} className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 15l-5.2 2.6 1-5.8L1.5 7.7l5.9-.9L10 1.5z" />
                  </svg>
                ))}
              </div>
              <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-slate-700">
                “{item.quote}”
              </blockquote>
              <figcaption className="mt-5 flex items-center gap-3">
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${item.tint} text-sm font-bold text-white`}
                >
                  {item.initial}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-slate-900">
                    {item.name}
                  </span>
                  <span className="block text-xs text-slate-500">
                    {item.role}
                  </span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 px-8 py-16 text-center">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_20%_20%,white,transparent_40%),radial-gradient(circle_at_80%_60%,white,transparent_35%)]"
        />
        <div className="relative mx-auto max-w-2xl">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to turn every job into marketing?
          </h2>
          <p className="mt-4 text-lg text-blue-100">
            Join local businesses using FieldCheck to build trust and win more
            work — automatically.
          </p>
          <Link
            href="/login"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-xl bg-white px-8 text-sm font-semibold text-indigo-700 shadow-lg transition-transform hover:scale-[1.02]"
          >
            Get started free
          </Link>
          <p className="mt-4 text-xs text-blue-200">
            No credit card required · Set up in minutes
          </p>
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-slate-200/70">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
        <Logo />
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
