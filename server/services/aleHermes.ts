/**
 * ALE_HERMES - AI Storage Agent
 *
 * Intelligent storage orchestration service for Grudge users.
 * Proxies file operations to the Grudge backend asset-service
 * at assets-api.grudge-studio.com.
 *
 * Features:
 * - User-isolated storage (users/{userId}/{namespace}/{resource})
 * - Namespace support: projects, assets, backups, runtime, app-storage
 * - Metadata tracking and audit logging (MySQL)
 * - Quota management and enforcement
 * - Integration with existing asset pipeline
 */

import { db } from "../db";
import {
  userObjects,
  storageAuditLogs,
  userStorageQuotas,
  type InsertUserObject,
  type InsertStorageAuditLog,
  type UserObject,
  type UserStorageQuota,
} from "../../shared/schema";
import { eq, and, like, desc, sql } from "drizzle-orm";
import { createHash } from "crypto";
import { Readable } from "stream";

const ASSETS_API = process.env.ASSETS_API_URL || process.env.VITE_ASSETS_URL || "https://assets-api.grudge-studio.com";

export type StorageNamespace = "projects" | "assets" | "backups" | "runtime" | "app-storage";

export interface UploadOptions {
  namespace?: StorageNamespace;
  contentType?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  isPublic?: boolean;
}

export interface ListOptions {
  namespace?: StorageNamespace;
  prefix?: string;
  limit?: number;
  offset?: number;
}

export interface AuditContext {
  ipAddress?: string;
  userAgent?: string;
}

export class AleHermesService {
  private agentName = "ALE_HERMES";

  constructor() {
    console.log(`[${this.agentName}] Initialized → backend at ${ASSETS_API}`);
  }

  // ── Internal helpers ─────────────────────────────────────────
  private buildObjectKey(userId: string, namespace: StorageNamespace, filename: string): string {
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    return `users/${userId}/${namespace}/${sanitizedFilename}`;
  }

  private calculateChecksum(data: Buffer | string): string {
    const content = typeof data === "string" ? Buffer.from(data) : data;
    return createHash("md5").update(content).digest("hex");
  }

