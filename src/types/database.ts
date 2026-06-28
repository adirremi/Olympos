export type Profile = {
  user_id: string;
  full_name: string;
  phone: string | null;
  onboarding_completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Business = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
};

export type CheckInStatus = "draft" | "published" | "archived";
export type CheckInCtaType = "call" | "whatsapp" | "website" | "none";
export type PlatformProvider = "gmb" | "facebook" | "instagram" | "youtube";
export type PlatformConnectionStatus =
  | "disconnected"
  | "connected"
  | "expired"
  | "error";

export type CheckIn = {
  id: string;
  business_id: string;
  full_address: string;
  lat: number;
  lng: number;
  description: string | null;
  cta_type: CheckInCtaType;
  status: CheckInStatus;
  created_at: string;
};

export type PlatformConnection = {
  id: string;
  business_id: string;
  provider: PlatformProvider;
  account_id: string | null;
  account_name: string | null;
  status: PlatformConnectionStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type BusinessInvitation = {
  id: string;
  business_id: string;
  email: string;
  invited_by: string;
  role: "owner" | "member";
  status: "pending" | "accepted" | "expired" | "revoked";
  token: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
};
