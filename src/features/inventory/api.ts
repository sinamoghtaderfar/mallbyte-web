import type { AxiosResponse } from "axios";

import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";

export type WarehouseType = "main" | "branch" | "third_party";

export type WarehouseListItem = {
  id: number;
  name: string;
  code: string;
  type: WarehouseType;
  type_display: string;
  city: string;
  is_active: boolean;
};

export type StockListItem = {
  id: number;
  product: number;
  product_name: string;
  product_sku: string;
  warehouse: number;
  warehouse_name: string;
  warehouse_code: string;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  low_stock_threshold: number;
  is_low_stock: boolean;
  last_updated: string;
};

type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

async function getAllPages<T>(url: string): Promise<T[]> {
  const items: T[] = [];
  let nextUrl: string | null = url;

  while (nextUrl !== null) {
    const requestUrl: string = nextUrl;

    const response: AxiosResponse<T[] | PaginatedResponse<T>> =
      await apiClient.get<T[] | PaginatedResponse<T>>(requestUrl);

    if (Array.isArray(response.data)) {
      items.push(...response.data);
      break;
    }

    items.push(...response.data.results);
    nextUrl = response.data.next;
  }

  return items;
}

export async function getWarehouses() {
  return getAllPages<WarehouseListItem>(
    API_ENDPOINTS.inventory.activeWarehouses,
  );
}

export async function getStocks() {
  return getAllPages<StockListItem>(API_ENDPOINTS.inventory.stocks);
}
