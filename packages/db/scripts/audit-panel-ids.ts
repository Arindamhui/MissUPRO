/**
 * ═══════════════════════════════════════════════════════════════════
 * Panel ID Audit & Migration Script
 * ═══════════════════════════════════════════════════════════════════
 *
 * This script scans all panel entities (users, admins, agencies, hosts)
 * for missing or malformed panel IDs and generates compliant IDs.
 *
 * Usage:
 *   npx tsx packages/db/scripts/audit-panel-ids.ts [--dry-run] [--fix]
 *
 * Flags:
 *   --dry-run   Report issues only (default)
 *   --fix       Apply fixes
 * ═══════════════════════════════════════════════════════════════════
 */

import { randomBytes } from "node:crypto";
import { db } from "../index";
import { users, admins, agencies, hosts } from "../schema";
import { eq, isNull, or, sql } from "drizzle-orm";

// ─── ID Format Rules ───
const ID_RULES = {
  USER:         { regex: /^U\d{9}$/,            prefix: "U",  digits: 9, label: "User" },
  ADMIN:        { regex: /^AD\d{8}$/,           prefix: "AD", digits: 8, label: "Admin" },
  AGENCY:       { regex: /^A\d{9}$/,            prefix: "A",  digits: 9, label: "Agency" },
  HOST:         { regex: /^H\d{9}$/,            prefix: "H",  digits: 9, label: "Host (Platform)" },
  AGENCY_HOST:  { regex: /^AH\d{8}$/,           prefix: "AH", digits: 8, label: "Host (Agency)" },
  HOST_ANY:     { regex: /^(H\d{9}|AH\d{8})$/, prefix: "",   digits: 0, label: "Host (Any)" },
};

function cryptoRandomDigits(length: number): string {
  let digits = "";
  while (digits.length < length) {
    const bytes = randomBytes(Math.max(length, 8));
    for (const byte of bytes) {
      if (byte < 250 && digits.length < length) {
        digits += String(byte % 10);
      }
    }
  }
  return digits.slice(0, length);
}

function generatePanelId(prefix: string, digits: number): string {
  return `${prefix}${cryptoRandomDigits(digits)}`;
}

interface AuditIssue {
  entity: string;
  recordId: string;
  field: string;
  currentValue: string | null;
  issue: "missing" | "malformed" | "duplicate";
  fixedValue?: string;
}

const dryRun = !process.argv.includes("--fix");
const issues: AuditIssue[] = [];

async function auditUsers() {
  console.log("\n📋 Auditing USERS (publicUserId, publicId)...");

  const allUsers = await db
    .select({ id: users.id, publicUserId: users.publicUserId, publicId: users.publicId })
    .from(users);

  const seenPublicUserIds = new Set<string>();
  let fixed = 0;

  for (const user of allUsers) {
    // Check publicUserId
    if (!user.publicUserId || !ID_RULES.USER.regex.test(user.publicUserId)) {
      const issue: AuditIssue = {
        entity: "users",
        recordId: user.id,
        field: "publicUserId",
        currentValue: user.publicUserId,
        issue: user.publicUserId ? "malformed" : "missing",
      };

      if (!dryRun) {
        let newId: string;
        do {
          newId = generatePanelId("U", 9);
        } while (seenPublicUserIds.has(newId));
        seenPublicUserIds.add(newId);

        await db.update(users)
          .set({ publicUserId: newId, publicId: newId, updatedAt: new Date() })
          .where(eq(users.id, user.id));

        issue.fixedValue = newId;
        fixed++;
      }

      issues.push(issue);
    } else {
      // Check for duplicates
      if (seenPublicUserIds.has(user.publicUserId)) {
        const issue: AuditIssue = {
          entity: "users",
          recordId: user.id,
          field: "publicUserId",
          currentValue: user.publicUserId,
          issue: "duplicate",
        };

        if (!dryRun) {
          let newId: string;
          do {
            newId = generatePanelId("U", 9);
          } while (seenPublicUserIds.has(newId));
          seenPublicUserIds.add(newId);

          await db.update(users)
            .set({ publicUserId: newId, publicId: newId, updatedAt: new Date() })
            .where(eq(users.id, user.id));

          issue.fixedValue = newId;
          fixed++;
        }

        issues.push(issue);
      } else {
        seenPublicUserIds.add(user.publicUserId);
      }
    }

    // Check publicId matches publicUserId
    if (user.publicUserId && user.publicId !== user.publicUserId && ID_RULES.USER.regex.test(user.publicUserId)) {
      issues.push({
        entity: "users",
        recordId: user.id,
        field: "publicId",
        currentValue: user.publicId,
        issue: "malformed",
      });

      if (!dryRun) {
        await db.update(users)
          .set({ publicId: user.publicUserId, updatedAt: new Date() })
          .where(eq(users.id, user.id));
      }
    }
  }

  console.log(`  Total users: ${allUsers.length}, Issues: ${issues.filter(i => i.entity === "users").length}, Fixed: ${fixed}`);
}