  private async backendFetch(path: string, init?: RequestInit): Promise<globalThis.Response> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(init?.headers as Record<string, string> || {}),
    };
    return fetch(`${ASSETS_API}${path}`, { ...init, headers });
  }

  private async logAudit(
    userId: string,
    operation: string,
    objectKey: string | null,
    success: boolean,
    context: AuditContext,
    errorMessage?: string,
    fileSize?: number,
    targetKey?: string
  ): Promise<void> {
    try {
      const log: InsertStorageAuditLog = {
        userId,
        operation,
        objectKey,
        targetKey,
        fileSize,
        success,
        errorMessage,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      };
      await db.insert(storageAuditLogs).values(log);
    } catch (err) {
      console.error(`[${this.agentName}] Failed to write audit log:`, err);
    }
  }

  private async updateQuota(userId: string, deltaBytes: number, deltaCount: number): Promise<void> {
    const existing = await db.select().from(userStorageQuotas).where(eq(userStorageQuotas.userId, userId)).limit(1);

    if (existing.length === 0) {
      await db.insert(userStorageQuotas).values({
        userId,
        usedStorageBytes: Math.max(0, deltaBytes),
        objectCount: Math.max(0, deltaCount),
      });
    } else {
      await db
        .update(userStorageQuotas)
        .set({
          usedStorageBytes: sql`GREATEST(0, ${userStorageQuotas.usedStorageBytes} + ${deltaBytes})`,
          objectCount: sql`GREATEST(0, ${userStorageQuotas.objectCount} + ${deltaCount})`,
          updatedAt: new Date(),
        })
        .where(eq(userStorageQuotas.userId, userId));
    }
  }

  // ── Quota management ─────────────────────────────────────────
  async getQuota(userId: string): Promise<UserStorageQuota | null> {
    const result = await db.select().from(userStorageQuotas).where(eq(userStorageQuotas.userId, userId)).limit(1);
    if (result.length === 0) {
      await db.insert(userStorageQuotas).values({ userId });
      const newResult = await db.select().from(userStorageQuotas).where(eq(userStorageQuotas.userId, userId)).limit(1);
      return newResult[0] || null;
    }
    return result[0];
  }

  async checkQuota(userId: string, additionalBytes: number): Promise<{ allowed: boolean; reason?: string }> {
    const quota = await this.getQuota(userId);
    if (!quota) return { allowed: true };

    if (quota.usedStorageBytes + additionalBytes > quota.maxStorageBytes) {
      return {
        allowed: false,
        reason: `Storage quota exceeded. Used: ${quota.usedStorageBytes}, Max: ${quota.maxStorageBytes}, Requested: ${additionalBytes}`,
      };
    }
    return { allowed: true };
  }

  // ── Upload operations (proxy to backend asset-service) ───────
  async uploadFromText(
    userId: string,
    filename: string,
    content: string,
    options: UploadOptions = {},
    context: AuditContext = {}
  ): Promise<{ ok: boolean; objectKey?: string; error?: string }> {
    const namespace = options.namespace || "assets";
    const objectKey = this.buildObjectKey(userId, namespace, filename);
    const fileSize = Buffer.byteLength(content, "utf8");

    const quotaCheck = await this.checkQuota(userId, fileSize);
    if (!quotaCheck.allowed) {
      await this.logAudit(userId, "upload", objectKey, false, context, quotaCheck.reason, fileSize);
      return { ok: false, error: quotaCheck.reason };
    }

    try {
      const res = await this.backendFetch("/assets/upload", {
        method: "POST",
        body: JSON.stringify({
          objectKey,
          content,
          contentType: options.contentType || "text/plain",
          userId,
          namespace,
          isPublic: options.isPublic || false,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Upload failed" }));
        await this.logAudit(userId, "upload", objectKey, false, context, errData.error, fileSize);
        return { ok: false, error: errData.error };
      }

      const checksum = this.calculateChecksum(content);
      const objectRecord: InsertUserObject = {
        userId,
        objectKey,
        namespace,
        filename,
        contentType: options.contentType || "text/plain",
        fileSize,
        checksum,
        tags: options.tags || [],
        metadata: options.metadata || {},
        isPublic: options.isPublic || false,
      };

      await db.insert(userObjects).values(objectRecord).onConflictDoUpdate({
        target: userObjects.objectKey,
        set: { ...objectRecord, updatedAt: new Date() },
      });

      await this.updateQuota(userId, fileSize, 1);
      await this.logAudit(userId, "upload", objectKey, true, context, undefined, fileSize);

      return { ok: true, objectKey };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      await this.logAudit(userId, "upload", objectKey, false, context, errorMsg, fileSize);
      return { ok: false, error: errorMsg };
    }
  }

  async uploadFromBytes(
    userId: string,
    filename: string,
    content: Buffer,
    options: UploadOptions = {},
    context: AuditContext = {}
  ): Promise<{ ok: boolean; objectKey?: string; error?: string }> {
    const namespace = options.namespace || "assets";
    const objectKey = this.buildObjectKey(userId, namespace, filename);
    const fileSize = content.length;

    const quotaCheck = await this.checkQuota(userId, fileSize);
    if (!quotaCheck.allowed) {
      await this.logAudit(userId, "upload", objectKey, false, context, quotaCheck.reason, fileSize);
      return { ok: false, error: quotaCheck.reason };
    }

    try {
      const res = await this.backendFetch("/assets/upload", {
        method: "POST",
        headers: {
          "Content-Type": options.contentType || "application/octet-stream",
        },
        body: content,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Upload failed" }));
        await this.logAudit(userId, "upload", objectKey, false, context, errData.error, fileSize);
        return { ok: false, error: errData.error };
      }

      const checksum = this.calculateChecksum(content);
      const objectRecord: InsertUserObject = {
        userId,
        objectKey,
        namespace,
        filename,
        contentType: options.contentType || "application/octet-stream",
        fileSize,
        checksum,
        tags: options.tags || [],
        metadata: options.metadata || {},
        isPublic: options.isPublic || false,
      };

      await db.insert(userObjects).values(objectRecord).onConflictDoUpdate({
        target: userObjects.objectKey,
        set: { ...objectRecord, updatedAt: new Date() },
      });

      await this.updateQuota(userId, fileSize, 1);
      await this.logAudit(userId, "upload", objectKey, true, context, undefined, fileSize);

      return { ok: true, objectKey };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      await this.logAudit(userId, "upload", objectKey, false, context, errorMsg, fileSize);
      return { ok: false, error: errorMsg };
    }
  }

  async uploadFromStream(
    userId: string,
    filename: string,
    stream: Readable,
    options: UploadOptions = {},
    context: AuditContext = {}
  ): Promise<{ ok: boolean; objectKey?: string; error?: string }> {
    // Collect stream into buffer and delegate to uploadFromBytes
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);
    return this.uploadFromBytes(userId, filename, buffer, options, context);
  }

  // ── Download operations (proxy to backend) ───────────────────
  async downloadAsText(
    userId: string,
    objectKey: string,
    context: AuditContext = {}
  ): Promise<{ ok: boolean; value?: string; error?: string }> {
    const record = await db
      .select()
      .from(userObjects)
      .where(and(eq(userObjects.userId, userId), eq(userObjects.objectKey, objectKey)))
      .limit(1);

    if (record.length === 0) {
      await this.logAudit(userId, "download", objectKey, false, context, "Object not found");
      return { ok: false, error: "Object not found or access denied" };
    }

    try {
      const res = await this.backendFetch(`/assets/download?key=${encodeURIComponent(objectKey)}`);
      if (!res.ok) {
        await this.logAudit(userId, "download", objectKey, false, context, `HTTP ${res.status}`);
        return { ok: false, error: `Download failed: ${res.status}` };
      }

      const value = await res.text();
      await db.update(userObjects).set({ lastAccessedAt: new Date() }).where(eq(userObjects.objectKey, objectKey));
      await this.logAudit(userId, "download", objectKey, true, context);
      return { ok: true, value };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      await this.logAudit(userId, "download", objectKey, false, context, errorMsg);
      return { ok: false, error: errorMsg };
    }
  }

  async downloadAsBytes(
    userId: string,
    objectKey: string,
    context: AuditContext = {}
  ): Promise<{ ok: boolean; value?: Buffer; error?: string }> {
    const record = await db
      .select()
      .from(userObjects)
      .where(and(eq(userObjects.userId, userId), eq(userObjects.objectKey, objectKey)))
      .limit(1);

    if (record.length === 0) {
      await this.logAudit(userId, "download", objectKey, false, context, "Object not found");
      return { ok: false, error: "Object not found or access denied" };
    }

    try {
      const res = await this.backendFetch(`/assets/download?key=${encodeURIComponent(objectKey)}`);
      if (!res.ok) {
        await this.logAudit(userId, "download", objectKey, false, context, `HTTP ${res.status}`);
        return { ok: false, error: `Download failed: ${res.status}` };
      }

      const value = Buffer.from(await res.arrayBuffer());
      await db.update(userObjects).set({ lastAccessedAt: new Date() }).where(eq(userObjects.objectKey, objectKey));
      await this.logAudit(userId, "download", objectKey, true, context);
      return { ok: true, value };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      await this.logAudit(userId, "download", objectKey, false, context, errorMsg);
      return { ok: false, error: errorMsg };
    }
  }

  async downloadAsStream(
    userId: string,
    objectKey: string,
    context: AuditContext = {}
  ): Promise<{ ok: boolean; value?: Readable; error?: string }> {
    const record = await db
      .select()
      .from(userObjects)
      .where(and(eq(userObjects.userId, userId), eq(userObjects.objectKey, objectKey)))
      .limit(1);

    if (record.length === 0) {
      await this.logAudit(userId, "download", objectKey, false, context, "Object not found");
      return { ok: false, error: "Object not found or access denied" };
    }

    try {
      const res = await this.backendFetch(`/assets/download?key=${encodeURIComponent(objectKey)}`);
      if (!res.ok) {
        await this.logAudit(userId, "download", objectKey, false, context, `HTTP ${res.status}`);
        return { ok: false, error: `Download failed: ${res.status}` };
      }

      const stream = Readable.fromWeb(res.body as any);
      await db.update(userObjects).set({ lastAccessedAt: new Date() }).where(eq(userObjects.objectKey, objectKey));
      await this.logAudit(userId, "download", objectKey, true, context);
      return { ok: true, value: stream };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      await this.logAudit(userId, "download", objectKey, false, context, errorMsg);
      return { ok: false, error: errorMsg };
    }
  }

  // ── List / metadata / delete ─────────────────────────────────
  async listObjects(
    userId: string,
    options: ListOptions = {},
    context: AuditContext = {}
  ): Promise<{ ok: boolean; objects?: UserObject[]; error?: string }> {
    try {
      let query = db.select().from(userObjects).where(eq(userObjects.userId, userId));

      if (options.namespace) {
        query = db
          .select()
          .from(userObjects)
          .where(and(eq(userObjects.userId, userId), eq(userObjects.namespace, options.namespace)));
      }

      if (options.prefix) {
        query = db
          .select()
          .from(userObjects)
          .where(and(eq(userObjects.userId, userId), like(userObjects.objectKey, `%${options.prefix}%`)));
      }

      const objects = await query
        .orderBy(desc(userObjects.createdAt))
        .limit(options.limit || 100)
        .offset(options.offset || 0);

      await this.logAudit(userId, "list", null, true, context);
      return { ok: true, objects };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      await this.logAudit(userId, "list", null, false, context, errorMsg);
      return { ok: false, error: errorMsg };
    }
  }

  async deleteObject(
    userId: string,
    objectKey: string,
    context: AuditContext = {}
  ): Promise<{ ok: boolean; error?: string }> {
    const record = await db
      .select()
      .from(userObjects)
      .where(and(eq(userObjects.userId, userId), eq(userObjects.objectKey, objectKey)))
      .limit(1);

    if (record.length === 0) {
      await this.logAudit(userId, "delete", objectKey, false, context, "Object not found");
      return { ok: false, error: "Object not found or access denied" };
    }

    const fileSize = record[0].fileSize;

    try {
      const res = await this.backendFetch("/assets/delete", {
        method: "DELETE",
        body: JSON.stringify({ objectKey }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Delete failed" }));
        await this.logAudit(userId, "delete", objectKey, false, context, errData.error);
        return { ok: false, error: errData.error };
      }

      await db.delete(userObjects).where(eq(userObjects.objectKey, objectKey));
      await this.updateQuota(userId, -fileSize, -1);
      await this.logAudit(userId, "delete", objectKey, true, context, undefined, fileSize);

      return { ok: true };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      await this.logAudit(userId, "delete", objectKey, false, context, errorMsg);
      return { ok: false, error: errorMsg };
    }
  }

  async copyObject(
    userId: string,
    sourceKey: string,
    destFilename: string,
    destNamespace: StorageNamespace = "assets",
    context: AuditContext = {}
  ): Promise<{ ok: boolean; newObjectKey?: string; error?: string }> {
    const record = await db
      .select()
      .from(userObjects)
      .where(and(eq(userObjects.userId, userId), eq(userObjects.objectKey, sourceKey)))
      .limit(1);

    if (record.length === 0) {
      await this.logAudit(userId, "copy", sourceKey, false, context, "Source object not found");
      return { ok: false, error: "Source object not found or access denied" };
    }

    const destKey = this.buildObjectKey(userId, destNamespace, destFilename);
    const sourceRecord = record[0];

    const quotaCheck = await this.checkQuota(userId, sourceRecord.fileSize);
    if (!quotaCheck.allowed) {
      await this.logAudit(userId, "copy", sourceKey, false, context, quotaCheck.reason, sourceRecord.fileSize, destKey);
      return { ok: false, error: quotaCheck.reason };
    }

    try {
      const res = await this.backendFetch("/assets/copy", {
        method: "POST",
        body: JSON.stringify({ sourceKey, destKey }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Copy failed" }));
        await this.logAudit(userId, "copy", sourceKey, false, context, errData.error, undefined, destKey);
        return { ok: false, error: errData.error };
      }

      const newRecord: InsertUserObject = {
        userId,
        objectKey: destKey,
        namespace: destNamespace,
        filename: destFilename,
        contentType: sourceRecord.contentType,
        fileSize: sourceRecord.fileSize,
        checksum: sourceRecord.checksum,
        tags: sourceRecord.tags || [],
        metadata: sourceRecord.metadata as Record<string, unknown>,
        isPublic: sourceRecord.isPublic,
      };

      await db.insert(userObjects).values(newRecord);
      await this.updateQuota(userId, sourceRecord.fileSize, 1);
      await this.logAudit(userId, "copy", sourceKey, true, context, undefined, sourceRecord.fileSize, destKey);

      return { ok: true, newObjectKey: destKey };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      await this.logAudit(userId, "copy", sourceKey, false, context, errorMsg, undefined, destKey);
      return { ok: false, error: errorMsg };
    }
  }

  async objectExists(userId: string, objectKey: string): Promise<{ ok: boolean; exists?: boolean; error?: string }> {
    try {
      const record = await db
        .select()
        .from(userObjects)
        .where(and(eq(userObjects.userId, userId), eq(userObjects.objectKey, objectKey)))
        .limit(1);
      return { ok: true, exists: record.length > 0 };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      return { ok: false, error: errorMsg };
    }
  }

  async getObjectMetadata(userId: string, objectKey: string): Promise<UserObject | null> {
    const records = await db
      .select()
      .from(userObjects)
      .where(and(eq(userObjects.userId, userId), eq(userObjects.objectKey, objectKey)))
      .limit(1);
    return records[0] || null;
  }

  async updateObjectMetadata(
    userId: string,
    objectKey: string,
    updates: { tags?: string[]; metadata?: Record<string, unknown>; isPublic?: boolean }
  ): Promise<{ ok: boolean; error?: string }> {
    const record = await db
      .select()
      .from(userObjects)
      .where(and(eq(userObjects.userId, userId), eq(userObjects.objectKey, objectKey)))
      .limit(1);

    if (record.length === 0) {
      return { ok: false, error: "Object not found or access denied" };
    }

    try {
      await db
        .update(userObjects)
        .set({
          ...(updates.tags && { tags: updates.tags }),
          ...(updates.metadata && { metadata: updates.metadata }),
          ...(updates.isPublic !== undefined && { isPublic: updates.isPublic }),
          updatedAt: new Date(),
        })
        .where(eq(userObjects.objectKey, objectKey));
      return { ok: true };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      return { ok: false, error: errorMsg };
    }
  }

  async getAuditLogs(userId: string, limit: number = 50): Promise<{ ok: boolean; logs?: any[]; error?: string }> {
    try {
      const logs = await db
        .select()
        .from(storageAuditLogs)
        .where(eq(storageAuditLogs.userId, userId))
        .orderBy(desc(storageAuditLogs.createdAt))
        .limit(limit);
      return { ok: true, logs };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      return { ok: false, error: errorMsg };
    }
  }
}

export const aleHermes = new AleHermesService();
