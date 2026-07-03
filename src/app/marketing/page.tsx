import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  FacebookIcon,
  GoogleBusinessIcon,
  InstagramIcon,
  LinkedInIcon,
  TikTokIcon,
  YoutubeIcon,
} from "@/components/brand-icons";
import { createClient } from "@/lib/supabase/server";

export default async function MarketingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <main>
        <Hero />
        <PlatformBar />
        <PublishEverywhere />
        <ShowcaseSection
          badge="Check-in"
          title="Log every job in under a minute"
          description="Your technician snaps photos, picks the address from Google, adds keywords like “Locksmith Brooklyn” — and the check-in is ready. No copy-paste, no evening admin."
          image="/marketing/checkin-form.png"
          imageAlt="Olympos Sync check-in form with address, keywords, and media upload"
          reverse={false}
        />
        <ShowcaseSection
          badge="Publish"
          title="One tap. Every platform."
          description="Choose Facebook, Instagram, LinkedIn, TikTok, YouTube, Google Business — or all at once. We brand the photo with your business name and city, write the caption, and post to every network in parallel. Failed on one? Retry just that platform."
          image="/marketing/checkins-publish.png"
          imageAlt="Publishing check-ins to Facebook and Instagram with per-platform status"
          reverse
        />
        <ShowcaseSection
          badge="Connections"
          title="Connect once. Publish forever."
          description="Link your Google Business Profile, Facebook Page, and Instagram in minutes. See exactly which account is connected to which business — no guessing."
          image="/marketing/connections.png"
          imageAlt="Olympos Sync connections page with Facebook, Instagram, and Google Business"
          reverse={false}
        />
        <ShowcaseSection
          badge="Widget"
          title="A live job map on your website"
          description="Embed a map + gallery on your site. Every published check-in appears as a pin with photos and address — instant proof you work in their neighborhood."
          image="/marketing/widget-website.png"
          imageAlt="Lenny Locksmith website with embedded Olympos Sync job map widget"
          reverse
          highlight
        />
        <ShowcaseSection
          badge="Map"
          title="Real pins. Real photos. Real trust."
          description="Customers click a pin and see the actual job — lock install, HVAC repair, cleaning job — with date and description. Your portfolio builds itself after every visit."
          image="/marketing/widget-app.png"
          imageAlt="Interactive map widget with job listings and photos"
          reverse={false}
        />
        <DashboardSection />
        <HowItWorks />
        <CaseStudy />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}

function Logo() {
  return (
    <span className="flex items-center gap-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-sm font-bold text-white shadow-md">
        O
      </span>
      <span className="text-xl font-bold tracking-tight text-slate-900">
        Olympos Sync
      </span>
    </span>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/marketing">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
          <a href="#features" className="hover:text-slate-900">
            Features
          </a>
          <a href="#how" className="hover:text-slate-900">
            How it works
          </a>
          <a href="#case-study" className="hover:text-slate-900">
            Case study
          </a>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden text-sm font-medium text-slate-600 hover:text-slate-900 sm:inline"
          >
            Sign in
          </Link>
          <Link
            href="/login"
            className="inline-flex h-10 items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:opacity-90"
          >
            Start free
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
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(59,130,246,0.18),transparent),radial-gradient(ellipse_50%_40%_at_90%_20%,rgba(168,85,247,0.12),transparent)]"
      />
      <div className="mx-auto max-w-6xl px-6 pb-16 pt-14 sm:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-700">
            <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
            Built for locksmiths, cleaners, HVAC & field crews
          </p>
          <h1 className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-900 sm:text-6xl lg:text-7xl">
            Turn every job into{" "}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
              marketing that wins the next one
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600 sm:text-xl">
            Log a check-in on-site. Olympos Sync brands your photos, posts to
            social, and drops a live job map on your website — before you leave
            the driveway.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex h-13 w-full items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-8 text-base font-semibold text-white shadow-xl shadow-blue-600/30 transition hover:scale-[1.02] sm:w-auto"
            >
              Get started free →
            </Link>
            <a
              href="#features"
              className="inline-flex h-13 w-full items-center justify-center rounded-xl border-2 border-slate-200 px-8 text-base font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 sm:w-auto"
            >
              See the product
            </a>
          </div>
        </div>

        <div className="relative mx-auto mt-14 max-w-5xl">
          <div
            aria-hidden
            className="absolute -inset-6 rounded-[2rem] bg-gradient-to-r from-blue-500/20 via-indigo-500/20 to-violet-500/20 blur-3xl"
          />
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl ring-1 ring-slate-900/5">
            <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3">
              <span className="h-3 w-3 rounded-full bg-red-400" />
              <span className="h-3 w-3 rounded-full bg-amber-400" />
              <span className="h-3 w-3 rounded-full bg-green-400" />
              <span className="ml-2 text-xs text-slate-400">
                lennylocksmithny.com/our-jobs
              </span>
            </div>
            <Image
              src="/marketing/widget-website.png"
              alt="Live job map widget embedded on a locksmith website"
              width={1400}
              height={900}
              priority
              className="w-full"
            />
          </div>
          <p className="mt-4 text-center text-sm text-slate-500">
            Real customer site — map + job gallery powered by Olympos Sync
          </p>
        </div>
      </div>
    </section>
  );
}

