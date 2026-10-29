import type { OpeningEntry, PhotoInfo } from "@/types/installReport";

export function getSafeExtension(mimeType: string): string {
  const extensions: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
    "image/heif": "heif",
  };

  return extensions[mimeType.toLowerCase()] ?? "jpg";
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;

  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message: unknown }).message);
  }

  return String(error || "An unexpected error occurred.");
}

export function createPhotoInfo(
  uri: string,
  mimeType?: string | null,
): PhotoInfo {
  return {
    uri,
    mimeType: mimeType || "image/jpeg",
  };
}

export function validateMandatoryOpenings(openings: OpeningEntry[]): string[] {
  return openings
    .filter(
      (opening) =>
        opening.isMandatory &&
        !opening.isNotApplicable &&
        (!opening.measurement.trim() ||
          !Number.isFinite(Number(opening.measurement)) ||
          opening.photos.length === 0),
    )
    .map((opening) => opening.label);
}
