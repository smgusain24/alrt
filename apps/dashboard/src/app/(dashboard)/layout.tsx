"use client";

import { useState, useEffect } from "react";
import {
  Workflow,
  Users,
  Activity,
  BarChart,
  FileText,
  Settings,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Divider, Button } from "@/components/ui";
import { api } from "@/lib/api";

const NAV_ITEMS = [
  { href: "/workflows", label: "Workflows", icon: Workflow },
  { href: "/subscribers", label: "Subscribers", icon: Users },
  { href: "/analytics", label: "Analytics", icon: BarChart },
  { href: "/logs", label: "Logs", icon: FileText },
  {
    href: "/settings", label: "Settings", icon: Settings, children: [
      { href: "/settings", label: "API Keys" },
      { href: "/settings/providers", label: "Providers" },
    ]
  },
];

function Sidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed md:static z-50 top-0 left-0 h-full w-56
          bg-[#c0c0c0] bevel-outset
          transform transition-transform duration-150 md:transform-none
          ${open ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        {/* Logo in sidebar */}
        <div className="px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1">
            <span className="font-heading text-xl text-foreground">ALRT</span>
            <span className="font-mono text-xs text-muted">.dev</span>
          </Link>
          <button onClick={onClose} className="md:hidden focus-retro">
            <X className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>

        <Divider className="!my-0 mx-1" />

        {/* Nav items */}
        <nav className="p-2 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const isParentActive = item.children?.some((c: any) => pathname === c.href || pathname.startsWith(c.href + "/"));
            const showChildren = active || isParentActive;
            return (
              <div key={item.href}>
                <Link
                  href={item.children ? item.children[0].href : item.href}
                  onClick={onClose}
                  className={`
                    flex items-center gap-2 px-3 py-2 text-sm font-bold uppercase tracking-wide
                    transition-none focus-retro
                    ${active || isParentActive
                      ? "bevel-inset bg-white text-accent"
                      : "bevel-outset bg-[#c0c0c0] text-foreground hover:bg-[#d0d0d0]"
                    }
                  `}
                >
                  <item.icon className="w-4 h-4" strokeWidth={2} />
                  {item.label}
                  {(active || isParentActive) && (
                    <ChevronRight className="w-3 h-3 ml-auto" strokeWidth={3} />
                  )}
                </Link>
                {item.children && showChildren && (
                  <div className="ml-6 mt-1 space-y-0.5">
                    {item.children.map((child: any) => {
                      const childActive = pathname === child.href;
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={onClose}
                          className={`
                            block px-2 py-1 text-xs font-bold uppercase tracking-wide
                            transition-none focus-retro
                            ${childActive ? "text-accent" : "text-muted hover:text-foreground"}
                          `}
                        >
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

function DashboardTopBar({
  onMenuClick,
  user,
}: {
  onMenuClick: () => void;
  user: any;
}) {
  const handleLogout = () => {
    api.auth.logout().finally(() => {
      window.location.href = "/login";
    });
  };

  return (
    <header className="bg-white px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="md:hidden bevel-outset bg-[#c0c0c0] p-1.5 focus-retro"
        >
          <Menu className="w-4 h-4" strokeWidth={2} />
        </button>
        <span className="font-mono text-xs text-muted">Dashboard</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="bevel-outset bg-[#c0c0c0] px-3 py-1 text-xs font-bold">
          {user?.email ?? "Loading..."}
        </div>
        <Button variant="danger" onClick={handleLogout} className="text-xs px-2 py-1">
          Logout
        </Button>
      </div>
    </header>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  useEffect(() => {
    api.auth.me()
      .then((data: any) => setUser(data))
      .catch(() => {
        // api.ts already handles 401 → redirect to /login
        // Don't double-redirect here
      });
  }, []);

  useEffect(() => {
    if (!user) return;
    const teamId = (user as any).team_id;
    if (!teamId) return;
    api.teams.getQuota(teamId)
      .then((data) => setQuotaExceeded(data.over_limit))
      .catch(() => {
        // Quota check is non-critical — fail silently
      });
  }, [user]);

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardTopBar onMenuClick={() => setSidebarOpen(true)} user={user} />
        <div className="hr-groove" />
        {quotaExceeded && (
          <div className="bevel-inset bg-[#fff3cd] px-4 py-2 text-sm text-danger font-bold text-center">
            You&apos;ve exceeded your monthly notification limit. Contact support to continue sending.
          </div>
        )}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
