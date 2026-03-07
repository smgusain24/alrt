"use client";

import { useState, useEffect } from "react";
import {
  Workflow,
  Users,
  BarChart,
  Activity,
  Settings,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { CommandPalette } from "@/components/ui";
import { api } from "@/lib/api";

const NAV_ITEMS = [
  { href: "/workflows", label: "Workflows", icon: Workflow },
  { href: "/subscribers", label: "Subscribers", icon: Users },
  { href: "/analytics", label: "Analytics", icon: BarChart },
  { href: "/activity", label: "Activity", icon: Activity },
  {
    href: "/settings", label: "Settings", icon: Settings, children: [
      { href: "/settings", label: "API keys" },
      { href: "/settings/providers", label: "Providers" },
    ]
  },
];

function Sidebar({
  open,
  onClose,
  collapsed,
  onToggleCollapse,
  user,
}: {
  open: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  user: any;
}) {
  const pathname = usePathname();

  const handleLogout = () => {
    api.auth.logout().finally(() => {
      window.location.href = "/login";
    });
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed md:static z-50 top-0 left-0 h-full
          bg-[#0a0a0b] border-r border-white/[0.04]
          flex flex-col
          transition-all duration-200 ease-out
          ${collapsed ? "md:w-14" : "md:w-56"}
          w-60 md:transform-none
          ${open ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-4 ${collapsed ? "md:px-0 md:justify-center" : ""}`}>
          <Link href="/" className={`flex items-center gap-1 ${collapsed ? "md:hidden" : ""}`}>
            <span className="font-brand text-lg font-bold text-text-primary">ALRT</span>
            <span className="font-mono text-xs text-text-muted">.dev</span>
          </Link>
          {collapsed && (
            <Link href="/" className="hidden md:block font-brand text-lg font-bold text-text-primary">
              A
            </Link>
          )}
          <button
            onClick={onToggleCollapse}
            className="hidden md:flex items-center justify-center w-6 h-6 rounded text-text-muted hover:text-text-primary transition-colors"
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
            ) : (
              <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
            )}
          </button>
          <button onClick={onClose} className="md:hidden text-text-muted hover:text-text-primary transition-colors">
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        {/* Nav items */}
        <nav className={`flex-1 space-y-0.5 ${collapsed ? "md:px-1.5" : "px-2"} px-2 mt-2`}>
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const isParentActive = item.children?.some((c: any) => pathname === c.href || pathname.startsWith(c.href + "/"));
            const isActive = active || isParentActive;
            const showChildren = isActive && !collapsed;
            return (
              <div key={item.href}>
                <Link
                  href={item.children ? item.children[0].href : item.href}
                  onClick={onClose}
                  title={collapsed ? item.label : undefined}
                  className={`
                    flex items-center gap-3 py-2 rounded-md text-sm font-medium
                    transition-colors relative
                    ${collapsed ? "md:justify-center md:px-0 px-3" : "px-3"}
                    ${isActive
                      ? "text-text-primary"
                      : "text-text-muted hover:text-text-secondary"
                    }
                  `}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-accent rounded-full" />
                  )}
                  <item.icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? "text-accent" : ""}`} strokeWidth={1.5} />
                  <span className={`${collapsed ? "md:hidden" : ""} truncate`}>{item.label}</span>
                </Link>
                {item.children && showChildren && (
                  <div className="ml-9 mt-0.5 space-y-0.5">
                    {item.children.map((child: any) => {
                      const childActive = pathname === child.href;
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={onClose}
                          className={`
                            block px-3 py-1.5 text-xs rounded-md
                            transition-colors
                            ${childActive ? "text-text-primary font-medium" : "text-text-muted hover:text-text-secondary"}
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

        {/* Footer: user info */}
        <div className={`border-t border-white/[0.04] px-3 py-3 ${collapsed ? "md:px-0 md:flex md:justify-center" : ""}`}>
          {collapsed ? (
            <button
              onClick={handleLogout}
              title="Log out"
              className="hidden md:flex items-center justify-center w-8 h-8 rounded-md text-text-muted hover:text-text-primary transition-colors"
            >
              <LogOut className="w-4 h-4" strokeWidth={1.5} />
            </button>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted truncate max-w-[140px]">
                {user?.email ?? "\u2014"}
              </span>
              <button
                onClick={handleLogout}
                title="Log out"
                className="text-text-muted hover:text-text-primary transition-colors p-1"
              >
                <LogOut className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
            </div>
          )}
          {/* Mobile: always show expanded footer */}
          <div className="md:hidden flex items-center justify-between">
            <span className="text-xs text-text-muted truncate max-w-[140px]">
              {user?.email ?? "\u2014"}
            </span>
            <button
              onClick={handleLogout}
              className="text-text-muted hover:text-text-primary transition-colors p-1"
            >
              <LogOut className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

/* Slim mobile header — only visible below md */
function MobileHeader({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-[#0a0a0b] border-b border-white/[0.04]">
      <button
        onClick={onMenuClick}
        className="text-text-muted hover:text-text-primary p-1 rounded-md transition-colors"
      >
        <Menu className="w-4 h-4" strokeWidth={1.5} />
      </button>
      <Link href="/" className="flex items-center gap-1">
        <span className="font-brand text-base font-bold text-text-primary">ALRT</span>
        <span className="font-mono text-[10px] text-text-muted">.dev</span>
      </Link>
    </header>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  useEffect(() => {
    api.auth.me()
      .then((data: any) => setUser(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    const teamId = (user as any).team_id;
    if (!teamId) return;
    api.teams.getQuota(teamId)
      .then((data) => setQuotaExceeded(data.over_limit))
      .catch(() => {});
  }, [user]);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <CommandPalette />
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        user={user}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <MobileHeader onMenuClick={() => setSidebarOpen(true)} />
        {quotaExceeded && (
          <div className="bg-danger/10 border border-danger rounded-md mx-4 mt-4 px-4 py-2 text-sm text-danger text-center">
            You&apos;ve exceeded your monthly notification limit. Contact support to continue sending.
          </div>
        )}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
