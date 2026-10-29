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
import { useJobHydration } from "@/hooks/useJobHydration";
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
import { uploadTasksConcurrently } from "@/utils/submissionRecovery";
import { invalidateFormDetailsCache } from "@/hooks/useFormDetails";

type ExistingPhoto = PhotoInfo & {
  id?: number;
  isNew: boolean;
  storagePath?: string;
};

type EditOpening = Omit<OpeningEntry, "photos"> & {
  photos: ExistingPhoto[];
};

interface EditInstallReportProps {
  reportId: string;
}

export default function EditInstallReport({
  reportId,
}: EditInstallReportProps) {
  const router = useRouter();
  const params = useLocalSearchParams<{ jobId?: string }>();
  const { supabase, user } = useSupabase();

  const username =
    user?.user_metadata?.username ||
    user?.email?.split("@")[0] ||
    "Unknown User";

  const parsedJobId = params.jobId ? Number(params.jobId) : undefined;
  const parsedReportId = reportId ? Number(reportId) : undefined;

  const validJobId =
    parsedJobId !== undefined && Number.isFinite(parsedJobId) && parsedJobId > 0
      ? parsedJobId
      : undefined;

  const { selectedJob, isLoadingJob } = useJobHydration(validJobId);

  const [isLoadingReport, setIsLoadingReport] = useState(true);
  const [checklist, setChecklist] = useState<ChecklistState>(INITIAL_CHECKLIST);
  const [notes, setNotes] = useState("");
  const [openings, setOpenings] = useState<EditOpening[]>([]);
  const [genericPhotos, setGenericPhotos] = useState<ExistingPhoto[]>([]);
  const [deletedAttachmentIds, setDeletedAttachmentIds] = useState<number[]>(
    [],
  );
  const [deletedStoragePaths, setDeletedStoragePaths] = useState<string[]>([]);
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

  useEffect(() => {
    if (!parsedReportId || !Number.isFinite(parsedReportId)) {
      setIsLoadingReport(false);
      return;
    }

    let cancelled = false;

    async function loadExistingReport() {
      try {
        setIsLoadingReport(true);

        const { data: reportData, error: reportError } = await supabase
          .schema("insite")
          .from("install_reports")
          .select("*")
          .eq("id", parsedReportId)
          .single();

        if (reportError) throw reportError;
        if (!reportData) throw new Error("Report not found.");

        const details = reportData.details || {};
        const measurements = details.measurements || {};
        const notApplicableOpenings: string[] =
          details.notApplicableOpenings ?? [];
        const { data: attachmentsData, error: attachmentError } = await supabase
          .from("job_attachments")
          .select("*")
          .eq("install_report_id", parsedReportId);

        if (attachmentError) throw attachmentError;

        const attachments = attachmentsData || [];

        const resolvePhotos = async (tag: string): Promise<ExistingPhoto[]> => {
          const matchingAttachments = attachments.filter(
            (attachment) => attachment.file_tag === tag,
          );

          return Promise.all(
            matchingAttachments.map(async (attachment) => {
              const { data: signed, error } = await supabase.storage
                .from("job_files")
                .createSignedUrl(attachment.file_path, 3600);

              if (error) throw error;

              return {
                id: attachment.id,
                uri: signed?.signedUrl || "",
                isNew: false,
                storagePath: attachment.file_path,
                mimeType: attachment.file_type || "image/jpeg",
              };
            }),
          );
        };

        const loadedOpenings: EditOpening[] = await Promise.all(
          DEFAULT_OPENINGS.map(async (opening) => ({
            ...opening,
            measurement: String(measurements[opening.label] ?? ""),
            photos: await resolvePhotos(opening.tag),
            isNotApplicable: notApplicableOpenings.includes(opening.tag),
          })),
        );

        const defaultTags = DEFAULT_OPENINGS.map((opening) => opening.tag);

        const customTags = Array.from(
          new Set([
            ...Object.keys(measurements).filter(
              (key) => !defaultTags.includes(key),
            ),
            ...attachments
              .map((attachment) => attachment.file_tag)
              .filter(
                (tag) =>
                  tag &&
                  tag !== "General Installation" &&
                  !defaultTags.includes(tag),
              ),
          ]),
        );

        const customOpenings: EditOpening[] = await Promise.all(
          customTags.map(async (tag) => ({
            id: Crypto.randomUUID(),
            label: tag,
            tag,
            measurement: String(measurements[tag] ?? ""),
            photos: await resolvePhotos(tag),
            isMandatory: false,
            isNotApplicable: notApplicableOpenings.includes(tag),
          })),
        );

        const loadedGenericPhotos = await resolvePhotos("General Installation");

        if (cancelled) return;

        setChecklist({
          cabinets_site_cleaned: details.cabinets_site_cleaned ?? false,
          excess_material_removed: details.excess_material_removed ?? false,
          final_adjustment: details.final_adjustment ?? false,
          missing_materials_damages: details.missing_materials_damages ?? false,
        });
        setNotes(details.notes || "");
        setOpenings([...loadedOpenings, ...customOpenings]);
        setGenericPhotos(loadedGenericPhotos);
      } catch (error) {
        if (!cancelled) {
          Alert.alert("Error", getErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setIsLoadingReport(false);
        }
      }
    }

    void loadExistingReport();

    return () => {
      cancelled = true;
    };
  }, [parsedReportId, supabase]);

  const toggleChecklist = useCallback((key: ChecklistKey) => {
    setChecklist((previous) => ({
      ...previous,
      [key]: !previous[key],
    }));
  }, []);

  const updateMeasurement = useCallback((id: string, value: string) => {
    setOpenings((previous) =>
      previous.map((opening) =>
        opening.id === id ? { ...opening, measurement: value } : opening,
      ),
    );
  }, []);

  const appendPhotos = useCallback((targetId: string, photos: PhotoInfo[]) => {
    const newPhotos: ExistingPhoto[] = photos.map((photo) => ({
      ...photo,
      isNew: true,
    }));

    if (targetId === "generic") {
      setGenericPhotos((previous) => [...previous, ...newPhotos]);
      return;
    }

    setOpenings((previous) =>
      previous.map((opening) =>
        opening.id === targetId
          ? { ...opening, photos: [...opening.photos, ...newPhotos] }
          : opening,
      ),
    );
  }, []);

  const handleRemovePhoto = useCallback(
    (targetId: string, photoIndex: number) => {
      const photoList =
        targetId === "generic"
          ? genericPhotos
          : openings.find((opening) => opening.id === targetId)?.photos;

      const photo = photoList?.[photoIndex];

      if (
        photo &&
        !photo.isNew &&
        photo.id !== undefined &&
        photo.storagePath
      ) {
        setDeletedAttachmentIds((previous) => [...previous, photo.id!]);
        setDeletedStoragePaths((previous) => [...previous, photo.storagePath!]);
      }

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
                photos: opening.photos.filter(
                  (_, index) => index !== photoIndex,
                ),
              }
            : opening,
        ),
      );
    },
    [genericPhotos, openings],
  );
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
  const addCustomOpening = useCallback((label: string) => {
    const trimmedLabel = label.trim();

    if (!trimmedLabel) return;

    setOpenings((previous) => [
      ...previous,
      {
        id: Crypto.randomUUID(),
        label: trimmedLabel,
        tag: trimmedLabel,
        measurement: "",
        photos: [],
        isMandatory: false,
        isNotApplicable: false,
      },
    ]);

    setCustomModalVisible(false);
  }, []);

  const removeCustomOpening = useCallback(
    (id: string) => {
      Alert.alert(
        "Remove Opening",
        "Are you sure you want to remove this opening?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: () => {
              const opening = openings.find((item) => item.id === id);

              if (opening) {
                const existingPhotos = opening.photos.filter(
                  (photo) => !photo.isNew,
                );

                setDeletedAttachmentIds((previous) => [
                  ...previous,
                  ...existingPhotos.flatMap((photo) =>
                    photo.id !== undefined ? [photo.id] : [],
                  ),
                ]);

                setDeletedStoragePaths((previous) => [
                  ...previous,
                  ...existingPhotos.flatMap((photo) =>
                    photo.storagePath ? [photo.storagePath] : [],
                  ),
                ]);
              }

              setOpenings((previous) =>
                previous.filter((item) => item.id !== id),
              );
            },
          },
        ],
      );
    },
    [openings],
  );

  const handleUpdate = async () => {
    if (isSubmitting) return;

    if (!selectedJob || !parsedReportId) {
      Alert.alert("Error", "Missing job or report context.");
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

    const rawNewTasks = [
      ...openings.flatMap((opening) =>
        opening.photos
          .filter((photo) => photo.isNew)
          .map((photo) => ({ ...photo, tag: opening.tag })),
      ),
      ...genericPhotos
        .filter((photo) => photo.isNew)
        .map((photo) => ({
          ...photo,
          tag: "General Installation",
        })),
    ];

    const editSessionId = Crypto.randomUUID();
    const safeJobId = String(selectedJob.id);

    const newTasks: UploadTask[] = rawNewTasks.map((task, index) => {
      const extension = getSafeExtension(task.mimeType);
      const cleanTag =
        task.tag.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 60) || "photo";
      const fileName = `${cleanTag}_edit_${editSessionId}_${index}.${extension}`;

      return {
        uri: task.uri,
        mimeType: task.mimeType,
        tag: task.tag,
        index,
        fileName,
        storagePath: `${safeJobId}/Installation/${parsedReportId}/${fileName}`,
      };
    });

    setIsSubmitting(true);
    setUploadProgress({ current: 0, total: newTasks.length });

    try {
      const newAttachments: AttachmentPayload[] = await uploadTasksConcurrently(
        newTasks,
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

          return {
            file_name: task.fileName,
            file_path: task.storagePath,
            file_type: "image/jpeg",
            file_size: fileSize,
            category: "Installation",
            file_tag: task.tag,
          };
        },
      );

      if (deletedStoragePaths.length > 0) {
        const { error } = await supabase.storage
          .from("job_files")
          .remove(deletedStoragePaths);

        if (error) throw error;
      }

      if (deletedAttachmentIds.length > 0) {
        const { error } = await supabase
          .from("job_attachments")
          .delete()
          .in("id", deletedAttachmentIds);

        if (error) throw error;
      }

      if (newAttachments.length > 0) {
        const insertPayloads = newAttachments.map((attachment) => ({
          job_id: selectedJob.id,
          install_report_id: parsedReportId,
          file_name: attachment.file_name,
          file_path: attachment.file_path,
          file_type: attachment.file_type,
          file_size: attachment.file_size,
          category: attachment.category,
          file_tag: attachment.file_tag,
          uploaded_by: username,
        }));

        const { error } = await supabase
          .from("job_attachments")
          .insert(insertPayloads);

        if (error) throw error;
      }

      const measurements = openings.reduce<Record<string, string>>(
        (result, opening) => {
          result[opening.label] = opening.measurement.trim();
          return result;
        },
        {},
      );
      const notApplicableOpenings = openings
        .filter((opening) => opening.isNotApplicable)
        .map((opening) => opening.tag);
      const { error: updateError } = await supabase
        .schema("insite")
        .from("install_reports")
        .update({
          details: {
            ...checklist,
            notes: notes.trim() || null,
            measurements,
            notApplicableOpenings,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", parsedReportId);

      if (updateError) throw updateError;

      invalidateFormDetailsCache(selectedJob.id, "install_reports");

      Alert.alert(
        "Success",
        `Installation report #${parsedReportId} was successfully updated.`,
        [{ text: "OK", onPress: () => router.back() }],
      );
    } catch (error) {
      Alert.alert("Update Failed", getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = isLoadingJob || isLoadingReport;

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
          Edit Report #{parsedReportId}
        </Text>

        <View className="w-12" />
      </View>

      <KeyboardAwareContainer ref={scrollViewRef}>
        {isLoading ? (
          <View className="flex-1 items-center justify-center py-12">
            <ActivityIndicator size="large" color="#0f172a" />
            <Text className="mt-3 text-sm text-slate-500">
              Loading job and report details...
            </Text>
          </View>
        ) : !selectedJob ? (
          <View className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <Text className="mb-1 text-sm font-bold text-amber-800">
              No Job Selected
            </Text>
            <Pressable
              className="mt-2 self-start rounded-lg bg-amber-600 px-3 py-2"
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
                Uploading {uploadProgress.current} of {uploadProgress.total} new
                photos
              </Text>
            )}
          </View>
        )}

        <Pressable
          className={`p-4 rounded-xl items-center mb-6 ${
            selectedJob && !isLoading && !isSubmitting
              ? "bg-slate-900 active:bg-slate-800"
              : "bg-slate-300"
          }`}
          disabled={!selectedJob || isLoading || isSubmitting}
          onPress={() => void handleUpdate()}
        >
          {isSubmitting ? (
            <View className="flex-row items-center gap-2">
              <ActivityIndicator color="#ffffff" size="small" />
              <Text className="text-white font-semibold">
                Updating Report...
              </Text>
            </View>
          ) : (
            <Text className="text-white font-bold text-lg">Save Changes</Text>
          )}
        </Pressable>
      </KeyboardAwareContainer>

      <CustomOpeningModal
        visible={customModalVisible}
        onClose={() => setCustomModalVisible(false)}
        onAdd={addCustomOpening}
      />

      <PhotoPickerModal
        target={photoPickerTarget}
        onClose={() => setPhotoPickerTarget(null)}
        onAddPhotos={appendPhotos}
        openings={openings}
      />
    </View>
  );
}
