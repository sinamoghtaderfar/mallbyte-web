import { SiteShell } from "@/components/layout/site-shell";
import { FaqPublic } from "@/features/content/components/faq-public";
export const metadata = { title: "Frequently asked questions | MallByte", description: "Help with orders, deliveries and shopping on MallByte." };
export default function FAQPage() { return <SiteShell><FaqPublic /></SiteShell>; }
