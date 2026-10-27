import MockAdapter from "axios-mock-adapter";
import { afterEach, describe, expect, it } from "vitest";
import { apiClient } from "@/lib/api/client";
import { publicCmsClient, normalizeCmsList, listCms, createCms, updateCms, transitionCms, fetchPublicHomepage, fetchPublicNavigation } from "../api";

const privateMock = new MockAdapter(apiClient);
const publicMock = new MockAdapter(publicCmsClient);
afterEach(() => { privateMock.reset(); publicMock.reset(); });

describe("CMS contracts", () => {
  it("normalizes paginated and flat lists", () => {
    expect(normalizeCmsList([{ id: 1 }]).count).toBe(1);
    expect(normalizeCmsList({ results: [{ id: 2 }], count: 4, next: "next" }).next).toBe("next");
  });
  it("fetches editor pages with authentication client", async () => {
    privateMock.onGet("/api/content/pages/").reply(200, { count: 1, next: null, previous: null, results: [{ id: 5, title: "Draft" }] });
    expect((await listCms("pages")).results[0].title).toBe("Draft");
  });
  it("creates draft without client-side status mutation", async () => {
    privateMock.onPost("/api/content/pages/").reply((config) => {
      const data = JSON.parse(config.data as string) as Record<string, unknown>;
      expect(data.status).toBeUndefined();
      return [201, { id: 7, ...data }];
    });
    expect((await createCms("pages", { title: "Test", content: "Text" })).id).toBe(7);
  });
  it("updates slug routes and sends publish POST separately", async () => {
    privateMock.onPatch("/api/content/pages/hello-world/").reply(200, { id: 1 });
    privateMock.onPost("/api/content/pages/hello-world/publish/").reply(200, { id: 1, status: "published" });
    await updateCms("pages", "hello-world", { title: "Renamed" });
    expect((await transitionCms("pages", "hello-world", "publish")).status).toBe("published");
  });
  it("loads marketing content without passing admin tokens", async () => {
    publicMock.onGet("/api/content/homepage/").reply(200, { banners: [], announcements: [], featured_pages: [], featured_faqs: [] });
    expect((await fetchPublicHomepage()).banners).toEqual([]);
  });
  it("reads public footer navigation from the public client", async () => {
    publicMock.onGet("/api/content/navigation/").reply(200, [{ id: 4, is_active: true, items: [] }]);
    expect((await fetchPublicNavigation("footer")).length).toBe(1);
  });
});
