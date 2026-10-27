/** These helpers are UX guards; Django performs authoritative validation. */
export function safeContentUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value || /[\u0000-\u001F\u007F]/.test(value)) return null;
  const input = value.trim();
  if (!input || input.startsWith("//") || input.startsWith("\\") || input.includes("\\")) return null;
  if (input.startsWith("/") && !input.startsWith("//")) return input;
  try {
    const url = new URL(input);
    return (url.protocol === "https:" || url.protocol === "http:") ? url.href : null;
  } catch { return null; }
}
export function safeImageUrl(value: unknown): string | null {
  return safeContentUrl(value);
}
export function toDateTimeLocal(value: unknown): string {
  if (typeof value !== "string" || !value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const local = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}
export function toIsoDateTime(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
export function summarizeText(value: unknown, max = 95): string {
  const t = String(value ?? "").replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}