const ALL_PLATFORMS = [
  {
    name: "Facebook",
    icon: <FacebookIcon className="h-8 w-8" style={{ color: "#1877F2" }} />,
    bg: "bg-blue-50",
  },
  { name: "Instagram", icon: <InstagramIcon className="h-8 w-8" />, bg: "bg-pink-50" },
  { name: "LinkedIn", icon: <LinkedInIcon className="h-8 w-8" />, bg: "bg-sky-50" },
  { name: "TikTok", icon: <TikTokIcon className="h-8 w-8" />, bg: "bg-slate-100" },
  { name: "YouTube", icon: <YoutubeIcon className="h-8 w-8" />, bg: "bg-red-50" },
  {
    name: "Google Business",
    icon: <GoogleBusinessIcon className="h-8 w-8" />,
    bg: "bg-amber-50",
  },
];

function PlatformBar() {
  return (
    <section className="border-y border-slate-200 bg-slate-50">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-4 px-6 py-8">
        <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Publish to
        </span>
        {ALL_PLATFORMS.map((p) => (
          <span
            key={p.name}
            className="flex items-center gap-2 text-sm font-semibold text-slate-600"
          >
            <span className="[&>svg]:h-6 [&>svg]:w-6">{p.icon}</span>
            {p.name}
          </span>
        ))}
        <span className="text-sm font-semibold text-emerald-600">
          + your website map
        </span>
      </div>
    </section>
  );
}

