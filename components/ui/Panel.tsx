"use client";

import { CSSProperties, HTMLAttributes, ReactNode } from "react";

export interface CoverPanelProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  heading?: ReactNode;
  subheading?: ReactNode;
  pill?: ReactNode;
  headerRight?: ReactNode;
  tone?: "plain" | "table" | "tinted";
}

export default function Panel({
  heading,
  subheading,
  pill,
  headerRight,
  tone = "plain",
  children,
  className = "",
  style,
  ...props
}: CoverPanelProps) {
  const panelBackground =
    tone === "table"
      ? "var(--bg-elevated)"
      : tone === "tinted"
      ? "var(--bg-overlay)"
      : "var(--bg-surface)";

  const customStyles: CSSProperties = {
    backgroundColor: panelBackground,
    borderColor: "var(--border-default)",
    ...style,
  };

  return (
    <article
      className={`border rounded p-5 sm:p-6 shadow-sm ${className}`}
      style={customStyles}
      {...props}
    >
      {(heading || subheading || pill || headerRight) && (
        <header className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-[var(--border-subtle)]">
          <div>
            {heading && (
              <h2 className="font-serif text-lg font-bold text-[var(--text-primary)]">
                {heading}
              </h2>
            )}
            {subheading && (
              <p className="text-xs text-[var(--text-muted)] mt-0.5 font-sans">
                {subheading}
              </p>
            )}
          </div>
          {(pill || headerRight) && (
            <div className="flex items-center gap-2">
              {pill && (
                <span className="text-[10px] font-sans font-bold px-2 py-0.5 rounded-full bg-[var(--bg-overlay)] text-[var(--accent)] border border-[var(--border-subtle)]">
                  {pill}
                </span>
              )}
              {headerRight}
            </div>
          )}
        </header>
      )}
      <div>{children}</div>
    </article>
  );
}
