export type CmsStatus = "draft" | "published" | "archived";
export type CmsPermission = "view_content_drafts" | "manage_content" | "publish_content";
export type CmsResource = "pages" | "banners" | "faq-categories" | "faqs" | "announcements" | "navigation" | "navigation-items";
export type CmsRecord = { id: number; created_at?: string; updated_at?: string; [key: string]: unknown };
export type CmsList<T> = { results: T[]; count: number; next: string | null; previous: string | null };
export type Publishable = { status: CmsStatus; published_at: string | null; starts_at: string | null; ends_at: string | null; is_visible: boolean };
export type ContentPage = CmsRecord & Publishable & {
  title: string; slug: string; page_type: "about" | "terms" | "privacy" | "help" | "landing" | "custom";
  excerpt: string; content: string; is_featured: boolean; order: number;
  meta_title: string; meta_description: string; meta_keywords: string;
};
export type ContentBanner = CmsRecord & Publishable & {
  title: string; subtitle: string; image: string; mobile_image: string | null;
  placement: "home_hero" | "home_top" | "home_middle" | "category_top" | "product_detail" | "checkout" | "global";
  cta_text: string; link_url: string; background_color: string; text_color: string;
  is_clickable: boolean; order: number;
};
export type FaqItem = CmsRecord & { category: number; category_name: string; question: string; answer: string; is_active: boolean; is_featured: boolean; order: number };
export type FaqCategory = CmsRecord & { name: string; slug: string; description: string; is_active: boolean; order: number; items: FaqItem[] };
export type ContentAnnouncement = CmsRecord & Publishable & {
  title: string; message: string; level: "info" | "success" | "warning" | "danger";
  placement: "global" | "home" | "product" | "checkout" | "account";
  link_text: string; link_url: string; is_dismissible: boolean; order: number;
};
export type NavigationItem = CmsRecord & {
  menu: number; parent: number | null; label: string; url: string; link_url: string;
  page: number | null; page_slug: string | null; page_title: string | null;
  icon: string; is_active: boolean; requires_auth: boolean; open_in_new_tab: boolean;
  order: number; children: NavigationItem[];
};
export type NavigationMenu = CmsRecord & {
  name: string; slug: string; placement: "header" | "footer" | "mobile" | "help" | "account";
  is_active: boolean; order: number; items: NavigationItem[];
};
export type HomepageContent = {
  banners: ContentBanner[]; announcements: ContentAnnouncement[];
  featured_pages: ContentPage[]; featured_faqs: FaqItem[];
};
export type CmsAccess = { canView: boolean; canEdit: boolean; canPublish: boolean };
