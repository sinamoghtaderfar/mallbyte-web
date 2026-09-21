import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";

export type MyPermissionsResponse = {
  user_id: number;
  email: string;
  permissions: string[];
  permissions_count: number;
};

export async function getMyPermissions() {
  const response = await apiClient.get<MyPermissionsResponse>(
    API_ENDPOINTS.rbac.myPermissions,
  );

  return response.data;
}
