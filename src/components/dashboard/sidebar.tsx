"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  ClipboardList,
  Code2,
  LayoutDashboard,
  Link2,
  MapPinned,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/businesses", label: "My Businesses", icon: Building2 },
  { href: "/check-ins", label: "Check-ins", icon: ClipboardList },
  { href: "/map", label: "Map Check-ins", icon: MapPinned },
  { href: "/widget", label: "Widget", icon: Code2 },
  { href: "/connections", label: "Connections", icon: Link2 },
];

type DashboardSidebarProps = {
  userEmail?: string | null;
  signOutAction: () => Promise<void>;
};

export function DashboardSidebar({
  userEmail,
  signOutAction,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 p-4">
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;

        return (
          <Link
            key={href}
            href={href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <span className="text-sm font-semibold text-slate-900">Olympos Sync</span>
        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          className="rounded-md p-2 text-slate-600 hover:bg-slate-100"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close menu overlay"
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="hidden border-b border-slate-200 px-6 py-5 lg:block">
          <p className="text-lg font-semibold text-slate-900">Olympos Sync</p>
          <p className="mt-1 text-xs text-slate-500">Field jobs & check-ins</p>
        </div>

        {nav}

        <div className="mt-auto border-t border-slate-200 p-4">
          {userEmail ? (
            <p className="truncate text-xs text-slate-500">{userEmail}</p>
          ) : null}
          <form action={signOutAction} className="mt-3">
            <button
              type="submit"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