function PublishEverywhere() {
  return (
    <section className="relative overflow-hidden border-y border-slate-200 bg-slate-900 text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(59,130,246,0.35),transparent),radial-gradient(ellipse_40%_40%_at_80%_100%,rgba(217,41,118,0.25),transparent)]"
      />
      <div className="relative mx-auto max-w-6xl px-6 py-20 lg:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium text-blue-100">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
            One tap · every network
          </span>
          <h2 className="mt-6 text-3xl font-bold tracking-tight sm:text-5xl">
            Post to{" "}
            <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-violet-400 bg-clip-text text-transparent">
              every social network
            </span>{" "}
            at once
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-300">
            No logging into six apps. One check-in publishes simultaneously to
            Facebook, Instagram, LinkedIn, TikTok, YouTube and Google Business —
            each formatted correctly for its platform.
          </p>
        </div>

        {/* radial: one check-in fanning out to all networks */}
        <div className="mt-14 flex flex-col items-center">
          <div className="flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-slate-900 shadow-xl">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-sm font-bold text-white">
              O
            </span>
            <span className="text-sm font-semibold">1 check-in</span>
          </div>

          <div aria-hidden className="my-4 h-10 w-px bg-gradient-to-b from-white/60 to-transparent" />

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {ALL_PLATFORMS.map((p) => (
              <div
                key={p.name}
                className="group flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur transition hover:bg-white/10"
              >
                <span
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl ${p.bg} shadow-md transition group-hover:scale-105`}
                >
                  {p.icon}
                </span>
                <span className="text-xs font-semibold text-slate-200">
                  {p.name}
                </span>
                <span className="flex items-center gap-1 text-[11px] font-medium text-green-400">
                  <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.1 3.1 6.8-6.8a1 1 0 0 1 1.4 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Posted
                </span>
              </div>
            ))}
          </div>

          <p className="mt-8 text-sm text-slate-400">
            Something failed? Retry just that one platform — the rest stay
            posted.
          </p>
        </div>
      </div>
    </section>
  );
}

function ShowcaseSection({
  badge,
  title,
  description,
  image,
  imageAlt,
  reverse,
  highlight = false,
}: {
  badge: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  reverse: boolean;
  highlight?: boolean;
}) {
  return (
    <section
      id={badge === "Check-in" ? "features" : undefined}
      className={highlight ? "bg-gradient-to-b from-blue-50/50 to-white" : ""}
    >
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 lg:grid-cols-2 lg:gap-16 lg:py-28">
        <div className={reverse ? "lg:order-2" : ""}>
          <span className="inline-block rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-indigo-700">
            {badge}
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            {title}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">
            {description}
          </p>
        </div>
        <div className={reverse ? "lg:order-1" : ""}>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl ring-1 ring-slate-900/5 transition hover:shadow-2xl">
            <Image
              src={image}
              alt={imageAlt}
              width={1200}
              height={800}
              className="w-full"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function DashboardSection() {
  return (
    <section className="border-y border-slate-200 bg-slate-900 text-white">
      <div className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Your command center
          </h2>
          <p className="mt-4 text-lg text-slate-300">
            Businesses, check-ins, published jobs — everything in one clean
            dashboard.
          </p>
        </div>
        <div className="mt-12 overflow-hidden rounded-2xl border border-slate-700 shadow-2xl">
          <Image
            src="/marketing/dashboard.png"
            alt="Olympos Sync dashboard overview"
            width={1200}
            height={700}
            className="w-full"
          />
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: "1",
      title: "Check in on-site",
      body: "Photo + address + keywords. Done before you pack the van.",
      color: "from-blue-500 to-blue-600",
    },
    {
      n: "2",
      title: "Tap Publish",
      body: "Branded image goes to Facebook, Instagram, Google — your pick.",
      color: "from-indigo-500 to-indigo-600",
    },
    {
      n: "3",
      title: "Win the next job",
      body: "Map on your site + social posts = proof you work nearby.",
      color: "from-violet-500 to-violet-600",
    },
  ];

  return (
    <section id="how" className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
      <h2 className="text-center text-3xl font-bold text-slate-900 sm:text-4xl">
        Three steps. Zero evening work.
      </h2>
      <div className="mt-14 grid gap-8 md:grid-cols-3">
        {steps.map((step) => (
          <div
            key={step.n}
            className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
          >
            <span
              className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${step.color} text-lg font-bold text-white shadow-lg`}
            >
              {step.n}
            </span>
            <h3 className="mt-5 text-xl font-semibold text-slate-900">
              {step.title}
            </h3>
            <p className="mt-2 text-slate-600">{step.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function CaseStudy() {
  return (
    <section
      id="case-study"
      className="border-t border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50/30"
    >
      <div className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="text-sm font-bold uppercase tracking-wide text-blue-600">
              Case study
            </span>
            <h2 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">
              Lenny Locksmith, NYC
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Every mortise install and lock change in Manhattan gets logged,
              published to Facebook & Instagram, and pinned on their{" "}
              <strong className="text-slate-800">Our Jobs</strong> page — so
              Google and new customers see real work, block by block.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-slate-700">
              <li className="flex items-start gap-2">
                <CheckIcon />
                2+ published check-ins with branded photos
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon />
                Live map on lennylocksmithny.com
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon />
                Facebook + Instagram connected & posting
              </li>
            </ul>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-xl">
            <Image
              src="/marketing/widget-app.png"
              alt="Lenny Locksmith job map with pins across Manhattan"
              width={1000}
              height={700}
              className="w-full"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function CheckIcon() {
  return (
    <svg
      className="mt-0.5 h-5 w-5 shrink-0 text-green-500"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.1 3.1 6.8-6.8a1 1 0 0 1 1.4 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function FinalCta() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 px-8 py-16 text-center sm:px-16 sm:py-20">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_30%_20%,white,transparent_50%)]"
        />
        <div className="relative">
          <h2 className="text-3xl font-bold text-white sm:text-5xl">
            Stop losing jobs to competitors who look more active online
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-blue-100">
            Start free. Connect your accounts. Publish your first check-in
            today.
          </p>
          <Link
            href="/login"
            className="mt-10 inline-flex h-14 items-center justify-center rounded-xl bg-white px-10 text-base font-bold text-indigo-700 shadow-xl transition hover:scale-[1.02]"
          >
            Start for free — no credit card
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 sm:flex-row">
        <Logo />
        <p className="text-sm text-slate-500">
          © {new Date().getFullYear()} Olympos Sync
        </p>
        <Link
          href="/login"
          className="text-sm font-semibold text-indigo-600 hover:text-indigo-800"
        >
          Sign in →
        </Link>
      </div>
    </footer>
  );
}
