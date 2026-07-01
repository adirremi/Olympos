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
        O
      </span>
      <span className="text-lg font-bold tracking-tight text-slate-900">
        Olympos Sync
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
            app.olympos.io/check-ins
          </span>
        </div>

        <div className="grid gap-4 p-4 sm:grid-cols-5 sm:p-6">
          {/* map panel */}
          <div className="relative sm:col-span-3">
            <div className="relative h-64 overflow-hidden rounded-xl border border-slate-200 sm:h-96">
              <MapBackdrop />
              {PIN_POSITIONS.map(([left, top], index) => (
                <MapMarker
                  key={index}
                  left={left}
                  top={top}
                  active={index % 6 === 0}
                />
              ))}
              <span className="absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
                {PIN_POSITIONS.length} jobs mapped across New York
              </span>
            </div>
          </div>

          {/* jobs gallery */}
          <div className="sm:col-span-2">
            <div className="flex h-full flex-col rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-900">
                Recent jobs
              </p>
              <p className="text-xs text-slate-500">Live on your website</p>

              <div className="mt-3 grid flex-1 grid-cols-2 gap-2">
                {GALLERY.map((item, index) => (
                  <div
                    key={index}
                    className="group relative overflow-hidden rounded-lg"
                  >
                    <div className={`h-full min-h-16 w-full ${item.tint}`} />
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1 text-[10px] font-medium text-white">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Scattered job locations across a zoomed-out Manhattan (left %, top %).
// Kept off the water (left river / bottom-right) so pins land on "streets".
const PIN_POSITIONS: [number, number][] = [
  [32, 12], [40, 9], [47, 16], [36, 24], [44, 28],
  [52, 11], [56, 21], [49, 35], [41, 42], [34, 38],
  [59, 32], [64, 15], [61, 44], [53, 50], [46, 56],
  [39, 54], [31, 49], [67, 28], [70, 42], [57, 60],
  [49, 66], [42, 69], [63, 55], [72, 50], [36, 63],
  [51, 78],
];

const GALLERY = [
  { label: "Manhattan, NY", tint: "bg-gradient-to-br from-amber-200 to-orange-300" },
  { label: "Brooklyn, NY", tint: "bg-gradient-to-br from-sky-200 to-indigo-300" },
  { label: "Queens, NY", tint: "bg-gradient-to-br from-emerald-200 to-teal-300" },
  { label: "Bronx, NY", tint: "bg-gradient-to-br from-rose-200 to-pink-300" },
  { label: "Harlem, NY", tint: "bg-gradient-to-br from-violet-200 to-purple-300" },
  { label: "Midtown, NY", tint: "bg-gradient-to-br from-slate-300 to-slate-400" },
];

function MapMarker({
  left,
  top,
  active,
}: {
  left: number;
  top: number;
  active: boolean;
}) {
  return (
    <span
      className="absolute -translate-x-1/2 -translate-y-full"
      style={{ left: `${left}%`, top: `${top}%` }}
    >
      <span className="relative flex flex-col items-center">
        {active ? (
          <span className="absolute top-full inline-flex h-3 w-3 -translate-y-1 animate-ping rounded-full bg-blue-500/60" />
        ) : null}
        <MapPinIcon className="relative h-5 w-5 text-blue-600 drop-shadow-sm" />
      </span>
    </span>
  );
}

// A stylized, zoomed-out New York map (Hudson + East River, Central Park,
// avenue/street grid) rendered purely as SVG so it needs no external tiles.
function MapBackdrop() {
  const avenues = Array.from({ length: 13 });
  const streets = Array.from({ length: 11 });
  return (
    <svg
      viewBox="0 0 500 340"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
      aria-hidden
    >
      <rect width="500" height="340" fill="#eef1ec" />
      {/* Hudson River (left) */}
      <polygon points="0,0 120,0 66,340 0,340" fill="#bfe0f2" />
      {/* East River (bottom-right) */}
      <polygon points="500,150 500,340 300,340 360,230" fill="#bfe0f2" />
      {/* Central Park */}
      <rect x="250" y="60" width="78" height="120" rx="6" fill="#cbe8bd" />
      {/* street grid */}
      {streets.map((_, i) => (
        <line
          key={`s${i}`}
          x1="60"
          y1={24 + i * 30}
          x2="500"
          y2={24 + i * 30}
          stroke="#dfe4de"
          strokeWidth="1.5"
        />
      ))}
      {avenues.map((_, i) => (
        <line
          key={`a${i}`}
          x1={150 + i * 28}
          y1="0"
          x2={120 + i * 28}
          y2="340"
          stroke="#dfe4de"
          strokeWidth="1.5"
        />
      ))}
      {/* a couple of wide avenues */}
      <line x1="210" y1="0" x2="180" y2="340" stroke="#ffffff" strokeWidth="5" />
      <line x1="330" y1="0" x2="300" y2="340" stroke="#ffffff" strokeWidth="5" />
      <line x1="60" y1="120" x2="500" y2="120" stroke="#ffffff" strokeWidth="4" />
    </svg>
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
            Stop juggling apps. Olympos Sync turns a single check-in into content
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
        "Olympos Sync overlays your business name and location, optimizes the image, and writes the caption.",
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
            Join local businesses using Olympos Sync to build trust and win more
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
          © {new Date().getFullYear()} Olympos Sync. All rights reserved.
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
