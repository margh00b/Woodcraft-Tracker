import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";

import * as Crypto from "expo-crypto";
import { File } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

import { useSupabase } from "@/hooks/useSupabase";
import { useJob } from "@/context/JobContext";
import { KeyboardAwareContainer } from "@/components/Common/KeyboardAwareContainer/KeyboardAwareContainer";
import {
  InstallationChecklist,
  InstallationNotes,
  OpeningCard,
  PhotoGrid,
  CustomOpeningModal,
  PhotoPickerModal,
} from "@/components/InstallReport";
import {
  clearPendingSubmission,
  createPendingSubmission,
  recoverOrphanedUploads,
  setPendingSubmissionStatus,
  cleanupKnownUncommittedSubmission,
  uploadTasksConcurrently,
} from "@/utils/submissionRecovery";
import { invalidateFormDetailsCache } from "@/hooks/useFormDetails";
import {
  DEFAULT_OPENINGS,
  INITIAL_CHECKLIST,
  type ChecklistKey,
  type ChecklistState,
  type OpeningEntry,
  type PhotoInfo,
  type UploadTask,
  type AttachmentPayload,
} from "@/types/installReport";
import {
  getSafeExtension,
  getErrorMessage,
  validateMandatoryOpenings,
} from "@/utils/installReports/photos";

