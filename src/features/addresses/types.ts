export type Address = {
  id: number;
  user: number;
  title: string;
  province: string;
  city: string;
  street: string;
  alley: string;
  building_number: string;
  floor: string;
  unit: string;
  postal_code: string;
  receiver_name: string;
  receiver_phone: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

export type AddressPayload = {
  title: string;
  province: string;
  city: string;
  street: string;
  alley?: string;
  building_number?: string;
  floor?: string;
  unit?: string;
  postal_code: string;
  receiver_name: string;
  receiver_phone: string;
  is_default?: boolean;
};
