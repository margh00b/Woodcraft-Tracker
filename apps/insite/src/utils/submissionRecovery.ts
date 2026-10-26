import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SupabaseClient } from "@supabase/supabase-js";

const PENDING_CLEANUP_KEY = "@insite_pending_cleanups";
const RECOVERY_GRACE_PERIOD_MS = 24 * 60 * 60 * 1000;

export type SubmissionStatus = "uploading" | "committing" | "unknown";

export type PendingSubmission = {
  idempotencyKey: string;
  paths: string[];
  status: SubmissionStatus;
  updatedAt: number;
};

type Manifest = Record<string, PendingSubmission>;

async function readManifest(): Promise<Manifest> {
  const raw = await AsyncStorage.getItem(PENDING_CLEANUP_KEY);
  if (!raw) return {};

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return parsed as Manifest;
  } catch {
    throw new Error("The pending-upload recovery manifest is unreadable.");
  }
}

async function writeManifest(manifest: Manifest): Promise<void> {
  await AsyncStorage.setItem(PENDING_CLEANUP_KEY, JSON.stringify(manifest));
}

export async function createPendingSubmission(
  idempotencyKey: string,
  paths: string[],
): Promise<void> {
  const manifest = await readManifest();

  manifest[idempotencyKey] = {
    idempotencyKey,
    paths: [...new Set(paths)],
    status: "uploading",
    updatedAt: Date.now(),
  };

  await writeManifest(manifest);
}

export async function setPendingSubmissionStatus(
  idempotencyKey: string,
  status: SubmissionStatus,
): Promise<void> {
  const manifest = await readManifest();
  const entry = manifest[idempotencyKey];
  if (!entry) {
    throw new Error(
      "The pending submission is missing from the recovery manifest.",
    );
  }

  manifest[idempotencyKey] = {
    ...entry,
    status,
    updatedAt: Date.now(),
  };

  await writeManifest(manifest);
}

export async function clearPendingSubmission(
  idempotencyKey: string,
): Promise<void> {
  const manifest = await readManifest();
  if (!(idempotencyKey in manifest)) return;

  delete manifest[idempotencyKey];
  await writeManifest(manifest);
}

export async function cleanupKnownUncommittedSubmission(
  supabase: SupabaseClient,
  idempotencyKey: string,
): Promise<boolean> {
  const manifest = await readManifest();
  const entry = manifest[idempotencyKey];
  if (!entry) return true;

  const { error } = entry.paths.length
    ? await supabase.storage.from("job_files").remove(entry.paths)
    : { error: null };

  if (error) {
    console.error(
      "Failed to remove uncommitted upload objects:",
      error.message,
    );
    return false;
  }

  await clearPendingSubmission(idempotencyKey);
  return true;
}

/**
 * Run on screen/app startup. Only considers entries older than the grace period.
 * If a report exists, its Storage objects are retained and the local manifest is cleared.
 * If the lookup fails, or the entry is still recent, no files are deleted.
 */
export async function recoverOrphanedUploads(
  supabase: SupabaseClient,
): Promise<void> {
  const manifest = await readManifest();
  const now = Date.now();

  for (const [key, entry] of Object.entries(manifest)) {
    if (
      !entry ||
      !Array.isArray(entry.paths) ||
      now - entry.updatedAt < RECOVERY_GRACE_PERIOD_MS
    ) {
      continue;
    }

    const { data: report, error: lookupError } = await supabase
      .schema("insite")
      .from("install_reports")
      .select("id")
      .eq("idempotency_key", entry.idempotencyKey)
      .maybeSingle();

    if (lookupError) {
      console.warn(
        "Could not verify pending install report; retaining its files:",
        lookupError.message,
      );
      continue;
    }

    if (report) {
      await clearPendingSubmission(key);
      continue;
    }

    const { error: removeError } = entry.paths.length
      ? await supabase.storage.from("job_files").remove(entry.paths)
      : { error: null };

    if (removeError) {
      console.warn(
        "Could not clean up orphaned Storage objects:",
        removeError.message,
      );
      continue;
    }

    await clearPendingSubmission(key);
  }
}

export async function uploadTasksConcurrently<T, R>(
  tasks: T[],
  limit: number,
  workerFn: (task: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error("Upload concurrency limit must be a positive integer.");
  }

  const results = new Array<R>(tasks.length);
  let nextIndex = 0;
  let firstError: unknown;

  const worker = async () => {
    while (true) {
      const index = nextIndex++;
      if (index >= tasks.length) return;

      try {
        results[index] = await workerFn(tasks[index], index);
      } catch (error) {
        firstError ??= error;
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(limit, tasks.length) }, () => worker()),
  );

  if (firstError) {
    throw firstError instanceof Error
      ? firstError
      : new Error(String(firstError));
  }

  return results;
}
