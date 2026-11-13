import type { NavigationItem, NavigationMenu } from "./types";

/** Public serializers enforce publication; retain their hierarchy and ordering. */
export function publicNavigationItems(menus: NavigationMenu[]): NavigationItem[] {
  const items: NavigationItem[] = [];
  const visited = new Set<number>();
  function visit(item: NavigationItem) {
    if (visited.has(item.id) || !item.is_active || item.requires_auth) return;
    visited.add(item.id);
    items.push(item);
    for (const child of item.children ?? []) visit(child);
  }
  for (const menu of menus) {
    if (menu.is_active) for (const item of menu.items) visit(item);
  }
  return items;
}
