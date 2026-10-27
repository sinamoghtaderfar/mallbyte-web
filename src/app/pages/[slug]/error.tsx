"use client";

export default function CmsPageError({ reset }: { error: Error; reset: () => void }) {
  return <main role="alert" className="mx-auto max-w-2xl px-4 py-20 text-center"><h1 className="text-2xl font-bold text-slate-950">This page is temporarily unavailable</h1><p className="mt-3 text-slate-600">Please try again. You can still browse products.</p><button type="button" onClick={reset} className="mt-6 rounded-xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white">Try again</button></main>;
}
