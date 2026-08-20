import { apiClient } from "@/lib/api/client";

import { API_ENDPOINTS } from "@/lib/api/endpoints";
import type { Address, AddressPayload } from "./types";

type AddressListResponse = Address[] | { results: Address[] };

function normalizeAddresses(data: AddressListResponse) {
  if (Array.isArray(data)) {
    return data;
  }

  return data.results;
}

export async function getAddresses() {
  const response = await apiClient.get<AddressListResponse>(
    API_ENDPOINTS.auth.addresses,
  );

  return normalizeAddresses(response.data);
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
