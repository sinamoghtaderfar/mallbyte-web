export type AuthUser = {
  id: number;
  email: string;
  phone: string | null;
  full_name: string;
  is_seller: boolean;
  email_verified: boolean;
};

export type OtpRequestPayload = {
  email: string;
};

export type OtpRequestResponse = {
  message: string;
  delivery_channel: "email";
  email: string;
  expires_in: number;
};

export type OtpVerifyPayload = {
  email: string;
  code: string;
};

export type OtpVerifyResponse = {
  user: AuthUser;
  access: string;
  is_new: boolean;
};

export type ProfileResponse = {
  id: number;
  user: AuthUser;
};

export type TokenRefreshResponse = {
  access: string;
};

export type LogoutResponse = {
  message: string;
};