async function auditAdmins() {
  console.log("\n📋 Auditing ADMINS (publicAdminId)...");

  const allAdmins = await db
    .select({ id: admins.id, publicAdminId: admins.publicAdminId })
    .from(admins);

  const seenIds = new Set<string>();
  let fixed = 0;

  for (const admin of allAdmins) {
    if (!admin.publicAdminId || !ID_RULES.ADMIN.regex.test(admin.publicAdminId)) {
      const issue: AuditIssue = {
        entity: "admins",
        recordId: admin.id,
        field: "publicAdminId",
        currentValue: admin.publicAdminId,
        issue: admin.publicAdminId ? "malformed" : "missing",
      };

      if (!dryRun) {
        let newId: string;
        do {
          newId = generatePanelId("AD", 8);
        } while (seenIds.has(newId));
        seenIds.add(newId);

        await db.update(admins)
          .set({ publicAdminId: newId, updatedAt: new Date() })
          .where(eq(admins.id, admin.id));

        issue.fixedValue = newId;
        fixed++;
      }

      issues.push(issue);
    } else if (seenIds.has(admin.publicAdminId)) {
      const issue: AuditIssue = {
        entity: "admins",
        recordId: admin.id,
        field: "publicAdminId",
        currentValue: admin.publicAdminId,
        issue: "duplicate",
      };

      if (!dryRun) {
        let newId: string;
        do {
          newId = generatePanelId("AD", 8);
        } while (seenIds.has(newId));
        seenIds.add(newId);

        await db.update(admins)
          .set({ publicAdminId: newId, updatedAt: new Date() })
          .where(eq(admins.id, admin.id));

        issue.fixedValue = newId;
        fixed++;
      }

      issues.push(issue);
    } else {
      seenIds.add(admin.publicAdminId);
    }
  }

  console.log(`  Total admins: ${allAdmins.length}, Issues: ${issues.filter(i => i.entity === "admins").length}, Fixed: ${fixed}`);
}

async function auditAgencies() {
  console.log("\n📋 Auditing AGENCIES (publicId, agencyCode)...");

  const allAgencies = await db
    .select({ id: agencies.id, publicId: agencies.publicId, agencyCode: agencies.agencyCode })
    .from(agencies);

  const seenPublicIds = new Set<string>();
  const seenCodes = new Set<string>();
  let fixed = 0;

  for (const agency of allAgencies) {
    // Check publicId
    if (!agency.publicId || !ID_RULES.AGENCY.regex.test(agency.publicId)) {
      const issue: AuditIssue = {
        entity: "agencies",
        recordId: agency.id,
        field: "publicId",
        currentValue: agency.publicId,
        issue: agency.publicId ? "malformed" : "missing",
      };

      if (!dryRun) {
        let newId: string;
        do {
          newId = generatePanelId("A", 9);
        } while (seenPublicIds.has(newId));
        seenPublicIds.add(newId);
        seenCodes.add(newId);

        await db.update(agencies)
          .set({ publicId: newId, agencyCode: newId, updatedAt: new Date() })
          .where(eq(agencies.id, agency.id));

        issue.fixedValue = newId;
        fixed++;
      }

      issues.push(issue);
    } else {
      seenPublicIds.add(agency.publicId);
    }

    // Check agencyCode matches publicId
    if (agency.publicId && agency.agencyCode !== agency.publicId && ID_RULES.AGENCY.regex.test(agency.publicId)) {
      issues.push({
        entity: "agencies",
        recordId: agency.id,
        field: "agencyCode",
        currentValue: agency.agencyCode,
        issue: "malformed",
      });

      if (!dryRun) {
        await db.update(agencies)
          .set({ agencyCode: agency.publicId, updatedAt: new Date() })
          .where(eq(agencies.id, agency.id));
        fixed++;
      }
    }
  }

  console.log(`  Total agencies: ${allAgencies.length}, Issues: ${issues.filter(i => i.entity === "agencies").length}, Fixed: ${fixed}`);
}

