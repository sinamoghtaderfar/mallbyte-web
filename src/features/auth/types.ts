export type AuthUser = {
  id: number;
  email: string;
  phone: string | null;
  full_name: string;
  is_seller: boolean;
  is_staff?: boolean;
  is_superuser?: boolean;
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

export type AuthSuccessResponse = {
  user: AuthUser;
  access: string;
  is_new: boolean;
  recovery_codes?: string[];
};

export type OtpMfaChallengeResponse = {
  mfa_required: true;
  challenge: string;
  mfa_enrolled: boolean;
};

export type OtpVerifyResponse = AuthSuccessResponse | OtpMfaChallengeResponse;

export type MFASetupResponse = {
  secret: string;
  otpauth_uri: string;
  message: string;
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