export default function NewInstallReport() {
  const router = useRouter();
  const params = useLocalSearchParams<{ jobId?: string }>();
  const { supabase, user } = useSupabase();

  const username =
    user?.user_metadata?.username ||
    user?.email?.split("@")[0] ||
    "Unknown User";

  const parsedJobId = params.jobId ? Number(params.jobId) : undefined;

  const validJobId =
    parsedJobId !== undefined && Number.isFinite(parsedJobId) && parsedJobId > 0
      ? parsedJobId
      : undefined;

  const { selectedJob: contextSelectedJob } = useJob();

  const selectedJob =
    contextSelectedJob?.id === validJobId ? contextSelectedJob : null;

  const [checklist, setChecklist] = useState<ChecklistState>(INITIAL_CHECKLIST);
  const [notes, setNotes] = useState("");
  const [openings, setOpenings] = useState<OpeningEntry[]>(DEFAULT_OPENINGS);
  const [genericPhotos, setGenericPhotos] = useState<PhotoInfo[]>([]);
  const [customModalVisible, setCustomModalVisible] = useState(false);
  const [photoPickerTarget, setPhotoPickerTarget] = useState<
    string | "generic" | null
  >(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({
    current: 0,
    total: 0,
  });

  const scrollViewRef = useRef<ScrollView>(null);
  const recoveryStarted = useRef(false);
  const submissionIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (recoveryStarted.current) return;

    recoveryStarted.current = true;

    recoverOrphanedUploads(supabase).catch((error) => {
      console.warn("Install report recovery could not complete:", error);
    });
  }, [supabase]);

  const toggleChecklist = (key: ChecklistKey) => {
    setChecklist((previous) => ({
      ...previous,
      [key]: !previous[key],
    }));
  };

  const updateMeasurement = (id: string, value: string) => {
    setOpenings((previous) =>
      previous.map((opening) =>
        opening.id === id ? { ...opening, measurement: value } : opening,
      ),
    );
  };

  const appendPhotos = useCallback(
    (targetId: string, newPhotos: PhotoInfo[]) => {
      if (targetId === "generic") {
        setGenericPhotos((previous) => [...previous, ...newPhotos]);
        return;
      }

      setOpenings((previous) =>
        previous.map((opening) =>
          opening.id === targetId
            ? {
                ...opening,
                photos: [...opening.photos, ...newPhotos],
              }
            : opening,
        ),
      );
    },
    [],
  );

  const handleRemovePhoto = (targetId: string, photoIndex: number) => {
    if (targetId === "generic") {
      setGenericPhotos((previous) =>
        previous.filter((_, index) => index !== photoIndex),
      );
      return;
    }

    setOpenings((previous) =>
      previous.map((opening) =>
        opening.id === targetId
          ? {
              ...opening,
              photos: opening.photos.filter((_, index) => index !== photoIndex),
            }
          : opening,
      ),
    );
  };
  const toggleOpeningNotApplicable = useCallback((id: string) => {
    setOpenings((previous) =>
      previous.map((opening) =>
        opening.id === id
          ? {
              ...opening,
              isNotApplicable: !opening.isNotApplicable,
            }
          : opening,
      ),
    );
  }, []);
  const addCustomOpening = (label: string) => {
    setOpenings((previous) => [
      ...previous,
      {
        id: Crypto.randomUUID(),
        label,
        tag: label,
        measurement: "",
        photos: [],
        isMandatory: false,
        isNotApplicable: false,
      },
    ]);

    setCustomModalVisible(false);
  };

  const removeCustomOpening = (id: string) => {
    Alert.alert(
      "Remove Opening",
      "Are you sure you want to remove this opening?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () =>
            setOpenings((previous) =>
              previous.filter((opening) => opening.id !== id),
            ),
        },
      ],
    );
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    if (!selectedJob) {
      Alert.alert("Error", "Please select a valid job on the dashboard.");
      return;
    }

    const invalidOpenings = validateMandatoryOpenings(openings);

    if (invalidOpenings.length > 0) {
      Alert.alert(
        "Missing Information",
        `Please provide a numeric measurement and at least one photo for:\n\n• ${invalidOpenings.join("\n• ")}`,
      );
      return;
    }

    const rawTasks = [
      ...openings
        .filter((opening) => !opening.isNotApplicable)
        .flatMap((opening) =>
          opening.photos.map((photo) => ({
            ...photo,
            tag: opening.tag,
          })),
        ),
      ...genericPhotos.map((photo) => ({
        ...photo,
        tag: "General Installation",
      })),
    ];

    const submissionId = submissionIdRef.current ?? Crypto.randomUUID();

    submissionIdRef.current = submissionId;

    const safeJobId = String(selectedJob.id);

    const tasks: UploadTask[] = rawTasks.map((task, index) => {
      const extension = getSafeExtension(task.mimeType);
      const cleanTag =
        task.tag.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 60) || "photo";
      const fileName = `${cleanTag}_${submissionId}_${index}.${extension}`;

      return {
        ...task,
        index,
        fileName,
        storagePath: `${safeJobId}/Installation/${submissionId}/${fileName}`,
      };
    });

    let rpcStarted = false;

    setIsSubmitting(true);
    setUploadProgress({
      current: 0,
      total: tasks.length,
    });

    try {
      await createPendingSubmission(
        submissionId,
        tasks.map((task) => task.storagePath),
      );

      const attachments = await uploadTasksConcurrently(
        tasks,
        3,
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
            throw new Error(
              `The photo for "${task.tag}" is empty or unavailable.`,
            );
          }

          if (fileSize > 5 * 1024 * 1024) {
            throw new Error(
              `The photo for "${task.tag}" is too large even after compression.`,
            );
          }

          const bytes = await localFile.bytes();

          const { error: uploadError } = await supabase.storage
            .from("job_files")
            .upload(task.storagePath, bytes, {
              contentType: "image/jpeg",
              upsert: false,
            });

          if (uploadError) {
            throw new Error(
              `Failed to upload photo for ${task.tag}: ${uploadError.message}`,
            );
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
            category: "Installation",
            file_tag: task.tag,
          };

          return attachment;
        },
      );

      const measurements = openings.reduce<Record<string, string>>(
        (result, opening) => {
          if (!opening.isNotApplicable) {
            result[opening.tag] = opening.measurement.trim();
          }

          return result;
        },
        {},
      );
      const notApplicableOpenings = openings
        .filter((opening) => opening.isNotApplicable)
        .map((opening) => opening.tag);

      await setPendingSubmissionStatus(submissionId, "committing");

      rpcStarted = true;

      const { data: reportId, error: rpcError } = await supabase
        .schema("insite")
        .rpc("submit_install_report", {
          p_job_id: selectedJob.id,
          p_details: {
            ...checklist,
            notes: notes.trim() || null,
            measurements,
            notApplicableOpenings,
          },
          p_submitted_by: username,
          p_idempotency_key: submissionId,
          p_attachments: attachments,
        });

      if (rpcError) {
        await setPendingSubmissionStatus(submissionId, "unknown");

        throw new Error(
          `The server did not confirm the report result. Your uploaded photos have been retained for safety. Retry by checking the report status first. Details: ${rpcError.message}`,
        );
      }

      if (reportId == null) {
        await setPendingSubmissionStatus(submissionId, "unknown");

        throw new Error(
          "The server returned no report ID. Uploaded photos were retained for safety.",
        );
      }

      await clearPendingSubmission(submissionId);

      submissionIdRef.current = null;

      invalidateFormDetailsCache(selectedJob.id, "install_reports");

      Alert.alert(
        "Success",
        `Installation report #${reportId} was saved with ${tasks.length} photo(s).`,
        [{ text: "OK", onPress: () => router.back() }],
      );
    } catch (error) {
      const message = getErrorMessage(error);

      if (!rpcStarted) {
        try {
          const cleaned = await cleanupKnownUncommittedSubmission(
            supabase,
            submissionId,
          );

          if (!cleaned) {
            Alert.alert(
              "Submission Failed",
              `${message}\n\nSome uploaded files could not be cleaned up. Recovery information has been retained.`,
            );
            return;
          }
        } catch (cleanupError) {
          Alert.alert(
            "Submission Failed",
            `${message}\n\nCleanup could not be verified: ${getErrorMessage(cleanupError)}. Recovery information has been retained.`,
          );
          return;
        }
      }

      Alert.alert("Submission Failed", message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-slate-50">
      <View className="flex-row items-center justify-between px-5 py-4 bg-white border-b border-slate-200">
        <Pressable
          className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200"
          onPress={() => router.back()}
          disabled={isSubmitting}
        >
          <Text className="text-slate-700 font-medium text-md">← Back</Text>
        </Pressable>

        <Text className="text-lg font-bold text-slate-900">
          New Install Report
        </Text>

        <View className="w-12" />
      </View>

      <KeyboardAwareContainer ref={scrollViewRef}>
        {!selectedJob ? (
          <View className="bg-amber-50 border border-amber-200 p-4 rounded-xl mb-5 shadow-sm">
            <Text className="text-sm font-bold text-amber-800 mb-1">
              No Job Selected
            </Text>

            <Text className="text-sm text-amber-700">
              Please return to the dashboard and select a job before creating a
              report.
            </Text>

            <Pressable
              className="bg-amber-600 py-2 px-3 rounded-lg self-start mt-3"
              onPress={() => router.back()}
            >
              <Text className="text-xs font-semibold text-white">
                ← Return to Dashboard
              </Text>
            </Pressable>
          </View>
        ) : (
          <View>
            <InstallationChecklist
              value={checklist}
              onChange={toggleChecklist}
            />

            <InstallationNotes value={notes} onChange={setNotes} />

            <View className="mb-2">
              <View className="flex-row justify-between items-center mb-3 px-1">
                <Text className="text-md font-semibold text-slate-500 uppercase">
                  Openings & Measurements
                </Text>

                <Text className="text-xs font-bold text-rose-500">
                  * Required
                </Text>
              </View>

              {openings.map((opening) => (
                <OpeningCard
                  key={opening.id}
                  opening={opening}
                  onMeasurementChange={(value) =>
                    updateMeasurement(opening.id, value)
                  }
                  onAddPhotos={() => setPhotoPickerTarget(opening.id)}
                  onRemovePhoto={(index) =>
                    handleRemovePhoto(opening.id, index)
                  }
                  onRemoveOpening={
                    DEFAULT_OPENINGS.some((item) => item.id === opening.id)
                      ? undefined
                      : () => removeCustomOpening(opening.id)
                  }
                  disabled={isSubmitting}
                  isNotApplicable={opening.isNotApplicable}
                  onToggleNotApplicable={() =>
                    toggleOpeningNotApplicable(opening.id)
                  }
                />
              ))}

              <Pressable
                onPress={() => setCustomModalVisible(true)}
                disabled={isSubmitting}
                className="bg-indigo-50 border border-indigo-200 p-3 rounded-lg items-center mb-6"
              >
                <Text className="text-indigo-700 font-bold text-sm">
                  + Add Opening / Area
                </Text>
              </Pressable>
            </View>

            <View className="bg-white p-4 rounded-xl border border-slate-200 mb-5 shadow-sm">
              <Text className="text-md font-semibold text-slate-500 uppercase mb-3">
                Installation Photos
              </Text>

              <Text className="text-xs text-slate-500 mb-3">
                Upload overall site conditions, completed overviews, or extra
                context photos here.
              </Text>

              <PhotoGrid
                photos={genericPhotos}
                onAdd={() => setPhotoPickerTarget("generic")}
                onRemove={(index) => handleRemovePhoto("generic", index)}
                disabled={isSubmitting}
              />
            </View>

            {isSubmitting && uploadProgress.total > 0 && (
              <Text className="text-xs text-slate-500 text-center mb-3">
                Uploaded {uploadProgress.current} of {uploadProgress.total}{" "}
                photos
              </Text>
            )}

            <Pressable
              className={`p-4 rounded-xl items-center mb-6 ${
                !isSubmitting
                  ? "bg-slate-900 active:bg-slate-800"
                  : "bg-slate-300"
              }`}
              disabled={isSubmitting}
              onPress={() => void handleSubmit()}
            >
              {isSubmitting ? (
                <View className="flex-row items-center gap-2">
                  <ActivityIndicator color="#ffffff" size="small" />
                  <Text className="text-white font-semibold">
                    Submitting...
                  </Text>
                </View>
              ) : (
                <Text className="text-white font-bold text-lg">
                  Submit Final Report
                </Text>
              )}
            </Pressable>
          </View>
        )}
      </KeyboardAwareContainer>

      <CustomOpeningModal
        visible={customModalVisible}
        onClose={() => setCustomModalVisible(false)}
        onAdd={addCustomOpening}
      />

      <PhotoPickerModal
        target={photoPickerTarget}
        onClose={() => setPhotoPickerTarget(null)}
        openings={openings}
        onAddPhotos={appendPhotos}
      />
    </View>
  );
}
