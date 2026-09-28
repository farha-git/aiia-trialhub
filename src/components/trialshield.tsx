import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  Bell,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  FileCheck2,
  FlaskConical,
  Leaf,
  Menu,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { useEffect, useId, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { useWorkflow } from "@/components/workflow-state";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

export const navItems = [
  ["Portfolio", "/platform"],
  ["Studies", "/studies"],
  ["Safety", "/safety"],
  ["Compliance", "/compliance"],
  ["Analytics", "/analytics"],
  ["Documents", "/documents"],
  ["Exports", "/exports"],
  ["Admin", "/admin"],
] as const;

const roleNavAccess = {
  ADMIN: new Set(navItems.map(([label]) => label)),
  PI: new Set(["Portfolio", "Studies", "Documents"]),
  CRC: new Set(["Portfolio", "Studies"]),
  SAFETY_OFFICER: new Set(["Portfolio", "Safety"]),
  COMPLIANCE_OFFICER: new Set(["Portfolio", "Compliance", "Documents"]),
  DATA_MANAGER: new Set(["Portfolio", "Analytics", "Exports"]),
} as const;

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex min-w-0 items-center gap-3" aria-label="AIIA TrialShield home">
      <span className="relative grid size-9 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
        <ShieldCheck className="size-5" strokeWidth={1.7} />
        <Leaf className="absolute -right-1 -top-1 size-3.5 rounded-full bg-accent p-0.5 text-accent-foreground" />
      </span>
      <span className="min-w-0 leading-none">
        <strong className="block truncate font-display text-[15px] font-semibold text-foreground">AIIA TrialShield</strong>
        {!compact && <span className="mt-1 block text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Research command center</span>}
      </span>
    </Link>
  );
}

