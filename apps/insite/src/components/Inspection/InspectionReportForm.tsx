import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Crypto from "expo-crypto";

import { useSupabase } from "@/hooks/useSupabase";
import { useJob } from "@/context/JobContext";
import { KeyboardAwareContainer } from "@/components/Common/KeyboardAwareContainer/KeyboardAwareContainer";
import { PhotoPickerModal } from "@/components/Common/PhotoPicker/PhotoPicker";
import { PhotoGrid } from "@/components/InstallReport";
import { usePhotoUploadPipeline } from "@/hooks/usePhotoUploadPipeline";
import { invalidateFormDetailsCache } from "@/hooks/useFormDetails";
import type { PhotoInfo } from "@/types/installReport";
import type { AttachmentPayload } from "@/types/markout";
import { getErrorMessage } from "@/utils/installReports/photos";

type InspectionArea = {
  id: string;
  name: string;
  notes: string;
  is_na: boolean;
  photos: InspectionPhoto[];
};

type InspectionPhoto = PhotoInfo & {
  id?: number;
  isNew: boolean;
  storagePath?: string;
};

type AttachmentRow = {
  id: number;
  file_path: string;
  file_type: string | null;
  file_tag: string | null;
};

type InspectionDetails = {
  areas?: Array<{
    id?: string;
    name: string;
    notes?: string | null;
    is_na?: boolean;
  }>;
};

const DEFAULT_AREAS: Omit<InspectionArea, "photos">[] = [
  {
    id: "material-on-site",
    name: "Materials On-Site",
    notes: "",
    is_na: false,
  },
  { id: "kitchen", name: "Kitchen", notes: "", is_na: false },
  { id: "island", name: "Island", notes: "", is_na: false },
  { id: "main-bath", name: "Main Bath", notes: "", is_na: false },
  { id: "ensuite", name: "Ensuite", notes: "", is_na: false },
];

