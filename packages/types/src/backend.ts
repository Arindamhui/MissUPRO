export type PublicIdKind = "USER" | "AGENCY" | "HOST" | "AGENCY_HOST";

export type AppRole = "USER" | "HOST" | "ADMIN";

export type HostRequestType = "PLATFORM" | "AGENCY";

export type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}

export interface SessionActor {
  userId: string;
  publicId: string | null;
  email: string;
  role: AppRole;
  sessionId: string;
  agencyId?: string | null;
}

export interface AccessTokenClaims extends Record<string, unknown> {
  sub: string;
  sid: string;
  role: AppRole;
  email: string;
  publicId?: string;
  agencyId?: string;
  deviceId: string;
  type: "access";
}

export interface RefreshTokenClaims extends Record<string, unknown> {
  sub: string;
  sid: string;
  type: "refresh";
  deviceId: string;
}

export interface CachedUserProfile {
  id: string;
  publicId: string | null;
  email: string;
  displayName: string;
  username: string;
  role: AppRole;
  phone: string | null;
  authProvider: string;
  agencyId: string | null;
  createdAt: string;
}

export interface CachedAgencySnapshot {
  id: string;
  publicId: string | null;
  ownerId: string | null;
  agencyName: string;
  status: string;
  approvalStatus: string;
  createdAt: string;
}

export interface DomainEvent<TPayload = Record<string, unknown>> {
  id: string;
  name: "USER_CREATED" | "HOST_REQUESTED" | "HOST_APPROVED" | "AGENCY_CREATED";
  aggregateType: string;
  aggregateId: string;
  occurredAt: string;
  payload: TPayload;
}