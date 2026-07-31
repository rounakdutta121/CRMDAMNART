"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Building2,
  Contact,
  LayoutDashboard,
  Settings,
  Users,
  Globe2,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
  Briefcase,
  Bell,
  UserCheck,
  LogOut,
  User,
} from "lucide-react";
import { APP_NAME, ROLE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { GlobalSearch } from "@/components/layout/global-search";
import {
  NotificationBell,
  type NotificationBellItem,
} from "@/components/notifications/notification-bell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SessionUser } from "@/types/auth";
import {
  canManageUsers,
  canManageWebsites,
  canManageServices,
  canManageInvitations,
} from "@/lib/permissions";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  require?: "users" | "invitations" | "websites" | "services" | "none";
};

const commandItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/notifications", label: "Notifications", icon: Bell },
];

const recordItems: NavItem[] = [
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/leads/my-leads", label: "My leads", icon: UserCheck },
  { href: "/contacts", label: "Contacts", icon: Contact },
];

const sourceItems: NavItem[] = [
  { href: "/websites", label: "Websites", icon: Globe2 },
  {
    href: "/settings/services",
    label: "Services",
    icon: Briefcase,
    require: "services",
  },
];

const adminItems: NavItem[] = [
  {
    href: "/settings/users",
    label: "Users",
    icon: Building2,
    require: "users",
  },
  {
    href: "/settings/users/invitations",
    label: "Invitations",
    icon: UserCheck,
    require: "invitations",
  },
  {
    href: "/settings/integrations",
    label: "Integrations",
    icon: Settings,
    require: "websites",
  },
  { href: "/settings/roles", label: "Roles", icon: Settings },
  {
    href: "/settings/lead-statuses",
    label: "Lead statuses",
    icon: Settings,
  },
];

function isAllowed(user: SessionUser, item: NavItem): boolean {
  if (!item.require || item.require === "none") return true;
  if (item.require === "users") return canManageUsers(user.role);
  if (item.require === "invitations") return canManageInvitations(user.role);
  if (item.require === "websites") return canManageWebsites(user.role);
  if (item.require === "services") return canManageServices(user.role);
  return true;
}

const ShellNavContext = createContext<{
  openMobile: () => void;
  closeMobile: () => void;
  mobileOpen: boolean;
} | null>(null);

function useShellNav() {
  const ctx = useContext(ShellNavContext);
  if (!ctx) {
    throw new Error("useShellNav must be used within AppShell");
  }
  return ctx;
}

function NavGroup({
  label,
  items,
  pathname,
  collapsed,
  onNavigate,
  user,
}: {
  label: string;
  items: NavItem[];
  pathname: string;
  collapsed: boolean;
  onNavigate: () => void;
  user: SessionUser;
}) {
  const visible = items.filter((item) => isAllowed(user, item));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-1">
      {!collapsed ? (
        <p className="px-3 pb-1 pt-4 font-meta text-[0.625rem] text-[var(--ink-subtle)]">
          {label}
        </p>
      ) : (
        <div className="mx-auto my-2 h-px w-6 bg-[var(--border)]" aria-hidden />
      )}
      {visible.map((item) => {
        const active =
          item.href === "/leads"
            ? pathname === "/leads" ||
              (pathname.startsWith("/leads/") &&
                !pathname.startsWith("/leads/my-leads"))
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            title={collapsed ? item.label : undefined}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 border-l-2 px-3 py-2.5 text-sm transition-colors md:py-2",
              active
                ? "border-[var(--accent)] bg-[var(--accent-muted)] font-medium text-[var(--accent)]"
                : "border-transparent text-[var(--ink-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            {!collapsed ? <span>{item.label}</span> : null}
            {collapsed ? <span className="sr-only">{item.label}</span> : null}
          </Link>
        );
      })}
    </div>
  );
}

