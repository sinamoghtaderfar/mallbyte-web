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

export type StockMovementType =
  | "purchase"
  | "sale"
  | "return"
  | "transfer_in"
  | "transfer_out"
  | "adjustment"
  | "damaged";

export const STOCK_MOVEMENT_LABELS: Record<StockMovementType, string> = {
  purchase: "Purchase",
  sale: "Customer order",
  return: "Customer return",
  transfer_in: "Transfer in",
  transfer_out: "Transfer out",
  adjustment: "Manual adjustment",
  damaged: "Damaged goods",
};

export function getStockMovementLabel(type: string) {
  return (
    STOCK_MOVEMENT_LABELS[type as StockMovementType] ??
    type.replaceAll("_", " ")
  );
}

export type StockMovementListItem = {
  id: number;
  product: number;
  product_name: string;
  product_sku: string;
  warehouse: number;
  warehouse_name: string;
  warehouse_code: string;
  movement_type: StockMovementType;
  movement_type_display: string;
  quantity: number;
  before_quantity: number;
  after_quantity: number;
  reference_id: string;
  reason: string;
  notes: string;
  created_by_name: string | null;
  created_at: string;
};

export type StockMovementDetail = StockMovementListItem & {
  created_by: number | null;
};

export type CreateStockMovementPayload = {
  product: number;
  warehouse: number;
  movement_type: StockMovementType;
  quantity: number;
  reference_id?: string;
  reason?: string;
  notes?: string;
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

export async function getStockMovements() {
  return getAllPages<StockMovementListItem>(
    API_ENDPOINTS.inventory.stockMovements,
  );
}

export async function createStockMovement(
  payload: CreateStockMovementPayload,
) {
  const response = await apiClient.post<StockMovementDetail>(
    API_ENDPOINTS.inventory.stockMovements,
    payload,
  );

  return response.data;
}