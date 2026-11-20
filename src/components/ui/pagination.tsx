import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

import { buttonStyles } from "./button";

/**
 * Server-paginated list footer: a polite summary plus previous/next controls.
 * Button text is caller-provided so each list keeps a specific accessible name
 * (e.g. "Previous audit actions") when several paginated lists share a page.
 */
export function Pagination({
  label, summary, onPrevious, onNext, canPrevious, canNext, disabled = false,
  previousLabel = "Previous", nextLabel = "Next", className = "",
}: {
  label: string; summary?: ReactNode; onPrevious: () => void; onNext: () => void;
  canPrevious: boolean; canNext: boolean; disabled?: boolean;
  previousLabel?: string; nextLabel?: string; className?: string;
}) {
  return <nav aria-label={label} className={`flex flex-wrap items-center justify-between gap-3 text-sm text-muted ${className}`}>
    {summary !== undefined && <p data-numeric aria-live="polite" className="min-w-0">{summary}</p>}
    <div className="ml-auto flex gap-2">
      <button type="button" className={buttonStyles({ variant: "secondary", size: "small" })}
        disabled={disabled || !canPrevious} onClick={onPrevious}>
        <ChevronLeft size={16} aria-hidden="true" />{previousLabel}
      </button>
      <button type="button" className={buttonStyles({ variant: "secondary", size: "small" })}
        disabled={disabled || !canNext} onClick={onNext}>
        {nextLabel}<ChevronRight size={16} aria-hidden="true" />
      </button>
    </div>
  </nav>;
}