export function PlatformHeader() {
  const [open, setOpen] = useState(false);
  const { usingOfflineData } = useWorkflow();
  const { profile, signOut } = useAuth();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/95 backdrop-blur-xl">
      <div className="mx-auto grid h-16 max-w-[1480px] grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 lg:grid-cols-[220px_minmax(0,1fr)_220px] lg:px-8">
        <Brand compact />
        <nav className="hidden items-center justify-center gap-1 lg:flex" aria-label="Platform navigation">
          {navItems.filter(([label]) => Boolean(profile?.role && roleNavAccess[profile.role].has(label))).map(([label, to]) => {
            const active = pathname === to || (to === "/studies" && pathname.startsWith("/studies/"));
            return (
              <Link key={to} to={to} className={cn("rounded-md px-3 py-2 text-[13px] font-medium transition-colors", active ? "bg-primary/8 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center justify-end gap-1">
          {usingOfflineData && <span className="hidden rounded-full border border-warning/30 bg-warning/10 px-2 py-1 text-[10px] font-semibold text-warning-foreground sm:inline-flex">Offline data</span>}
          <Button asChild variant="ghost" size="icon" aria-label="Search studies"><Link to="/studies"><Search className="size-4" /></Link></Button>
          <Button asChild variant="ghost" size="icon" aria-label="Open compliance notifications" className="relative"><Link to="/compliance"><Bell className="size-4" /><span className="absolute right-2 top-2 size-1.5 rounded-full bg-risk" /></Link></Button>
          <div className="ml-2 hidden items-center gap-2 sm:flex"><span className="max-w-32 truncate text-xs font-medium text-foreground">{profile?.full_name || profile?.email || "Research user"}</span><button type="button" title="Sign out" onClick={() => void signOut()} className="grid size-8 place-items-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">{profile?.full_name?.slice(0, 2).toUpperCase() ?? "U"}</button></div>
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Toggle navigation" onClick={() => setOpen((value) => !value)}>{open ? <X className="size-5" /> : <Menu className="size-5" />}</Button>
        </div>
      </div>
      {open && <nav className="grid grid-cols-2 gap-1 border-t border-border bg-background p-3 lg:hidden">{navItems.filter(([label]) => Boolean(profile?.role && roleNavAccess[profile.role].has(label))).map(([label, to]) => <Link key={to} to={to} onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted">{label}</Link>)}</nav>}
    </header>
  );
}

export function PlatformPage({ eyebrow, title, description, actions, children }: { eyebrow: string; title: string; description: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <PlatformHeader />
      <main className="mx-auto max-w-[1480px] px-4 py-7 lg:px-8 lg:py-10">
        <div className="grid grid-cols-1 items-end gap-4 border-b border-border pb-7 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-6">
          <div className="min-w-0">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-secondary">{eyebrow}</p>
            <h1 className="font-display text-3xl font-semibold text-foreground sm:text-4xl">{title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
          </div>
          {actions && <div className="flex w-full justify-start sm:w-auto sm:justify-end">{actions}</div>}
        </div>
        <div className="mt-7 animate-fade-in">{children}</div>
      </main>
    </div>
  );
}

export function WorkflowModal({ open, title, description, onClose, children }: { open: boolean; title: string; description: string; onClose: () => void; children: ReactNode }) {
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  if (!open) return null;
  return <div className="fixed inset-0 z-[70] grid place-items-center bg-foreground/35 p-4 backdrop-blur-[2px]" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} className="max-h-[min(90dvh,720px)] w-full max-w-lg overflow-y-auto rounded-lg border border-border bg-background p-5 shadow-2xl sm:p-6">
      <header className="mb-5 flex items-start justify-between gap-4"><div><h2 id={titleId} className="font-display text-lg font-semibold">{title}</h2><p id={descriptionId} className="mt-1 text-sm leading-5 text-muted-foreground">{description}</p></div><Button type="button" variant="ghost" size="icon" aria-label="Close dialog" onClick={onClose}><X className="size-4" /></Button></header>
      {children}
    </section>
  </div>;
}

export function StatusPill({ tone = "neutral", children }: { tone?: "good" | "risk" | "warn" | "neutral"; children: ReactNode }) {
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold", tone === "good" && "border-positive/20 bg-positive/8 text-positive", tone === "risk" && "border-risk/20 bg-risk/8 text-risk", tone === "warn" && "border-warning/30 bg-warning/10 text-warning-foreground", tone === "neutral" && "border-border bg-muted text-muted-foreground")}>{children}</span>;
}

export function ProgressBar({ value, tone = "primary" }: { value: number; tone?: "primary" | "risk" | "accent" }) {
  return <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className={cn("h-full rounded-full transition-all duration-700", tone === "primary" && "bg-secondary", tone === "risk" && "bg-risk", tone === "accent" && "bg-accent")} style={{ width: `${value}%` }} /></div>;
}

export function AttentionItem({ severity, title, meta, owner, action, onAction }: { severity: "critical" | "warning" | "stable"; title: string; meta: string; owner: string; action: string; onAction: () => void }) {
  return (
    <article className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-4 border-b border-border px-1 py-5 last:border-0">
      <span className={cn("mt-1 size-2.5 rounded-full ring-4", severity === "critical" && "bg-risk ring-risk/10", severity === "warning" && "bg-warning ring-warning/10", severity === "stable" && "bg-positive ring-positive/10")} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2"><h3 className="font-display text-sm font-semibold text-foreground">{title}</h3><span className="text-xs text-muted-foreground">{meta}</span></div>
        <p className="mt-2 text-xs text-muted-foreground">Owner <span className="font-medium text-foreground">{owner}</span></p>
      </div>
      <Button variant="ghost" size="sm" className="group-hover:bg-muted" onClick={onAction}>{action}<ChevronRight className="size-3.5" /></Button>
    </article>
  );
}

export function Timeline({ items }: { items: Array<{ title: string; detail: string; time: string; state?: "done" | "current" | "risk" }> }) {
  return <div>{items.map((item, index) => <div key={item.title} className="grid grid-cols-[24px_minmax(0,1fr)_auto] gap-3"><div className="flex flex-col items-center"><span className={cn("mt-1.5 grid size-5 place-items-center rounded-full border", item.state === "done" && "border-positive bg-positive text-primary-foreground", item.state === "current" && "border-secondary bg-secondary/10 text-secondary", item.state === "risk" && "border-risk bg-risk/10 text-risk", !item.state && "border-border bg-background text-muted-foreground")}>{item.state === "done" ? <CheckCircle2 className="size-3" /> : item.state === "risk" ? <CircleAlert className="size-3" /> : <Clock3 className="size-3" />}</span>{index < items.length - 1 && <span className="min-h-10 w-px grow bg-border" />}</div><div className="pb-6"><p className="text-sm font-semibold text-foreground">{item.title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{item.detail}</p></div><time className="pt-0.5 text-[11px] text-muted-foreground">{item.time}</time></div>)}</div>;
}

export const icons = { Activity, ArrowRight, CircleAlert, FileCheck2, FlaskConical, ShieldCheck };