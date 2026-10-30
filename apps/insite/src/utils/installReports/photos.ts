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
    .filter((opening) => {
      if (!opening.isMandatory || opening.isNotApplicable) return false;

      const measurement = opening.measurement.trim();
      const hasPhotos = opening.photos.length > 0;

      const hasNumber = /\d+(\.\d+)?/.test(measurement);

      return !hasNumber || !hasPhotos;
    })
    .map((opening) => opening.label);
}
