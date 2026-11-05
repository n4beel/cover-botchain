"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ConnectButton from "@/components/ui/ConnectButton";
import NetworkBadge from "@/components/botchain/NetworkBadge";
import { footerLinks } from "@/lib/botchain/chain";
import BuiltOnBotChain from "@/components/botchain/BuiltOnBotChain";
import { app } from "@/lib/app-config";

interface PageShellProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export default function PageShell({ children, title, subtitle }: PageShellProps) {
  const links = footerLinks();
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-base)] text-[var(--text-primary)] antialiased">
      {/* Top Banner Navigation */}
      <header className="sticky top-0 z-50 bg-[var(--bg-surface)] border-b border-[var(--border-default)] shadow-xs">
        <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 group text-inherit no-underline">
              <span className="text-xl select-none" aria-hidden="true">
                🛡️
              </span>
              <span className="font-serif font-bold text-lg text-[var(--accent)]">
                {app.name}
              </span>
            </Link>

            <nav className="hidden sm:flex items-center space-x-1">
              {[
                { label: "Round Tables", href: "/" },
                { label: "New Pot", href: "/new" },
                { label: "My Pots", href: "/me" },
              ].map((tab) => {
                const active = pathname === tab.href;
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`px-3 py-1 text-xs rounded transition-colors ${
                      active
                        ? "bg-[var(--accent)] text-[var(--accent-ink)] font-bold"
                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
                    }`}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <NetworkBadge />
            <div className="w-[140px] sm:w-[160px]">
              <ConnectButton />
            </div>
          </div>
        </div>

        {/* Mobile secondary bar */}
        <div className="flex sm:hidden border-t border-[var(--border-subtle)] px-4 py-1.5 justify-around text-xs">
          {[
            { label: "Round Tables", href: "/" },
            { label: "New Pot", href: "/new" },
            { label: "My Pots", href: "/me" },
          ].map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`py-0.5 px-2 ${
                pathname === tab.href ? "text-[var(--accent)] font-bold underline" : "text-[var(--text-muted)]"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {(title || subtitle) && (
          <section className="mb-6">
            {title && (
              <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="mt-1 text-xs sm:text-sm text-[var(--text-muted)] font-sans">
                {subtitle}
              </p>
            )}
          </section>
        )}
        {children}
      </main>

      {/* Footer (Spec §3.5) */}
      <footer className="mt-auto bg-[var(--bg-surface)] border-t border-[var(--border-default)] py-5 text-xs text-[var(--text-muted)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-5 flex-wrap justify-center sm:justify-start">
            {links.contract && (
              <a
                href={links.contract}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4 hover:text-[var(--text-primary)]"
              >
                Contract
              </a>
            )}
            <a
              href={links.site}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-[var(--text-primary)]"
            >
              botchain.ai
            </a>
            <a
              href={links.explorer}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-[var(--text-primary)]"
            >
              Explorer
            </a>
          </div>
          <BuiltOnBotChain />
        </div>
      </footer>
    </div>
  );
}
