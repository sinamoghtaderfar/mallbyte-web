import Link from "next/link";
import type { ContentPage } from "../types";

export function PublicContentPage({ page }: { page: ContentPage }) {
  return <main className="min-h-[70vh] bg-[#f5f7fa] px-4 py-12 sm:py-16"><article className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white px-6 py-10 shadow-sm sm:px-12 sm:py-14"><nav aria-label="Breadcrumb" className="text-xs font-semibold uppercase tracking-[0.13em] text-cyan-700"><Link href="/" className="hover:underline">MallByte</Link> / {page.page_type}</nav><h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-950">{page.title}</h1>{page.excerpt && <p className="mt-6 text-lg leading-8 text-slate-600">{page.excerpt}</p>}<div className="mt-10 whitespace-pre-wrap break-words text-base leading-8 text-slate-700">{page.content}</div></article></main>;
}