const GENERAL_TAG = "General Inspection";

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function InspectionReportForm() {
  const router = useRouter();
  const params = useLocalSearchParams<{ jobId?: string; id?: string }>();
  const reportId = params.id ? Number(params.id) : undefined;
  const isEditing = Number.isFinite(reportId) && !!reportId && reportId > 0;
  const parsedJobId = params.jobId ? Number(params.jobId) : undefined;
  const { supabase, user } = useSupabase();
  const { selectedJob } = useJob();
  const username =
    user?.user_metadata?.username ||
    user?.email?.split("@")[0] ||
    "Unknown User";

  const [areas, setAreas] = useState<InspectionArea[]>(
    DEFAULT_AREAS.map((area) => ({ ...area, photos: [] })),
  );
  const [generalPhotos, setGeneralPhotos] = useState<InspectionPhoto[]>([]);
  const [photoTarget, setPhotoTarget] = useState<string | "generic" | null>(
    null,
  );
  const [addAreaVisible, setAddAreaVisible] = useState(false);
  const [newAreaName, setNewAreaName] = useState("");
  const [isLoading, setIsLoading] = useState(!!isEditing);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({
    current: 0,
    total: 0,
  });
  const [startedAt] = useState(() => new Date().toISOString());
  const [originalStartedAt, setOriginalStartedAt] = useState<string | null>(
    null,
  );
  const [deletedAttachmentIds, setDeletedAttachmentIds] = useState<number[]>(
    [],
  );
  const [deletedStoragePaths, setDeletedStoragePaths] = useState<string[]>([]);
  const [reportJobId, setReportJobId] = useState<number | null>(null);
  const submissionIdRef = useRef<string | null>(null);
  const uploadedAttachmentsRef = useRef<AttachmentPayload[] | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const { uploadPhotos, commitSuccess } = usePhotoUploadPipeline();

  const jobId = isEditing ? (reportJobId ?? parsedJobId) : parsedJobId;
  const activeJob = selectedJob?.id === jobId ? selectedJob : null;

  useEffect(() => {
    if (!isEditing || !reportId) return;
    let cancelled = false;

    async function loadReport() {
      try {
        setIsLoading(true);
        const { data: report, error: reportError } = await supabase
          .schema("insite")
          .from("inspection_reports")
          .select("id, job_id, details, started_at")
          .eq("id", reportId)
          .single();
        if (reportError) throw reportError;

        const { data: attachments, error: attachmentError } = await supabase
          .from("job_attachments")
          .select("id, file_path, file_type, file_tag")
          .eq("inspection_report_id", reportId);
        if (attachmentError) throw attachmentError;

        const rows = (attachments ?? []) as AttachmentRow[];
        const photosForTag = async (
          tag: string,
        ): Promise<InspectionPhoto[]> => {
          const matching = rows.filter((row) => row.file_tag === tag);
          return Promise.all(
            matching.map(async (row) => {
              const { data, error } = await supabase.storage
                .from("job_files")
                .createSignedUrl(row.file_path, 3600);
              if (error) throw error;
              return {
                id: row.id,
                uri: data.signedUrl,
                mimeType: row.file_type || "image/jpeg",
                isNew: false,
                storagePath: row.file_path,
              };
            }),
          );
        };

        const savedDetails = (report.details ?? {}) as InspectionDetails;
        const savedAreas = savedDetails.areas ?? [];
        const loadedAreas = await Promise.all(
          (savedAreas.length
            ? savedAreas
            : DEFAULT_AREAS.map((area) => ({
                ...area,
                notes: "",
                is_na: false,
              }))
          ).map(async (area, index) => {
            const name = area.name;
            const fallbackId = DEFAULT_AREAS.find(
              (item) => item.name === name,
            )?.id;
            return {
              id:
                area.id ||
                fallbackId ||
                `custom-${index}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
              name,
              notes: area.notes ?? "",
              is_na: !!area.is_na,
              photos: await photosForTag(name),
            };
          }),
        );
        const loadedGeneral = await photosForTag(GENERAL_TAG);

        if (cancelled) return;
        setReportJobId(report.job_id);
        setOriginalStartedAt(report.started_at);
        setAreas(loadedAreas);
        setGeneralPhotos(loadedGeneral);
      } catch (error) {
        if (!cancelled)
          Alert.alert("Unable to load inspection", getErrorMessage(error));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadReport();
    return () => {
      cancelled = true;
    };
  }, [isEditing, reportId, supabase]);

  const appendPhotos = useCallback((target: string, photos: PhotoInfo[]) => {
    const additions = photos.map((photo) => ({ ...photo, isNew: true }));
    if (target === "generic") {
      setGeneralPhotos((current) => [...current, ...additions]);
      return;
    }
    setAreas((current) =>
      current.map((area) =>
        area.id === target
          ? { ...area, photos: [...area.photos, ...additions] }
          : area,
      ),
    );
  }, []);

  const removePhoto = useCallback(
    (target: string, index: number) => {
      const list =
        target === "generic"
          ? generalPhotos
          : (areas.find((area) => area.id === target)?.photos ?? []);
      const photo = list[index];
      if (photo && !photo.isNew && photo.id && photo.storagePath) {
        setDeletedAttachmentIds((current) => [...current, photo.id!]);
        setDeletedStoragePaths((current) => [...current, photo.storagePath!]);
      }
      if (target === "generic") {
        setGeneralPhotos((current) =>
          current.filter((_, photoIndex) => photoIndex !== index),
        );
      } else {
        setAreas((current) =>
          current.map((area) =>
            area.id === target
              ? {
                  ...area,
                  photos: area.photos.filter(
                    (_, photoIndex) => photoIndex !== index,
                  ),
                }
              : area,
          ),
        );
      }
    },
    [areas, generalPhotos],
  );

  const updateArea = useCallback(
    (id: string, patch: Partial<InspectionArea>) => {
      setAreas((current) =>
        current.map((area) => (area.id === id ? { ...area, ...patch } : area)),
      );
    },
    [],
  );

  const addArea = () => {
    const name = newAreaName.trim();
    if (!name) return;
    if (areas.some((area) => area.name.toLowerCase() === name.toLowerCase())) {
      Alert.alert("Area already exists", "Please use a different area name.");
      return;
    }
    setAreas((current) => [
      ...current,
      { id: Crypto.randomUUID(), name, notes: "", is_na: false, photos: [] },
    ]);
    setNewAreaName("");
    setAddAreaVisible(false);
  };

  const removeArea = (areaId: string) => {
    Alert.alert(
      "Remove Area",
      "Remove this area and its photos from the report?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            const area = areas.find((item) => item.id === areaId);
            area?.photos.forEach((photo) => {
              if (!photo.isNew && photo.id && photo.storagePath) {
                setDeletedAttachmentIds((current) => [...current, photo.id!]);
                setDeletedStoragePaths((current) => [
                  ...current,
                  photo.storagePath!,
                ]);
              }
            });
            setAreas((current) => current.filter((item) => item.id !== areaId));
          },
        },
      ],
    );
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (!jobId || (!activeJob && !isEditing)) {
      Alert.alert(
        "No Job Selected",
        "Return to the dashboard and select a job first.",
      );
      return;
    }
    if (areas.length === 0) {
      Alert.alert(
        "Inspection Areas Required",
        "Add at least one inspection area.",
      );
      return;
    }

    const newPhotos = [
      ...areas.flatMap((area) =>
        area.is_na
          ? []
          : area.photos
              .filter((photo) => photo.isNew)
              .map((photo) => ({ ...photo, tag: area.name })),
      ),
      ...generalPhotos
        .filter((photo) => photo.isNew)
        .map((photo) => ({ ...photo, tag: GENERAL_TAG })),
    ];

    setIsSubmitting(true);
    try {
      let attachments: AttachmentPayload[] = [];
      let submissionId: string | null = submissionIdRef.current;

      if (newPhotos.length > 0 || !isEditing) {
        if (uploadedAttachmentsRef.current) {
          attachments = uploadedAttachmentsRef.current;
        } else {
          const upload = await uploadPhotos(jobId, "Inspection", newPhotos, {
            category: "Inspection",
            defaultTag: "Inspection",
            filePrefix: "inspection",
            submissionId: submissionIdRef.current ?? undefined,
            concurrency: 3,
          });
          submissionId = upload.submissionId;
          submissionIdRef.current = upload.submissionId;
          uploadedAttachmentsRef.current = upload.attachments;
          attachments = upload.attachments;
        }
      }

      const details = {
        areas: areas.map(({ id, name, notes, is_na }) => ({
          id,
          name,
          notes: is_na ? "" : notes.trim(),
          is_na,
        })),
      };

      if (isEditing && reportId) {
        if (attachments.length > 0) {
          const { data: linkedAttachments, error: linkedError } = await supabase
            .from("job_attachments")
            .select("file_path")
            .eq("inspection_report_id", reportId)
            .in(
              "file_path",
              attachments.map((attachment) => attachment.file_path),
            );
          if (linkedError) throw linkedError;
          const linkedPaths = new Set(
            (linkedAttachments ?? []).map((item) => item.file_path),
          );
          attachments = attachments.filter(
            (attachment) => !linkedPaths.has(attachment.file_path),
          );
        }
        const newAttachments = attachments.map((attachment) => ({
          ...attachment,
          uploaded_by: username,
        }));
        const { error } = await supabase
          .schema("insite")
          .rpc("update_inspection_report", {
            p_report_id: reportId,
            p_details: details,
            p_deleted_attachment_ids: deletedAttachmentIds,
            p_new_attachments: newAttachments,
          });
        if (error) throw error;

        if (submissionId) await commitSuccess(submissionId);
        submissionIdRef.current = null;
        uploadedAttachmentsRef.current = null;
        if (deletedStoragePaths.length > 0) {
          const { error: storageError } = await supabase.storage
            .from("job_files")
            .remove(deletedStoragePaths);
          if (storageError) {
            console.warn(
              "Inspection report updated, but removed photos could not be deleted from storage:",
              storageError,
            );
          }
        }
        if (jobId) invalidateFormDetailsCache(jobId, "inspection_reports");
        Alert.alert("Success", `Inspection report #${reportId} was updated.`, [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        const idempotencyKey = submissionId ?? Crypto.randomUUID();
        const { data, error } = await supabase
          .schema("insite")
          .rpc("submit_inspection_report", {
            p_job_id: jobId,
            p_details: details,
            p_submitted_by: username,
            p_idempotency_key: idempotencyKey,
            p_started_at: startedAt,
            p_attachments: attachments,
          });
        if (error) throw error;
        if (data == null)
          throw new Error("The server did not return an inspection report ID.");
        if (submissionId) await commitSuccess(submissionId);
        submissionIdRef.current = null;
        uploadedAttachmentsRef.current = null;
        invalidateFormDetailsCache(jobId, "inspection_reports");
        Alert.alert("Success", `Inspection report #${data} was submitted.`, [
          { text: "OK", onPress: () => router.back() },
        ]);
      }
    } catch (error) {
      Alert.alert(
        isEditing ? "Update Failed" : "Submission Failed",
        getErrorMessage(error),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const photoPickerAreas = useMemo(
    () => areas.map((area) => ({ id: area.id, label: area.name })),
    [areas],
  );

  const title = isEditing
    ? `Edit Inspection #${reportId}`
    : "New Inspection Report";
  const canSubmit = !!jobId && (isEditing || !!activeJob);

  return (
    <View className="flex-1 bg-[#F1F1F7]">
      <View className="flex-row items-center justify-between border-b border-[#E9E8F1] bg-white px-5 py-4">
        <Pressable
          className="rounded-lg border border-[#E9E8F1] bg-[#F1EEFF] px-3 py-1.5"
          onPress={() => router.back()}
          disabled={isSubmitting}
        >
          <Text className="text-md font-medium text-[#5141A5]">← Back</Text>
        </Pressable>
        <Text className="text-lg font-bold text-[#17152D]">{title}</Text>
        <View className="w-12" />
      </View>

      <KeyboardAwareContainer ref={scrollRef} enabled={!addAreaVisible}>
        {isLoading ? (
          <View className="items-center justify-center py-12">
            <ActivityIndicator size="large" color="#6654D9" />
            <Text className="mt-3 text-sm text-[#85849A]">
              Loading inspection report...
            </Text>
          </View>
        ) : !canSubmit ? (
          <View className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <Text className="font-bold text-amber-800">No Job Selected</Text>
            <Text className="mt-1 text-sm text-amber-700">
              Return to the dashboard and select a job first.
            </Text>
          </View>
        ) : (
          <View>
            {isEditing && originalStartedAt && (
              <View className="mb-4 rounded-xl border border-[#DDD7FA] bg-[#F5F2FF] p-3">
                <Text className="text-xs font-semibold uppercase text-[#68677D]">
                  Report started
                </Text>
                <Text className="mt-1 text-sm font-semibold text-[#39306F]">
                  {formatTimestamp(originalStartedAt)}
                </Text>
              </View>
            )}

            <View className="mb-3">
              <Text className="mb-3 px-1 text-md font-bold uppercase tracking-wider text-[#85849A]">
                Inspection Areas
              </Text>
              {areas.map((area) => (
                <View
                  key={area.id}
                  className={`mb-3 rounded-xl border p-4 shadow-sm ${
                    area.is_na
                      ? "border-[#E9E8F1] bg-[#F1EEFF]"
                      : "border-[#E9E8F1] bg-white"
                  }`}
                >
                  <View className="mb-4 flex-row items-center justify-between">
                    <Text className="mr-2 flex-1 text-sm font-bold text-[#17152D]">
                      {area.name}
                    </Text>

                    <View className="flex-row items-center gap-2">
                      <Text className="text-xs font-medium text-[#85849A]">
                        N/A
                      </Text>

                      <Switch
                        value={area.is_na}
                        onValueChange={(value) =>
                          updateArea(area.id, { is_na: value })
                        }
                        disabled={isSubmitting}
                        trackColor={{ false: "#cbd5e1", true: "#64748b" }}
                        thumbColor="#ffffff"
                      />

                      {!DEFAULT_AREAS.some((item) => item.id === area.id) && (
                        <Pressable
                          onPress={() => removeArea(area.id)}
                          disabled={isSubmitting}
                          className="ml-1"
                        >
                          <Text className="text-xs font-bold text-rose-500">
                            Remove
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  </View>

                  <View className="relative">
                    <View
                      className={area.is_na ? "opacity-30" : ""}
                      pointerEvents={area.is_na ? "none" : "auto"}
                    >
                      <Text className="mb-1 text-xs font-semibold uppercase text-[#85849A]">
                        Notes
                      </Text>

                      <TextInput
                        value={area.notes}
                        onChangeText={(value) =>
                          updateArea(area.id, { notes: value })
                        }
                        editable={!isSubmitting && !area.is_na}
                        multiline
                        textAlignVertical="top"
                        placeholder={`Enter notes for ${area.name.toLowerCase()}...`}
                        placeholderTextColor="#A5A3B8"
                        className="mb-3 min-h-[88px] rounded-xl border border-[#E9E8F1] bg-[#F1F1F7] p-3 text-sm text-[#17152D]"
                      />

                      <Text className="mb-2 text-xs font-semibold uppercase text-[#85849A]">
                        Area Photos
                      </Text>

                      <PhotoGrid
                        photos={area.photos}
                        onAdd={() => setPhotoTarget(area.id)}
                        onRemove={(index) => removePhoto(area.id, index)}
                        disabled={isSubmitting || area.is_na}
                      />
                    </View>

                    {area.is_na && (
                      <View
                        pointerEvents="none"
                        className="absolute inset-0 items-center justify-center"
                      >
                        <View className="rounded-lg border border-slate-300 bg-[#F1EEFF]/95 px-4 py-2">
                          <Text className="text-sm font-semibold text-[#68677D]">
                            Not applicable
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              ))}
              <Pressable
                onPress={() => setAddAreaVisible(true)}
                disabled={isSubmitting}
                className="mb-5 items-center rounded-xl border border-indigo-200 bg-indigo-50 p-3"
              >
                <Text className="text-sm font-bold text-indigo-700">
                  + Add Area
                </Text>
              </Pressable>
            </View>

            <View className="mb-5 rounded-2xl border border-[#E9E8F1] bg-white p-4 shadow-sm">
              <Text className="mb-2 text-md font-bold uppercase tracking-wider text-[#85849A]">
                General Inspection Photos
              </Text>
              <Text className="mb-3 text-xs text-[#85849A]">
                Add overall site or inspection photos that do not belong to a
                specific area.
              </Text>
              <PhotoGrid
                photos={generalPhotos}
                onAdd={() => setPhotoTarget("generic")}
                onRemove={(index) => removePhoto("generic", index)}
                disabled={isSubmitting}
              />
            </View>

            {isSubmitting && (
              <View className="mb-3 flex-row items-center justify-center">
                <ActivityIndicator color="#6654D9" />
                <Text className="ml-2 text-sm text-[#85849A]">
                  Saving inspection photos and report...
                </Text>
              </View>
            )}

            <Pressable
              onPress={() => void handleSubmit()}
              disabled={isSubmitting || !canSubmit}
              className={`mb-6 items-center rounded-xl p-4 ${isSubmitting || !canSubmit ? "bg-slate-300" : "bg-[#5141A5]"}`}
            >
              {isSubmitting ? (
                <Text className="font-semibold text-white">Submitting...</Text>
              ) : (
                <Text className="text-lg font-bold text-white">
                  {isEditing ? "Save Changes" : "Submit Inspection Report"}
                </Text>
              )}
            </Pressable>
          </View>
        )}
      </KeyboardAwareContainer>

      <PhotoPickerModal
        target={photoTarget}
        onClose={() => setPhotoTarget(null)}
        onAddPhotos={appendPhotos}
        openings={photoPickerAreas}
      />

      <Modal
        visible={addAreaVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddAreaVisible(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/40 px-6">
          <View className="w-full rounded-2xl bg-white p-5">
            <Text className="text-lg font-bold text-[#302D4B]">
              Add Inspection Area
            </Text>
            <TextInput
              value={newAreaName}
              onChangeText={setNewAreaName}
              placeholder="Area name"
              placeholderTextColor="#A5A3B8"
              autoFocus
              className="mt-4 rounded-xl border border-[#E9E8F1] bg-[#FAFAFD] p-3 text-[#302D4B]"
            />
            <View className="mt-4 flex-row justify-end gap-3">
              <Pressable
                onPress={() => {
                  setAddAreaVisible(false);
                  setNewAreaName("");
                }}
                className="rounded-lg px-4 py-3"
              >
                <Text className="font-semibold text-[#68677D]">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={addArea}
                className="rounded-lg bg-[#5141A5] px-4 py-3"
              >
                <Text className="font-semibold text-white">Add Area</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