async function auditHosts() {
  console.log("\n📋 Auditing HOSTS (hostId, publicId)...");

  const allHosts = await db
    .select({ id: hosts.id, hostId: hosts.hostId, publicId: hosts.publicId, type: hosts.type })
    .from(hosts);

  const seenHostIds = new Set<string>();
  let fixed = 0;

  for (const host of allHosts) {
    const expectedRule = host.type === "AGENCY" ? ID_RULES.AGENCY_HOST : ID_RULES.HOST;

    if (!host.hostId || !ID_RULES.HOST_ANY.regex.test(host.hostId)) {
      const issue: AuditIssue = {
        entity: "hosts",
        recordId: host.id,
        field: "hostId",
        currentValue: host.hostId,
        issue: host.hostId ? "malformed" : "missing",
      };

      if (!dryRun) {
        let newId: string;
        do {
          newId = generatePanelId(expectedRule.prefix, expectedRule.digits);
        } while (seenHostIds.has(newId));
        seenHostIds.add(newId);

        await db.update(hosts)
          .set({ hostId: newId, publicId: newId, updatedAt: new Date() })
          .where(eq(hosts.id, host.id));

        issue.fixedValue = newId;
        fixed++;
      }

      issues.push(issue);
    } else if (seenHostIds.has(host.hostId)) {
      const issue: AuditIssue = {
        entity: "hosts",
        recordId: host.id,
        field: "hostId",
        currentValue: host.hostId,
        issue: "duplicate",
      };

      if (!dryRun) {
        let newId: string;
        do {
          newId = generatePanelId(expectedRule.prefix, expectedRule.digits);
        } while (seenHostIds.has(newId));
        seenHostIds.add(newId);

        await db.update(hosts)
          .set({ hostId: newId, publicId: newId, updatedAt: new Date() })
          .where(eq(hosts.id, host.id));

        issue.fixedValue = newId;
        fixed++;
      }

      issues.push(issue);
    } else {
      seenHostIds.add(host.hostId);
    }

    // Check publicId matches hostId
    if (host.hostId && host.publicId !== host.hostId && ID_RULES.HOST_ANY.regex.test(host.hostId)) {
      issues.push({
        entity: "hosts",
        recordId: host.id,
        field: "publicId",
        currentValue: host.publicId,
        issue: "malformed",
      });

      if (!dryRun) {
        await db.update(hosts)
          .set({ publicId: host.hostId, updatedAt: new Date() })
          .where(eq(hosts.id, host.id));
      }
    }
  }

  console.log(`  Total hosts: ${allHosts.length}, Issues: ${issues.filter(i => i.entity === "hosts").length}, Fixed: ${fixed}`);
}

async function main() {
  console.log("═══════════════════════════════════════════════════");
  console.log("  Panel ID Audit & Migration Script");
  console.log(`  Mode: ${dryRun ? "DRY RUN (no changes)" : "FIX MODE (applying changes)"}`);
  console.log("═══════════════════════════════════════════════════");

  await auditUsers();
  await auditAdmins();
  await auditAgencies();
  await auditHosts();

  console.log("\n═══════════════════════════════════════════════════");
  console.log("  AUDIT SUMMARY");
  console.log("═══════════════════════════════════════════════════");

  const byEntity = {
    users: issues.filter(i => i.entity === "users"),
    admins: issues.filter(i => i.entity === "admins"),
    agencies: issues.filter(i => i.entity === "agencies"),
    hosts: issues.filter(i => i.entity === "hosts"),
  };

  const byIssue = {
    missing: issues.filter(i => i.issue === "missing"),
    malformed: issues.filter(i => i.issue === "malformed"),
    duplicate: issues.filter(i => i.issue === "duplicate"),
  };

  console.log(`\n  By Entity:`);
  console.log(`    Users:    ${byEntity.users.length} issues`);
  console.log(`    Admins:   ${byEntity.admins.length} issues`);
  console.log(`    Agencies: ${byEntity.agencies.length} issues`);
  console.log(`    Hosts:    ${byEntity.hosts.length} issues`);

  console.log(`\n  By Type:`);
  console.log(`    Missing:    ${byIssue.missing.length}`);
  console.log(`    Malformed:  ${byIssue.malformed.length}`);
  console.log(`    Duplicate:  ${byIssue.duplicate.length}`);

  console.log(`\n  Total Issues: ${issues.length}`);
  console.log(`  Fixed:        ${issues.filter(i => i.fixedValue).length}`);

  if (dryRun && issues.length > 0) {
    console.log("\n  ⚠️  Run with --fix to apply corrections");
    console.log("\n  Issue Details:");
    for (const issue of issues.slice(0, 50)) {
      console.log(`    [${issue.entity}] ${issue.recordId} — ${issue.field}: ${issue.issue} (current: ${issue.currentValue ?? "NULL"})`);
    }
    if (issues.length > 50) {
      console.log(`    ... and ${issues.length - 50} more`);
    }
  }

  console.log("\n═══════════════════════════════════════════════════\n");
  process.exit(issues.length > 0 && dryRun ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(2);
});