function SidebarPanel({
  user,
  collapsed,
  onToggleCollapse,
  onNavigate,
  showCollapseControl,
  showCloseControl,
}: {
  user: SessionUser;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onNavigate: () => void;
  showCollapseControl: boolean;
  showCloseControl: boolean;
}) {
  const pathname = usePathname();
  const titleId = useId();

  return (
    <div className="flex h-full flex-col bg-[#faf8f4]">
      <div className="flex h-14 items-center justify-between border-b border-[#9a9184] bg-[#faf8f4] px-3">
        {!collapsed ? (
          <div className="min-w-0">
            <p className="font-meta text-[0.625rem] text-[var(--ink-subtle)]">
              System / Lead operations
            </p>
            <p className="truncate font-editorial text-sm font-semibold text-[var(--ink)]">
              {APP_NAME}
            </p>
          </div>
        ) : (
          <span className="font-meta text-xs text-[var(--ink)]" aria-hidden>
            DA
          </span>
        )}
        {showCollapseControl ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        ) : null}
        {showCloseControl ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onNavigate}
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      <nav
        className="flex-1 overflow-y-auto bg-[#faf8f4] px-1 pb-4"
        aria-labelledby={titleId}
      >
        <span id={titleId} className="sr-only">
          Main navigation
        </span>
        <NavGroup
          label="Command"
          items={commandItems}
          pathname={pathname}
          collapsed={collapsed}
          onNavigate={onNavigate}
          user={user}
        />
        <NavGroup
          label="Records"
          items={recordItems}
          pathname={pathname}
          collapsed={collapsed}
          onNavigate={onNavigate}
          user={user}
        />
        <NavGroup
          label="Sources"
          items={sourceItems}
          pathname={pathname}
          collapsed={collapsed}
          onNavigate={onNavigate}
          user={user}
        />
        <NavGroup
          label="Administration"
          items={adminItems}
          pathname={pathname}
          collapsed={collapsed}
          onNavigate={onNavigate}
          user={user}
        />
      </nav>

      {!collapsed ? (
        <div className="border-t border-[#d4cdc0] bg-[#faf8f4] px-4 py-3">
          <p className="font-meta text-[0.625rem] text-[var(--ink-subtle)]">
            Access / Restricted
          </p>
          <p className="mt-1 truncate text-xs text-[var(--ink-muted)]">
            {user.name}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function ShellHeader({
  user,
  unreadCount,
  notifications,
}: {
  user: SessionUser;
  unreadCount: number;
  notifications: NotificationBellItem[];
}) {
  const { openMobile, mobileOpen } = useShellNav();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-[#9a9184] bg-[#faf8f4] px-3 sm:gap-3 sm:px-4 lg:px-6">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="shrink-0 md:hidden"
        onClick={openMobile}
        aria-label="Open navigation"
        aria-expanded={mobileOpen}
      >
        <Menu className="h-4 w-4" />
      </Button>

      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="hidden min-w-0 sm:block md:hidden">
          <p className="font-meta text-[0.625rem] text-[var(--ink-subtle)]">
            Archive index
          </p>
        </div>
        <div className="hidden min-w-0 md:block">
          <p className="font-meta text-[0.625rem] text-[var(--ink-subtle)]">
            Archive index
          </p>
        </div>
        <GlobalSearch />
      </div>

      <NotificationBell unreadCount={unreadCount} notifications={notifications} />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2 shrink-0">
            <User className="h-4 w-4" />
            <span className="hidden max-w-[10rem] truncate sm:inline">
              {user.name}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-56 rounded-[var(--radius-md)] border border-[#9a9184] bg-[#ffffff] shadow-[var(--shadow-md)]"
        >
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span className="text-[var(--ink)]">{user.name}</span>
              <span className="font-mono-id text-xs font-normal text-[var(--ink-muted)]">
                {user.email}
              </span>
              <span className="mt-1 font-meta text-[0.625rem] font-normal text-[var(--ink-subtle)]">
                {ROLE_LABELS[user.role]}
              </span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-[var(--border)]" />
          <DropdownMenuItem
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-[var(--danger)]"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

export function AppShell({
  user,
  unreadCount,
  notifications,
  children,
}: {
  user: SessionUser;
  unreadCount: number;
  notifications: NotificationBellItem[];
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const openMobile = useCallback(() => setMobileOpen(true), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);

  const navValue = useMemo(
    () => ({ openMobile, closeMobile, mobileOpen }),
    [openMobile, closeMobile, mobileOpen]
  );

  return (
    <ShellNavContext.Provider value={navValue}>
      <div className="flex min-h-screen bg-[#f4f1ea]">
        {/* Desktop / laptop sidebar — solid opaque panel from md up */}
        <aside
          className={cn(
            "sticky top-0 z-20 hidden h-screen shrink-0 border-r border-[#9a9184] bg-[#faf8f4] md:block",
            collapsed ? "w-[4.5rem]" : "w-52 lg:w-56"
          )}
        >
          <SidebarPanel
            user={user}
            collapsed={collapsed}
            onToggleCollapse={() => setCollapsed((value) => !value)}
            onNavigate={() => undefined}
            showCollapseControl
            showCloseControl={false}
          />
        </aside>

        {/* Mobile navigation sheet */}
        {mobileOpen ? (
          <div
            className="fixed inset-0 z-50 md:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
          >
            <button
              type="button"
              className="absolute inset-0 bg-[#1c1917]/55"
              aria-label="Close overlay"
              onClick={closeMobile}
            />
            <aside className="absolute left-0 top-0 flex h-full w-[min(20rem,88vw)] flex-col border-r border-[#9a9184] bg-[#faf8f4] shadow-[0_12px_32px_rgba(28,25,23,0.28)]">
              <SidebarPanel
                user={user}
                collapsed={false}
                onToggleCollapse={() => undefined}
                onNavigate={closeMobile}
                showCollapseControl={false}
                showCloseControl
              />
            </aside>
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <ShellHeader
            user={user}
            unreadCount={unreadCount}
            notifications={notifications}
          />
          <main className="flex-1 px-[var(--page-pad-x)] py-[var(--page-pad-y)]">
            {children}
          </main>
        </div>
      </div>
    </ShellNavContext.Provider>
  );
}
