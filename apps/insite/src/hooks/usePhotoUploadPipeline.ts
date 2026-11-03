import { useState, useCallback } from "react";
import * as Crypto from "expo-crypto";
import { File } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { useSupabase } from "./useSupabase";
import {
  createPendingSubmission,
  setPendingSubmissionStatus,
  clearPendingSubmission,
  cleanupKnownUncommittedSubmission,
  uploadTasksConcurrently,
} from "@/utils/submissionRecovery";
import type { PhotoInfo, AttachmentPayload } from "@/types/markout";
import { getSafeExtension } from "@/utils/installReports/photos";

export type UploadablePhoto = PhotoInfo & {
  tag?: string;
};

export interface PhotoUploadOptions {
  category?: string;
  defaultTag?: string;
  filePrefix?: string;
  submissionId?: string;
  concurrency?: number;
}

export function usePhotoUploadPipeline() {
  const { supabase } = useSupabase();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });

  const uploadPhotos = useCallback(
    async (
      jobId: number,
      subfolder: string,
      photos: UploadablePhoto[],
      options: PhotoUploadOptions = {},
    ): Promise<{ submissionId: string; attachments: AttachmentPayload[] }> => {
      const submissionId = options.submissionId ?? Crypto.randomUUID();
      const concurrency = options.concurrency ?? 3;
      const category = options.category ?? subfolder;
      const defaultTag = options.defaultTag ?? subfolder;
      const filePrefix = options.filePrefix ?? subfolder.toLowerCase();
      const safeJobId = String(jobId);

      const tasks = photos.map((photo, index) => {
        const tag = photo.tag || defaultTag;
        const extension = getSafeExtension(photo.mimeType);
        const cleanTag = tag.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 60) || "photo";
        const fileName = `${filePrefix}_${cleanTag}_${submissionId}_${index}.${extension}`;
        return {
          uri: photo.uri,
          mimeType: photo.mimeType,
          tag,
          index,
          fileName,
          storagePath: `${safeJobId}/${subfolder}/${submissionId}/${fileName}`,
        };
      });

      setIsUploading(true);
      setUploadProgress({ current: 0, total: tasks.length });

      try {
        await createPendingSubmission(
          submissionId,
          tasks.map((task) => task.storagePath),
        );

        const attachments = await uploadTasksConcurrently(
          tasks,
          concurrency,
          async (task) => {
            const context = ImageManipulator.manipulate(task.uri);
            context.resize({ width: 1280 });
            const image = await context.renderAsync();
            const manipResult = await image.saveAsync({
              compress: 0.7,
              format: SaveFormat.JPEG,
            });

            const localFile = new File(manipResult.uri);
            const fileSize = localFile.size;

            if (!Number.isFinite(fileSize) || fileSize <= 0) {
              throw new Error(`Photo #${task.index + 1} is empty or unreadable.`);
            }

            if (fileSize > 5 * 1024 * 1024) {
              throw new Error(`Photo #${task.index + 1} exceeds the 5MB size limit.`);
            }

            const bytes = await localFile.bytes();

            const { error: uploadError } = await supabase.storage
              .from("job_files")
              .upload(task.storagePath, bytes, {
                contentType: "image/jpeg",
                upsert: false,
              });

            if (uploadError) {
              throw new Error(`Failed to upload photo for ${task.tag}: ${uploadError.message}`);
            }

            setUploadProgress((previous) => ({
              ...previous,
              current: previous.current + 1,
            }));

            const attachment: AttachmentPayload = {
              file_name: task.fileName,
              file_path: task.storagePath,
              file_type: "image/jpeg",
              file_size: fileSize,
              category,
              file_tag: task.tag,
            };

            return attachment;
          },
        );

        await setPendingSubmissionStatus(submissionId, "committing");
        return { submissionId, attachments };
      } catch (error) {
        await cleanupKnownUncommittedSubmission(supabase, submissionId);
        throw error;
      } finally {
        setIsUploading(false);
      }
    },
    [supabase],
  );

  const commitSuccess = useCallback(async (submissionId: string) => {
    await clearPendingSubmission(submissionId);
  }, []);

  const rollbackSubmission = useCallback(
    async (submissionId: string) => {
      await cleanupKnownUncommittedSubmission(supabase, submissionId);
    },
    [supabase],
  );

  return {
    uploadPhotos,
    commitSuccess,
    rollbackSubmission,
    isUploading,
    uploadProgress,
  };
}
