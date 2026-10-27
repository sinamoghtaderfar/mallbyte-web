"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, BookOpen, FileText, Images, Layers, ListTree, Megaphone, MessageCircleQuestion, PanelTop, ShieldCheck } from "lucide-react";
import { CMS_RESOURCES, RESOURCE_ORDER } from "../definitions";
import type { CmsResource } from "../types";
import { CmsResourcePanel } from "./cms-resource-panel";
import { useCmsAccess } from "./cms-route";

const iconMap = {
  pages: FileText, banners: Images, "faq-categories": Layers, faqs: MessageCircleQuestion,
  announcements: Megaphone, navigation: PanelTop, "navigation-items": ListTree,
};

export function CmsWorkspace() {
  const [resource, setResource] = useState<CmsResource>("pages");
  const access = useCmsAccess();
  return <main className="min-h-[85vh] bg-[#f5f7fa] px-4 py-8 sm:py-12">
    <div className="mx-auto max-w-7xl">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3"><div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-cyan-700"><BookOpen size={16}/>MallByte / Editorial</div><h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Content management</h1><p className="mt-2 text-sm text-slate-600">Publish trustworthy storefront content without changing application code.</p></div><Link href="/" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700">View storefront<ArrowUpRight size={16}/></Link></div>
      <div className="mb-6 flex flex-wrap gap-2 text-xs"><span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-slate-600"><ShieldCheck size={14}/>Role permissions</span><span className="rounded-full bg-white px-3 py-2 text-slate-700">{access.canView ? "View drafts" : "Public view"}</span><span className="rounded-full bg-white px-3 py-2 text-slate-700">{access.canEdit ? "Can edit" : "Read-only"}</span><span className="rounded-full bg-white px-3 py-2 text-slate-700">{access.canPublish ? "Can publish" : "No publishing permission"}</span></div>
      <div className="grid items-start gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <nav aria-label="CMS sections" className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:grid-cols-4 lg:grid-cols-1">
          {RESOURCE_ORDER.map((key) => { const Icon = iconMap[key]; return <button type="button" key={key} onClick={() => setResource(key)} aria-current={resource === key ? "page" : undefined} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-left text-xs font-semibold transition sm:text-sm ${resource === key ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100"}`}><Icon size={17} className="shrink-0"/>{CMS_RESOURCES[key].title}</button>; })}
        </nav>
        <CmsResourcePanel resource={resource} key={resource}/>
      </div>
    </div>
  </main>;
}
