"use client";

import Link from "next/link";
import { Search, CircleHelp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { fetchPublicFaqs } from "../api";
import type { FaqCategory } from "../types";

export function FaqPublic() {
  const [categories, setCategories] = useState<FaqCategory[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    void fetchPublicFaqs()
      .then((data) => { if (active) { setCategories(data); setStatus("ready"); } })
      .catch(() => { if (active) setStatus("error"); });
    return () => { active = false; };
  }, [version]);
  const visible = useMemo(() => categories.filter((c) => category === "all" || c.slug === category).map((c) => ({...c, items: c.items.filter((f) => f.is_active && `${f.question} ${f.answer}`.toLowerCase().includes(query.toLowerCase()))})).filter((c) => c.items.length > 0), [categories, category, query]);
  return <main className="min-h-[70vh] bg-[#f5f7fa] px-4 py-12"><div className="mx-auto max-w-5xl"><div className="mb-9 text-center"><span className="mx-auto flex w-fit rounded-2xl bg-cyan-50 p-4 text-cyan-800"><CircleHelp size={30}/></span><h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-950">How can we help?</h1><p className="mt-3 text-slate-600">Search answers to common marketplace questions.</p></div>
    <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[1fr_230px]"><label className="relative"><Search size={18} className="absolute left-3 top-3 text-slate-400"/><span className="sr-only">Search FAQs</span><input value={query} onChange={(e) => setQuery(e.target.value)} type="search" placeholder="Search questions…" className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm"/></label><select aria-label="Filter FAQ category" value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option value="all">All topics</option>{categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}</select></div>
    {status === "loading" && <p role="status" className="mt-8 text-center text-sm text-slate-500">Loading answers…</p>}
    {status === "error" && <div role="alert" className="mt-8 rounded-2xl border border-rose-200 bg-white p-7 text-center"><p>FAQ service is unavailable.</p><button type="button" className="mt-3 text-sm font-semibold text-cyan-700 underline" onClick={() => { setStatus("loading"); setVersion((n) => n + 1); }}>Try again</button></div>}
    {status === "ready" && visible.length === 0 && <p className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">No matching answers found. Try a different search, or <Link href="/support" className="font-semibold text-cyan-700 underline">contact support</Link>.</p>}
    <div className="mt-7 space-y-5">{visible.map((c) => <section key={c.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><h2 className="mb-4 text-xl font-bold text-slate-950">{c.name}</h2>{c.description && <p className="mb-5 text-sm text-slate-500">{c.description}</p>}<div className="divide-y divide-slate-100">{c.items.map((q) => <details key={q.id} className="group py-4"><summary className="cursor-pointer pr-5 font-semibold text-slate-800">{q.question}</summary><p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600">{q.answer}</p></details>)}</div></section>)}</div>
  </div></main>;
}
