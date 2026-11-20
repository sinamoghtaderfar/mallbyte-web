"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowUpRight, Check, FileText, Images, Layers, ListTree, Lock, Megaphone, MessageCircleQuestion, PanelTop,
} from "lucide-react";

import { buttonStyles } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";

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
  const capabilities = [
    { label: "View drafts", granted: access.canView },
    { label: "Edit content", granted: access.canEdit },
    { label: "Publish", granted: access.canPublish },
  ];

  return <main className="grid gap-6 sm:gap-8">
    <PageHeader eyebrow="Editorial" title="Content management"
      description="Publish trustworthy storefront content without changing application code. Content renders as plain text; HTML is never executed."
      actions={<Link href="/" className={buttonStyles({ variant: "secondary" })}>View storefront<ArrowUpRight size={16} aria-hidden="true" /></Link>} />

    <section aria-label="Your content permissions" className="flex flex-wrap items-center gap-2 text-sm">
      <span className="mr-1 text-muted">Your role:</span>
      {capabilities.map((item) => <span key={item.label}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${item.granted ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-line bg-surface text-slate-600"}`}>
        {item.granted ? <Check size={13} aria-hidden="true" /> : <Lock size={12} aria-hidden="true" />}
        {item.label}<span className="sr-only">{item.granted ? ": allowed" : ": not allowed"}</span>
      </span>)}
    </section>

    <div className="grid items-start gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <nav aria-label="CMS sections" className="-mx-1 overflow-x-auto px-1 mb-scrollbar-none lg:sticky lg:top-24 lg:mx-0 lg:overflow-visible lg:px-0">
        <p className="mb-eyebrow mb-2 hidden px-3 lg:block">Library</p>
        <ul className="flex min-w-max gap-1 rounded-xl border border-line bg-slate-100/70 p-1 lg:min-w-0 lg:flex-col lg:border-0 lg:bg-transparent lg:p-0">
          {RESOURCE_ORDER.map((key) => {
            const Icon = iconMap[key];
            const active = resource === key;
            return <li key={key}>
              <button type="button" onClick={() => setResource(key)} aria-current={active ? "page" : undefined}
                className={`flex min-h-10 w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium whitespace-nowrap transition-colors lg:min-h-11 ${active ? "bg-surface text-foreground shadow-sm ring-1 ring-line" : "text-slate-600 hover:bg-slate-100 hover:text-foreground"}`}>
                <Icon size={17} className={`shrink-0 ${active ? "text-brand" : "text-slate-500"}`} aria-hidden="true" />
                {CMS_RESOURCES[key].title}
              </button>
            </li>;
          })}
        </ul>
      </nav>
      <CmsResourcePanel resource={resource} key={resource} />
    </div>
  </main>;
}
