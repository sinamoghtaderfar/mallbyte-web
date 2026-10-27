import axios from "axios";
import { apiClient } from "@/lib/api/client";
import type {
  CmsList, CmsRecord, CmsResource, ContentPage, FaqCategory,
  HomepageContent, NavigationMenu,
} from "./types";

export const CMS_BASE = "/api/content/";
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");

/** Public editorial content never inherits an admin's Bearer token. */
export const publicCmsClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  withCredentials: false,
});

export function normalizeCmsList<T>(data: T[] | { results: T[]; count?: number; next?: string | null; previous?: string | null }): CmsList<T> {
  if (Array.isArray(data)) return { results: data, count: data.length, next: null, previous: null };
  return { results: data.results, count: data.count ?? data.results.length, next: data.next ?? null, previous: data.previous ?? null };
}
export async function listCms<T extends CmsRecord>(resource: CmsResource, page = 1): Promise<CmsList<T>> {
  const { data } = await apiClient.get<T[] | CmsList<T>>(`${CMS_BASE}${resource}/`, { params: { page } });
  return normalizeCmsList(data);
}
/** Collect dropdown options across paginated results, with a bounded request budget. */
export async function listCmsAll(resource: CmsResource, maxPages = 20): Promise<{ results: CmsRecord[]; truncated: boolean }> {
  const records: CmsRecord[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const response = await listCms<CmsRecord>(resource, page);
    records.push(...response.results);
    if (!response.next) return { results: records, truncated: false };
  }
  return { results: records, truncated: true };
}

export async function createCms(resource: CmsResource, body: Record<string, unknown> | FormData): Promise<CmsRecord> {
  const { data } = await apiClient.post<CmsRecord>(`${CMS_BASE}${resource}/`, body, {
    headers: body instanceof FormData ? { "Content-Type": undefined } : undefined,
    timeout: body instanceof FormData ? 60000 : 15000,
  });
  return data;
}
export async function updateCms(resource: CmsResource, key: string | number, body: Record<string, unknown> | FormData): Promise<CmsRecord> {
  const { data } = await apiClient.patch<CmsRecord>(`${CMS_BASE}${resource}/${encodeURIComponent(String(key))}/`, body, {
    headers: body instanceof FormData ? { "Content-Type": undefined } : undefined,
    timeout: body instanceof FormData ? 60000 : 15000,
  });
  return data;
}
export async function deleteCms(resource: CmsResource, key: string | number): Promise<void> {
  await apiClient.delete(`${CMS_BASE}${resource}/${encodeURIComponent(String(key))}/`);
}
export async function transitionCms(resource: "pages" | "banners" | "announcements", key: string | number, action: "publish" | "archive"): Promise<CmsRecord> {
  const { data } = await apiClient.post<CmsRecord>(`${CMS_BASE}${resource}/${encodeURIComponent(String(key))}/${action}/`, {});
  return data;
}
export async function fetchPublicHomepage(): Promise<HomepageContent> {
  const { data } = await publicCmsClient.get<HomepageContent>(`${CMS_BASE}homepage/`);
  return data;
}
/** Public pagination is bounded and never follows arbitrary server URLs. */
async function getPublicCollection<T>(resource: string, params: Record<string, string> = {}): Promise<T[]> {
  const all: T[] = [];
  for (let page = 1; page <= 20; page++) {
    const { data } = await publicCmsClient.get<T[] | CmsList<T>>(`${CMS_BASE}${resource}/`, { params: { ...params, page } });
    const parsed = normalizeCmsList(data);
    all.push(...parsed.results);
    if (!parsed.next) return all;
  }
  return all;
}
export async function fetchPublicNavigation(placement: string): Promise<NavigationMenu[]> {
  const data = await getPublicCollection<NavigationMenu>("navigation", { placement });
  return data.filter((menu) => menu.is_active);
}
export async function fetchPublicFaqs(): Promise<FaqCategory[]> {
  const data = await getPublicCollection<FaqCategory>("faq-categories");
  return data.filter((category) => category.is_active);
}
export async function fetchPublicPage(slug: string): Promise<ContentPage> {
  const { data } = await publicCmsClient.get<ContentPage>(`${CMS_BASE}pages/${encodeURIComponent(slug)}/`);
  return data;
}
