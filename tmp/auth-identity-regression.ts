import assert from "node:assert/strict";
import {
  getGoogleSubject,
  mergeGoogleAuthMetadata,
  normalizeAuthEmail,
  resolveGoogleIdentityResolution,
  resolveSessionAccessState,
} from "../apps/web/src/server/lib/auth-identity";

function run() {
  assert.equal(normalizeAuthEmail("  Agency.Owner@Example.COM "), "agency.owner@example.com");

  assert.equal(getGoogleSubject({ googleSub: "sub-123" }), "sub-123");
  assert.equal(getGoogleSubject({ googleSub: 123 }), null);
  assert.deepEqual(mergeGoogleAuthMetadata({ provider: "GOOGLE" }, "sub-999"), {
    provider: "GOOGLE",
    googleSub: "sub-999",
  });

  assert.equal(resolveGoogleIdentityResolution({
    googleUserId: null,
    emailUserId: null,
    emailUserGoogleSub: null,
    googleSub: "sub-1",
  }), "create");

  assert.equal(resolveGoogleIdentityResolution({
    googleUserId: "user-1",
    emailUserId: null,
    emailUserGoogleSub: null,
    googleSub: "sub-1",
  }), "by-google-sub");

  assert.equal(resolveGoogleIdentityResolution({
    googleUserId: null,
    emailUserId: "user-1",
    emailUserGoogleSub: null,
    googleSub: "sub-1",
  }), "by-email");

  assert.equal(resolveGoogleIdentityResolution({
    googleUserId: null,
    emailUserId: "user-1",
    emailUserGoogleSub: "sub-old",
    googleSub: "sub-new",
  }), "subject-mismatch");

  assert.equal(resolveGoogleIdentityResolution({
    googleUserId: "user-1",
    emailUserId: "user-2",
    emailUserGoogleSub: "sub-2",
    googleSub: "sub-1",
  }), "conflict");

  assert.deepEqual(resolveSessionAccessState({
    role: "USER",
    platformRole: "USER",
    authRole: null,
    agencyId: "agency-1",
    agencyStatus: "PENDING",
  }), {
    role: "AGENCY",
    platformRole: "AGENCY",
    agencyStatus: "PENDING",
  });

  assert.deepEqual(resolveSessionAccessState({
    role: "USER",
    platformRole: "AGENCY",
    authRole: "agency",
    agencyId: "agency-1",
    agencyStatus: "APPROVED",
  }), {
    role: "AGENCY",
    platformRole: "AGENCY",
    agencyStatus: "APPROVED",
  });

  assert.deepEqual(resolveSessionAccessState({
    role: "HOST",
    platformRole: "MODEL_AGENCY",
    authRole: null,
    agencyId: null,
    agencyStatus: null,
  }), {
    role: "HOST",
    platformRole: "MODEL_AGENCY",
    agencyStatus: "NONE",
  });

  assert.deepEqual(resolveSessionAccessState({
    role: "ADMIN",
    platformRole: "ADMIN",
    authRole: "admin",
    agencyId: null,
    agencyStatus: null,
  }), {
    role: "ADMIN",
    platformRole: "ADMIN",
    agencyStatus: "NONE",
  });

  console.log("auth-identity regression checks passed");
}

run();