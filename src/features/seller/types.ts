import type { AuthUser } from "@/features/auth/types";

export type SellerStatus = "pending" | "approved" | "rejected" | "suspended";

export type Seller = {
  id: number;
  user: AuthUser;
  store_name: string;
  store_slug: string;
  logo: string | null;
  banner: string | null;
  description: string;
  status: SellerStatus;
  verified_at: string | null;
  business_phone: string;
  business_email: string;
  website: string;
  commission_rate: string;
  total_sales: string;
  total_orders: number;
  balance: string;
  applied_at: string;
  created_at: string;
};

export type SellerApplicationPayload = {
  store_name: string;
  description: string;
  business_phone: string;
  business_email: string;
  website: string;
  bank_info: {
    account_holder: string;
    iban: string;
  };
  documents: string[];
};

export type SellerApplicationResponse = {
  store_name: string;
  description: string;
  business_phone: string;
  business_email: string;
  website: string;
  bank_info: SellerApplicationPayload["bank_info"];
  documents: string[];
};
