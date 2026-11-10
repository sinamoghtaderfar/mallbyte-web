import { apiClient } from "@/lib/api/client";

import { API_ENDPOINTS } from "@/lib/api/endpoints";
import type { Address, AddressPayload } from "./types";
import type { PaginatedResponse } from "@/types/api";

type AddressListResponse = Address[] | PaginatedResponse<Address>;

export async function getAddresses() {
  return (await getAddressesPage()).results;
}

export async function getAddressesPage(
  page = 1,
  signal?: AbortSignal,
): Promise<PaginatedResponse<Address>> {
  const response = await apiClient.get<AddressListResponse>(
    API_ENDPOINTS.auth.addresses,
    { params: { page, page_size: 20 }, signal },
  );

  return Array.isArray(response.data)
    ? {
        count: response.data.length,
        next: null,
        previous: null,
        results: response.data,
      }
    : response.data;
}

export async function createAddress(payload: AddressPayload) {
  const response = await apiClient.post<Address>(
    API_ENDPOINTS.auth.addresses,
    payload,
  );

  return response.data;
}

export async function deleteAddress(addressId: number) {
  await apiClient.delete(API_ENDPOINTS.auth.addressDetail(addressId));
}

export async function setDefaultAddress(addressId: number) {
  await apiClient.patch(API_ENDPOINTS.auth.addressSetDefault(addressId));
}
