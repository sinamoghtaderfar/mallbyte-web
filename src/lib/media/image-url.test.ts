import { afterEach, describe, expect, it, vi } from "vitest";
import { getImageUrl } from "./image-url";

afterEach(() => vi.unstubAllEnvs());

describe("shared image URL handling", () => {
  it.each([null, undefined, ""])("keeps an absent image %s absent", (value) => {
    expect(getImageUrl(value)).toBeNull();
  });

  it.each(["https://cdn.example.test/product.png", "http://cdn.example.test/product.png"])(
    "preserves the absolute URL %s", (value) => {
      vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.example.test/");
      expect(getImageUrl(value)).toBe(value);
    },
  );

  it("prefixes root-relative paths with the API origin, trimming its trailing slash", () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.example.test/");
    expect(getImageUrl("/media/products/keyboard.png")).toBe("https://api.example.test/media/products/keyboard.png");
  });

  it("uses the existing local API fallback when no origin is configured", () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", undefined);
    expect(getImageUrl("/media/product.png")).toBe("http://localhost:8000/media/product.png");
  });

  it.each(["//external.example.test/image.png", "data:image/png;base64,AA", "javascript:alert(1)"])(
    "does not start accepting another absolute URL form: %s", (value) => {
      vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.example.test");
      expect(getImageUrl(value)).toBe(`https://api.example.test${value}`);
    },
  );

  it("preserves existing concatenation for paths without a leading slash", () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.example.test/");
    expect(getImageUrl("media/product.png")).toBe("https://api.example.testmedia/product.png");
  });
});
