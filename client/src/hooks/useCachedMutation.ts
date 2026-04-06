/**
 * useCachedMutation — React Query mutation + Puter KV write-through.
 *
 * Flow:
 *  1. Call the API mutation (writes to Neon — source of truth).
 *  2. On success: update the Puter KV cache for the related query key.
 *  3. Invalidate React Query cache so the next read is fresh.
 *
 * Neon is ALWAYS the source of truth.
 */

import { useMutation, type UseMutationResult, type QueryKey } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { invalidatePuterCache } from "./useCachedQuery";

const CACHE_PREFIX = "qc_";

function getPuter() {
  return typeof window !== "undefined" && window.puter ? window.puter : null;
}

function cacheKeyStr(queryKey: QueryKey): string {
  const raw = Array.isArray(queryKey) ? queryKey.join("|") : String(queryKey);
  return `${CACHE_PREFIX}${raw}`;
}

async function writeToKV<T>(key: string, data: T, ttlMs: number): Promise<void> {
  const puter = getPuter();
  if (!puter) return;
  try {
    const entry = { data, ts: Date.now(), ttl: ttlMs };
    await puter.kv.set(key, JSON.stringify(entry));
  } catch {
    // Non-critical
  }
}

interface UseCachedMutationOptions<TData, TVariables> {
  /** The actual API call. Must return the new data. */
  mutationFn: (variables: TVariables) => Promise<TData>;
  /** Query key(s) to invalidate and update in Puter KV after success. */
  cacheKey?: QueryKey | QueryKey[];
  /** TTL for the KV cache update. Default: 120_000 (2 min) */
  ttlMs?: number;
  /** Called after successful mutation + cache update */
  onSuccess?: (data: TData, variables: TVariables) => void;
  /** Called on error */
  onError?: (error: Error, variables: TVariables) => void;
}

/**
 * Drop-in replacement for useMutation that writes through to Puter KV.
 *
 * @example
 * const mutation = useCachedMutation({
 *   mutationFn: (data) => apiRequest("PUT", "/api/settings", data).then(r => r.json()),
 *   cacheKey: ["/api/settings"],
 *   ttlMs: 300_000,
 * });
 */
export function useCachedMutation<TData = unknown, TVariables = unknown>(
  options: UseCachedMutationOptions<TData, TVariables>,
): UseMutationResult<TData, Error, TVariables> {
  const { mutationFn, cacheKey, ttlMs = 120_000, onSuccess, onError } = options;

  return useMutation<TData, Error, TVariables>({
    mutationFn,
    onSuccess: async (data, variables) => {
      // Update Puter KV + invalidate React Query for each cache key
      if (cacheKey) {
        const keys = Array.isArray(cacheKey[0]) ? (cacheKey as QueryKey[]) : [cacheKey as QueryKey];
        for (const key of keys) {
          // Write the mutation result into Puter KV
          await writeToKV(cacheKeyStr(key), data, ttlMs);
          // Invalidate React Query so next render refetches from Neon
          queryClient.invalidateQueries({ queryKey: key as string[] });
        }
      }
      onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      // On failure, invalidate Puter cache to prevent stale data
      if (cacheKey) {
        const keys = Array.isArray(cacheKey[0]) ? (cacheKey as QueryKey[]) : [cacheKey as QueryKey];
        for (const key of keys) {
          invalidatePuterCache(key);
        }
      }
      onError?.(error, variables);
    },
  });
}

export default useCachedMutation;
