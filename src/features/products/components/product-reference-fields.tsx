"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { getApiErrorMessage } from "@/lib/api/errors";
import type { PaginatedResponse } from "@/types/api";
import type { ProductReferenceQuery } from "../types";

type Option = {
  id: number;
  name: string;
  is_active?: boolean;
  children?: Option[];
};
type ReferenceData = {
  categories: PaginatedResponse<Option>;
  brands: PaginatedResponse<Option>;
};
type Props = {
  category: string;
  brand: string;
  categoryLabel?: string | null;
  brandLabel?: string | null;
  required?: boolean;
  disabled?: boolean;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  loadOptions: (
    query?: ProductReferenceQuery,
    signal?: AbortSignal,
  ) => Promise<ReferenceData>;
};

const emptyPage: PaginatedResponse<Option> = {
  count: 0,
  next: null,
  previous: null,
  results: [],
};

function categoryOptions(
  items: Option[],
  prefix = "",
  seen = new Set<number>(),
): Option[] {
  return items.flatMap((item) => {
    if (seen.has(item.id) || item.is_active === false) return [];
    seen.add(item.id);
    const name = prefix ? `${prefix} / ${item.name}` : item.name;
    return [
      { id: item.id, name },
      ...categoryOptions(item.children ?? [], name, seen),
    ];
  });
}

/** Browse bounded reference pages without changing the selected form values. */
export function ProductReferenceFields({
  category,
  brand,
  categoryLabel,
  brandLabel,
  required,
  disabled,
  onChange,
  loadOptions,
}: Props) {
  const [query, setQuery] = useState({ categoryPage: 1, brandPage: 1 });
  const [data, setData] = useState<ReferenceData>({
    categories: emptyPage,
    brands: emptyPage,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [selectedNames, setSelectedNames] = useState<
    Record<string, { value: string; label: string }>
  >({});

  useEffect(() => {
    let current = true;
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const result = await loadOptions(query, controller.signal);
        if (current) setData(result);
      } catch (reason) {
        if (current) setError(getApiErrorMessage(reason));
      } finally {
        if (current) setLoading(false);
      }
    }
    void load();
    return () => {
      current = false;
      controller.abort();
    };
  }, [query, retry, loadOptions]);

  const fields = [
    {
      name: "category",
      title: "Category",
      value: category,
      selectedLabel: categoryLabel,
      options: categoryOptions(data.categories.results),
      page: query.categoryPage,
      key: "categoryPage" as const,
      data: data.categories,
      blank: required ? "Select category" : "All categories",
      countLabel: "root categories",
    },
    {
      name: "brand",
      title: "Brand",
      value: brand,
      selectedLabel: brandLabel,
      options: data.brands.results.filter((item) => item.is_active !== false),
      page: query.brandPage,
      key: "brandPage" as const,
      data: data.brands,
      blank: required ? "No brand" : "All brands",
      countLabel: "brands",
    },
  ];

  return (
    <>
      {error ? (
        <div role="alert" className="text-sm text-red-700">
          <p>{error}</p>
          <button
            type="button"
            disabled={loading || disabled}
            onClick={() => setRetry((value) => value + 1)}
            className="mt-2 underline"
          >
            Retry reference options
          </button>
        </div>
      ) : null}
      {fields.map((field) => {
        const saved = selectedNames[field.name];
        const selectedLabel =
          saved?.value === field.value ? saved.label : field.selectedLabel;
        return (
          <div key={field.name}>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                {field.title}
              </span>
              <select
                name={field.name}
                value={field.value}
                required={required && field.name === "category"}
                disabled={loading || Boolean(error) || disabled}
                onChange={(event) => {
                  const value = event.target.value;
                  const label = event.target.selectedOptions[0].textContent ?? "";
                  setSelectedNames((current) => ({
                    ...current,
                    [field.name]: {
                      value,
                      label,
                    },
                  }));
                  onChange(event);
                }}
                className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-slate-400 disabled:opacity-60"
              >
                <option value="">{field.blank}</option>
                {field.value &&
                !field.options.some(
                  (item) => String(item.id) === field.value,
                ) ? (
                  <option value={field.value}>
                    {selectedLabel ||
                      `Selected ${field.title.toLowerCase()} #${field.value}`}
                  </option>
                ) : null}
                {field.options.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <nav
              aria-label={`${field.title} pages`}
              className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600"
            >
              <button
                type="button"
                disabled={field.page === 1 || loading || disabled}
                onClick={() =>
                  setQuery((current) => ({
                    ...current,
                    [field.key]: field.page - 1,
                  }))
                }
                className="rounded-lg border px-2 py-1 disabled:opacity-40"
              >
                Previous {field.title.toLowerCase()} options
              </button>
              <span>
                {loading
                  ? "Loading options…"
                  : error
                    ? "Options unavailable"
                    : `${field.data.count} ${field.countLabel} · Page ${field.page} of ${Math.max(1, Math.ceil(field.data.count / 20))}`}
              </span>
              <button
                type="button"
                disabled={
                  !field.data.next || loading || Boolean(error) || disabled
                }
                onClick={() =>
                  setQuery((current) => ({
                    ...current,
                    [field.key]: field.page + 1,
                  }))
                }
                className="rounded-lg border px-2 py-1 disabled:opacity-40"
              >
                Next {field.title.toLowerCase()} options
              </button>
            </nav>
          </div>
        );
      })}
    </>
  );
}
