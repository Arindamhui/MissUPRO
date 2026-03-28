import {
  pgTable, uuid, text, integer, timestamp, boolean, jsonb, index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { kycStatusEnum, kycDocumentTypeEnum, kycDocumentStatusEnum } from "./enums";
import { users } from "./users";
import { admins } from "./admin";

// ─── kyc_verifications ───
export const kycVerifications = pgTable("kyc_verifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  status: kycStatusEnum("status").default("NOT_STARTED").notNull(),
  legalFirstName: text("legal_first_name"),
  legalLastName: text("legal_last_name"),
  dateOfBirth: text("date_of_birth"),
  nationality: text("nationality"),
  countryOfResidence: text("country_of_residence"),
  addressLine1Encrypted: text("address_line_1_encrypted"),
  addressLine2Encrypted: text("address_line_2_encrypted"),
  cityEncrypted: text("city_encrypted"),
  stateEncrypted: text("state_encrypted"),
  postalCodeEncrypted: text("postal_code_encrypted"),
  verificationLevel: integer("verification_level").default(0).notNull(),
  externalVerificationId: text("external_verification_id"),
  riskScore: integer("risk_score").default(0).notNull(),
  rejectionReason: text("rejection_reason"),
  reviewedByAdminId: uuid("reviewed_by_admin_id").references(() => admins.id),
  reviewedAt: timestamp("reviewed_at"),
  approvedAt: timestamp("approved_at"),
  expiresAt: timestamp("expires_at"),
  submittedAt: timestamp("submitted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("kyc_verifications_user_idx").on(t.userId),
  index("kyc_verifications_status_submitted_idx").on(t.status, t.submittedAt),
  index("kyc_verifications_status_risk_idx").on(t.status, t.riskScore),
  index("kyc_verifications_expires_idx").on(t.expiresAt),
  index("kyc_verifications_reviewer_idx").on(t.reviewedByAdminId),
]);

// ─── kyc_documents ───
export const kycDocuments = pgTable("kyc_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  kycVerificationId: uuid("kyc_verification_id").notNull().references(() => kycVerifications.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  documentType: kycDocumentTypeEnum("document_type").notNull(),
  status: kycDocumentStatusEnum("status").default("UPLOADED").notNull(),
  storageKey: text("storage_key").notNull(),
  mimeType: text("mime_type").notNull(),
  checksumSha256: text("checksum_sha256").notNull(),
  documentNumber: text("document_number_encrypted"),
  issuingCountry: text("issuing_country"),
  expiryDate: text("expiry_date"),
  rejectionReason: text("rejection_reason"),
  reviewedByAdminId: uuid("reviewed_by_admin_id").references(() => admins.id),
  reviewedAt: timestamp("reviewed_at"),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("kyc_documents_verification_idx").on(t.kycVerificationId),
  index("kyc_documents_user_type_status_idx").on(t.userId, t.documentType, t.status),
  index("kyc_documents_status_uploaded_idx").on(t.status, t.uploadedAt),
]);

// ─── kyc_audit_trail (append-only) ───
export const kycAuditTrail = pgTable("kyc_audit_trail", {
  id: uuid("id").primaryKey().defaultRandom(),
  kycVerificationId: uuid("kyc_verification_id").notNull().references(() => kycVerifications.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  action: text("action").notNull(),
  oldStatus: text("old_status"),
  newStatus: text("new_status"),
  actorAdminId: uuid("actor_admin_id").references(() => admins.id),
  reason: text("reason"),
  metadataJson: jsonb("metadata_json"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("kyc_audit_trail_verification_created_idx").on(t.kycVerificationId, t.createdAt),
  index("kyc_audit_trail_user_created_idx").on(t.userId, t.createdAt),
  index("kyc_audit_trail_actor_created_idx").on(t.actorAdminId, t.createdAt),
]);

// ─── Relations ───
export const kycVerificationsRelations = relations(kycVerifications, ({ one, many }) => ({
  user: one(users, { fields: [kycVerifications.userId], references: [users.id] }),
  reviewer: one(admins, { fields: [kycVerifications.reviewedByAdminId], references: [admins.id] }),
  documents: many(kycDocuments),
  auditTrail: many(kycAuditTrail),
}));

export const kycDocumentsRelations = relations(kycDocuments, ({ one }) => ({
  verification: one(kycVerifications, { fields: [kycDocuments.kycVerificationId], references: [kycVerifications.id] }),
  user: one(users, { fields: [kycDocuments.userId], references: [users.id] }),
  reviewer: one(admins, { fields: [kycDocuments.reviewedByAdminId], references: [admins.id] }),
}));

export const kycAuditTrailRelations = relations(kycAuditTrail, ({ one }) => ({
  verification: one(kycVerifications, { fields: [kycAuditTrail.kycVerificationId], references: [kycVerifications.id] }),
  user: one(users, { fields: [kycAuditTrail.userId], references: [users.id] }),
  actorAdmin: one(admins, { fields: [kycAuditTrail.actorAdminId], references: [admins.id] }),
}));
