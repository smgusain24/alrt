"use client";

import { useState, useEffect } from "react";
import {
  Workflow,
  Users,
  BarChart,
  Activity,
  Settings,
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
];

const SETTINGS_CHILDREN = [
  { href: "/settings", label: "API keys" },
  { href: "/settings/providers", label: "Channels" },
  { href: "/settings/members", label: "Members" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  const handleLogout = () => {
    api.auth.logout().finally(() => {
      window.location.href = "/login";
    });
  };

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const isSettingsActive = SETTINGS_CHILDREN.some((c) => isActive(c.href));

  return (
    <>
      <CommandPalette />
      <div
        data-sidebar-layout
        data-sidebar-open={sidebarOpen || undefined}
        style={{
          minHeight: "100vh",
          background: "var(--color-background)",
          color: "var(--color-text-primary)",
        }}
      >
        {/* Mobile top nav */}
        <nav data-topnav style={{ background: "var(--color-background)", borderBottom: "1px solid var(--color-border)" }}>
          <button
            data-sidebar-toggle
            className="outline"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Toggle menu"
            style={{ color: "var(--color-text-muted)", background: "none", border: "none", cursor: "pointer", padding: "4px" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "4px", textDecoration: "none" }}>
            <span style={{ fontFamily: "var(--font-brand, inherit)", fontSize: "16px", fontWeight: 700, color: "var(--color-text-primary)" }}>ALRT</span>
            <span style={{ fontFamily: "monospace", fontSize: "10px", color: "var(--color-text-muted)" }}>.dev</span>
          </Link>
        </nav>

        {/* Sidebar */}
        <aside
          data-sidebar
          style={{
            background: "var(--color-background)",
            borderRight: "1px solid var(--color-border)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Sidebar header — logo */}
          <header style={{ padding: "16px 16px 12px", display: "flex", alignItems: "center" }}>
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: "4px", textDecoration: "none" }}>
              <span style={{ fontFamily: "var(--font-brand, inherit)", fontSize: "18px", fontWeight: 700, color: "var(--color-text-primary)" }}>ALRT</span>
              <span style={{ fontFamily: "monospace", fontSize: "11px", color: "var(--color-text-muted)" }}>.dev</span>
            </Link>
          </header>

          {/* Navigation */}
          <nav style={{ flex: 1, padding: "0 8px" }}>
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {NAV_ITEMS.map((item) => {
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      onClick={() => setSidebarOpen(false)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        fontSize: "14px",
                        fontWeight: 500,
                        textDecoration: "none",
                        color: active ? "var(--color-text-primary)" : "var(--color-text-muted)",
                        background: active ? "var(--color-surface)" : "transparent",
                        transition: "color 0.15s, background 0.15s",
                        position: "relative",
                      }}
                    >
                      {active && (
                        <span
                          style={{
                            position: "absolute",
                            left: 0,
                            top: "50%",
                            transform: "translateY(-50%)",
                            width: "2px",
                            height: "16px",
                            background: "var(--color-accent)",
                            borderRadius: "2px",
                          }}
                        />
                      )}
                      <item.icon
                        size={18}
                        strokeWidth={1.5}
                        style={{ flexShrink: 0, color: active ? "var(--color-accent)" : "currentColor" }}
                      />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}

              {/* Settings group with details/summary */}
              <li>
                <details open={isSettingsActive || undefined} style={{ marginTop: "2px" }}>
                  <summary
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: isSettingsActive ? "var(--color-text-primary)" : "var(--color-text-muted)",
                      background: isSettingsActive ? "var(--color-surface)" : "transparent",
                      cursor: "pointer",
                      listStyle: "none",
                      position: "relative",
                      transition: "color 0.15s, background 0.15s",
                    }}
                  >
                    {isSettingsActive && (
                      <span
                        style={{
                          position: "absolute",
                          left: 0,
                          top: "50%",
                          transform: "translateY(-50%)",
                          width: "2px",
                          height: "16px",
                          background: "var(--color-accent)",
                          borderRadius: "2px",
                        }}
                      />
                    )}
                    <Settings
                      size={18}
                      strokeWidth={1.5}
                      style={{ flexShrink: 0, color: isSettingsActive ? "var(--color-accent)" : "currentColor" }}
                    />
                    <span>Settings</span>
                  </summary>
                  <ul style={{ listStyle: "none", margin: "2px 0 0 0", padding: "0 0 0 40px" }}>
                    {SETTINGS_CHILDREN.map((child) => {
                      const childActive = pathname === child.href;
                      return (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            aria-current={childActive ? "page" : undefined}
                            onClick={() => setSidebarOpen(false)}
                            style={{
                              display: "block",
                              padding: "5px 12px",
                              fontSize: "13px",
                              fontWeight: childActive ? 500 : 400,
                              borderRadius: "4px",
                              textDecoration: "none",
                              color: childActive ? "var(--color-text-primary)" : "var(--color-text-muted)",
                              transition: "color 0.15s",
                            }}
                          >
                            {child.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </details>
              </li>
            </ul>
          </nav>

          {/* Footer — user info + logout */}
          <footer
            style={{
              borderTop: "1px solid var(--color-border)",
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "8px",
            }}
          >
            <span
              style={{
                fontSize: "12px",
                color: "var(--color-text-muted)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: "140px",
              }}
            >
              {user?.email ?? "\u2014"}
            </span>
            <button
              onClick={handleLogout}
              title="Log out"
              style={{
                background: "none",
                border: "none",
                color: "var(--color-text-muted)",
                cursor: "pointer",
                padding: "4px",
                display: "flex",
                alignItems: "center",
                borderRadius: "4px",
                transition: "color 0.15s",
              }}
            >
              <LogOut size={14} strokeWidth={1.5} />
            </button>
          </footer>
        </aside>

        {/* Main content area */}
        <main style={{ overflow: "auto" }}>
          {quotaExceeded && (
            <div
              role="alert"
              style={{
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid var(--color-danger)",
                borderRadius: "6px",
                margin: "16px 16px 0",
                padding: "8px 16px",
                fontSize: "14px",
                color: "var(--color-danger)",
                textAlign: "center",
              }}
            >
              You&apos;ve exceeded your monthly notification limit. Contact support to continue sending.
            </div>
          )}
          <div style={{ padding: "24px" }}>
            {children}
          </div>
        </main>
      </div>
    </>
  );
}
