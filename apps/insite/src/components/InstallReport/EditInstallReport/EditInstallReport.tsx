import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";

import * as ImagePicker from "expo-image-picker";
import * as Crypto from "expo-crypto";
import { File } from "expo-file-system";
import { useSupabase } from "@/hooks/useSupabase";
import { KeyboardAwareContainer } from "@/components/Common/KeyboardAwareContainer/KeyboardAwareContainer";
import { useJobHydration } from "@/hooks/useJobHydration";
import { uploadTasksConcurrently } from "@/utils/submissionRecovery";
import * as ImageManipulator from "expo-image-manipulator";
import { invalidateFormDetailsCache } from "@/hooks/useFormDetails";

const CHECKLIST_ITEMS = [
  { key: "cabinets_site_cleaned", label: "1) Cabinets & Site cleaned" },
  { key: "excess_material_removed", label: "2) Excess material removed" },
  { key: "final_adjustment", label: "3) Final Adjustment" },
  {
    key: "missing_materials_damages",
    label: "4) Report Missing Materials or damages",
  },
] as const;

type PhotoItem = {
  id?: number; // Present if it's an existing DB attachment
  uri: string; // Local URI for new pics, or signed URL for existing pics
  isNew: boolean;
  storagePath?: string;
  mimeType: string;
};

type OpeningEntry = {
  id: string;
  label: string;
  tag: string;
  measurement: string;
  photos: PhotoItem[];
  isMandatory: boolean;
};

type UploadTask = PhotoItem & {
  tag: string;
  index: number;
  storagePath: string;
  fileName: string;
};

type AttachmentPayload = {
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  category: string;
  file_tag: string;
};

const DEFAULT_OPENINGS: OpeningEntry[] = [
  {
    id: "fridge_opening",
    label: "Fridge Opening",
    tag: "Fridge Opening",
    measurement: "",
    photos: [],
    isMandatory: true,
  },
  {
    id: "range_opening",
    label: "Range Opening",
    tag: "Range Opening",
    measurement: "",
    photos: [],
    isMandatory: true,
  },
  {
    id: "dishwasher_opening",
    label: "Dishwasher Opening",
    tag: "Dishwasher Opening",
    measurement: "",
    photos: [],
    isMandatory: true,
  },
  {
    id: "otr_hoodfan_opening",
    label: "OTR/Hoodfan Opening",
    tag: "OTR/Hoodfan Opening",
    measurement: "",
    photos: [],
    isMandatory: true,
  },
];

function getSafeExtension(mimeType: string): string {
  const extensions: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
    "image/heif": "heif",
  };
  return extensions[mimeType.toLowerCase()] ?? "jpg";
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error || "An unexpected error occurred.");
}

interface EditInstallReportProps {
  reportId: string;
}

export default function EditInstallReport({
  reportId,
}: EditInstallReportProps) {
  const router = useRouter();
  const params = useLocalSearchParams<{ jobId?: string; reportId?: string }>();
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
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    cabinets_site_cleaned: false,
    excess_material_removed: false,
    final_adjustment: false,
    missing_materials_damages: false,
  });
  const [notes, setNotes] = useState("");
  const [openings, setOpenings] = useState<OpeningEntry[]>(DEFAULT_OPENINGS);
  const [genericPhotos, setGenericPhotos] = useState<PhotoItem[]>([]);

  // Track IDs of database photos removed during edit session for cleanup
  const [deletedAttachmentIds, setDeletedAttachmentIds] = useState<number[]>(
    [],
  );
  const [deletedStoragePaths, setDeletedStoragePaths] = useState<string[]>([]);

  const [customModalVisible, setCustomModalVisible] = useState(false);
  const [newOpeningName, setNewOpeningName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({
    current: 0,
    total: 0,
  });
  const scrollViewRef = useRef<ScrollView>(null);

  // 1. Fetch existing report and attachments on mount
  useEffect(() => {
    if (!parsedReportId) return;

    async function loadExistingReport() {
      try {
        setIsLoadingReport(true);

        // Fetch report record
        const { data: reportData, error: reportError } = await supabase
          .schema("insite")
          .from("install_reports")
          .select("*")
          .eq("id", parsedReportId)
          .single();

        if (reportError) throw reportError;
        if (!reportData) throw new Error("Report not found.");

        const details = reportData.details || {};
        setChecklist({
          cabinets_site_cleaned: details.cabinets_site_cleaned ?? false,
          excess_material_removed: details.excess_material_removed ?? false,
          final_adjustment: details.final_adjustment ?? false,
          missing_materials_damages: details.missing_materials_damages ?? false,
        });
        setNotes(details.notes || "");

        const measurements = details.measurements || {};

        // Fetch attachments linked to this report
        const { data: attachmentsData, error: attError } = await supabase
          .from("job_attachments")
          .select("*")
          .eq("install_report_id", parsedReportId);

        if (attError) throw attError;

        // Resolve signed URLs for default openings
        const loadedOpenings: OpeningEntry[] = [];
        for (const defOp of DEFAULT_OPENINGS) {
          const rawAtts = (attachmentsData || []).filter(
            (att) => att.file_tag === defOp.tag,
          );
          const resolvedPhotos: PhotoItem[] = [];
          for (const att of rawAtts) {
            const { data: signed } = await supabase.storage
              .from("job_files")
              .createSignedUrl(att.file_path, 3600);
            resolvedPhotos.push({
              id: att.id,
              uri: signed?.signedUrl || "",
              isNew: false,
              storagePath: att.file_path,
              mimeType: att.file_type || "image/jpeg",
            });
          }
          loadedOpenings.push({
            ...defOp,
            measurement: measurements[defOp.label] || "",
            photos: resolvedPhotos,
          });
        }

        // Handle custom openings found in measurements or attachments
        const defaultTags = DEFAULT_OPENINGS.map((d) => d.tag);
        const customTags = Array.from(
          new Set([
            ...Object.keys(measurements).filter(
              (k) => !defaultTags.includes(k),
            ),
            ...(attachmentsData || [])
              .map((a) => a.file_tag)
              .filter(
                (t) =>
                  t && t !== "General Installation" && !defaultTags.includes(t),
              ),
          ]),
        );

        const customOpeningEntries: OpeningEntry[] = [];
        for (const tag of customTags) {
          const rawAtts = (attachmentsData || []).filter(
            (att) => att.file_tag === tag,
          );
          const resolvedPhotos: PhotoItem[] = [];
          for (const att of rawAtts) {
            const { data: signed } = await supabase.storage
              .from("job_files")
              .createSignedUrl(att.file_path, 3600);
            resolvedPhotos.push({
              id: att.id,
              uri: signed?.signedUrl || "",
              isNew: false,
              storagePath: att.file_path,
              mimeType: att.file_type || "image/jpeg",
            });
          }

          customOpeningEntries.push({
            id: Crypto.randomUUID(),
            label: tag,
            tag: tag,
            measurement: measurements[tag] || "",
            photos: resolvedPhotos,
            isMandatory: true,
          });
        }

        setOpenings([...loadedOpenings, ...customOpeningEntries]);

        // Handle generic installation photos
        const genericAtts = (attachmentsData || []).filter(
          (att) => att.file_tag === "General Installation",
        );
        const resolvedGeneric: PhotoItem[] = [];
        for (const att of genericAtts) {
          const { data: signed } = await supabase.storage
            .from("job_files")
            .createSignedUrl(att.file_path, 3600);
          resolvedGeneric.push({
            id: att.id,
            uri: signed?.signedUrl || "",
            isNew: false,
            storagePath: att.file_path,
            mimeType: att.file_type || "image/jpeg",
          });
        }
        setGenericPhotos(resolvedGeneric);
      } catch (err: any) {
        Alert.alert("Error", getErrorMessage(err));
      } finally {
        setIsLoadingReport(false);
      }
    }

    loadExistingReport();
  }, [parsedReportId, supabase]);

  const toggleChecklist = (key: string) => {
    setChecklist((previous) => ({ ...previous, [key]: !previous[key] }));
  };

  const updateMeasurement = (id: string, value: string) => {
    setOpenings((previous) =>
      previous.map((opening) =>
        opening.id === id ? { ...opening, measurement: value } : opening,
      ),
    );
  };

  const appendPhotos = useCallback(
    (targetId: string | "generic", newPhotos: PhotoItem[]) => {
      if (targetId === "generic") {
        setGenericPhotos((previous) => [...previous, ...newPhotos]);
      } else {
        setOpenings((previous) =>
          previous.map((opening) =>
            opening.id === targetId
              ? { ...opening, photos: [...opening.photos, ...newPhotos] }
              : opening,
          ),
        );
      }
    },
    [],
  );

  const handlePickPhotos = async (targetId: string | "generic") => {
    Alert.alert("Add Photos", "Choose a photo source:", [
      {
        text: "Camera",
        onPress: () => {
          void (async () => {
            const permission =
              await ImagePicker.requestCameraPermissionsAsync();
            if (!permission.granted) {
              Alert.alert(
                "Permission Required",
                "Camera permission is required.",
              );
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ["images"],
              quality: 0.7,
            });
            if (!result.canceled && result.assets[0]) {
              appendPhotos(targetId, [
                {
                  uri: result.assets[0].uri,
                  isNew: true,
                  mimeType: result.assets[0].mimeType || "image/jpeg",
                },
              ]);
            }
          })().catch((error) =>
            Alert.alert("Photo Error", getErrorMessage(error)),
          );
        },
      },
      {
        text: "Photo Library",
        onPress: () => {
          void (async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ["images"],
              quality: 0.7,
              allowsMultipleSelection: true,
            });
            if (!result.canceled) {
              appendPhotos(
                targetId,
                result.assets.map((asset) => ({
                  uri: asset.uri,
                  isNew: true,
                  mimeType: asset.mimeType || "image/jpeg",
                })),
              );
            }
          })().catch((error) =>
            Alert.alert("Photo Error", getErrorMessage(error)),
          );
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleRemovePhoto = (
    targetId: string | "generic",
    photoIndex: number,
  ) => {
    const photoList =
      targetId === "generic"
        ? genericPhotos
        : openings.find((o) => o.id === targetId)?.photos;
    const targetPhoto = photoList?.[photoIndex];

    if (
      targetPhoto &&
      !targetPhoto.isNew &&
      targetPhoto.id &&
      targetPhoto.storagePath
    ) {
      setDeletedAttachmentIds((prev) => [...prev, targetPhoto.id!]);
      setDeletedStoragePaths((prev) => [...prev, targetPhoto.storagePath!]);
    }

    if (targetId === "generic") {
      setGenericPhotos((previous) =>
        previous.filter((_, index) => index !== photoIndex),
      );
    } else {
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
    }
  };

  const addCustomOpening = () => {
    const label = newOpeningName.trim();
    if (!label) {
      Alert.alert("Error", "Please enter a valid name for the opening.");
      return;
    }

    setOpenings((previous) => [
      ...previous,
      {
        id: Crypto.randomUUID(),
        label,
        tag: label,
        measurement: "",
        photos: [],
        isMandatory: true,
      },
    ]);
    setNewOpeningName("");
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
          onPress: () => {
            const openingToRemove = openings.find((o) => o.id === id);
            if (openingToRemove) {
              const existingPhotos = openingToRemove.photos.filter(
                (p) => !p.isNew,
              );
              setDeletedAttachmentIds((prev) => [
                ...prev,
                ...existingPhotos.map((p) => p.id!),
              ]);
              setDeletedStoragePaths((prev) => [
                ...prev,
                ...existingPhotos.map((p) => p.storagePath!),
              ]);
            }
            setOpenings((previous) =>
              previous.filter((opening) => opening.id !== id),
            );
          },
        },
      ],
    );
  };

  const handleUpdate = async () => {
    if (isSubmitting) return;
    if (!selectedJob || !parsedReportId) {
      Alert.alert("Error", "Missing job or report context.");
      return;
    }

    const invalidOpenings = openings.filter(
      (opening) =>
        opening.isMandatory &&
        (!opening.measurement.trim() ||
          !Number.isFinite(Number(opening.measurement)) ||
          opening.photos.length === 0),
    );

    if (invalidOpenings.length > 0) {
      Alert.alert(
        "Missing Information",
        `Please provide a numeric measurement and at least one photo for:\n\n• ${invalidOpenings.map((opening) => opening.label).join("\n• ")}`,
      );
      return;
    }

    const rawNewTasks = [
      ...openings.flatMap((opening) =>
        opening.photos
          .filter((p) => p.isNew)
          .map((photo) => ({ ...photo, tag: opening.tag })),
      ),
      ...genericPhotos
        .filter((p) => p.isNew)
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
        ...task,
        index,
        fileName,
        storagePath: `${safeJobId}/Installation/${parsedReportId}/${fileName}`,
      };
    });

    setIsSubmitting(true);
    setUploadProgress({ current: 0, total: newTasks.length });

    try {
      // 1. Upload newly added photos concurrently using stable manipulateAsync
      const newAttachments = await uploadTasksConcurrently(
        newTasks,
        3,
        async (task) => {
          const manipResult = await ImageManipulator.manipulateAsync(
            task.uri,
            [{ resize: { width: 1280 } }],
            { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
          );

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

      // 2. Clean up removed files from Storage and database
      if (deletedStoragePaths.length > 0) {
        await supabase.storage.from("job_files").remove(deletedStoragePaths);
      }
      if (deletedAttachmentIds.length > 0) {
        await supabase
          .from("job_attachments")
          .delete()
          .in("id", deletedAttachmentIds);
      }

      // 3. Insert newly uploaded photo attachments linked to this report ID
      if (newAttachments.length > 0) {
        const insertPayloads = newAttachments.map((att) => ({
          job_id: selectedJob.id,
          install_report_id: parsedReportId,
          file_name: att.file_name,
          file_path: att.file_path,
          file_type: att.file_type,
          file_size: att.file_size,
          category: att.category,
          file_tag: att.file_tag,
          uploaded_by: username,
        }));

        const { error: insertErr } = await supabase
          .from("job_attachments")
          .insert(insertPayloads);
        if (insertErr) throw insertErr;
      }

      // 4. Update the report record itself
      const measurements = openings.reduce<Record<string, string>>(
        (result, opening) => {
          result[opening.label] = opening.measurement.trim();
          return result;
        },
        {},
      );

      const { error: updateErr } = await supabase
        .schema("insite")
        .from("install_reports")
        .update({
          details: {
            ...checklist,
            notes: notes.trim() || null,
            measurements,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", parsedReportId);

      if (updateErr) throw updateErr;

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
        {(isLoadingJob || isLoadingReport) && (
          <View className="py-6 items-center">
            <ActivityIndicator />
            <Text className="text-sm text-slate-500 mt-2">
              Loading report details...
            </Text>
          </View>
        )}

        {!selectedJob && !isLoadingJob && (
          <View className="bg-amber-50 border border-amber-200 p-4 rounded-xl mb-5 shadow-sm">
            <Text className="text-sm font-bold text-amber-800 mb-1">
              No Job Selected
            </Text>
            <Pressable
              className="bg-amber-600 py-2 px-3 rounded-lg self-start mt-2"
              onPress={() => router.back()}
            >
              <Text className="text-xs font-semibold text-white">
                ← Return to Dashboard
              </Text>
            </Pressable>
          </View>
        )}

        <View className="mb-5">
          <Text className="text-md font-semibold text-slate-500 uppercase mb-3 px-1">
            Installation Checklist
          </Text>
          {CHECKLIST_ITEMS.map((item) => {
            const checked = checklist[item.key] ?? false;
            return (
              <Pressable
                key={item.key}
                onPress={() => toggleChecklist(item.key)}
                className="flex-row items-center bg-white p-4 rounded-xl border border-slate-200 mb-2.5 shadow-sm active:bg-slate-50"
              >
                <View
                  className={`w-5 h-5 rounded-md border items-center justify-center mr-3 ${checked ? "bg-slate-900 border-slate-900" : "border-slate-300 bg-slate-50"}`}
                >
                  {checked && (
                    <Text className="text-white text-xs font-bold">✓</Text>
                  )}
                </View>
                <Text className="flex-1 text-sm font-medium text-slate-800">
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View className="bg-white p-4 rounded-xl border border-slate-200 mb-5 shadow-sm">
          <Text className="text-md font-semibold text-slate-500 uppercase mb-2">
            Installation Notes
          </Text>
          <TextInput
            className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 text-sm h-24"
            placeholder="Document any modifications, missing materials, or site notes..."
            placeholderTextColor="#94a3b8"
            multiline
            textAlignVertical="top"
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        <View className="mb-2">
          <View className="flex-row justify-between items-center mb-3 px-1">
            <Text className="text-md font-semibold text-slate-500 uppercase">
              Openings & Measurements
            </Text>
            <Text className="text-xs font-bold text-rose-500">* Required</Text>
          </View>

          {openings.map((opening) => (
            <View
              key={opening.id}
              className="bg-white p-4 rounded-xl border border-slate-200 mb-4 shadow-sm"
            >
              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-sm font-bold text-slate-900">
                  {opening.label}
                  {opening.isMandatory && (
                    <Text className="text-rose-500"> *</Text>
                  )}
                </Text>
                {!DEFAULT_OPENINGS.some((item) => item.id === opening.id) && (
                  <Pressable onPress={() => removeCustomOpening(opening.id)}>
                    <Text className="text-xs font-bold text-rose-500">
                      Remove
                    </Text>
                  </Pressable>
                )}
              </View>

              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 text-sm mb-3"
                placeholder="Enter exact measurement (e.g., 36.5)"
                placeholderTextColor="#94a3b8"
                keyboardType="decimal-pad"
                value={opening.measurement}
                onChangeText={(value) => updateMeasurement(opening.id, value)}
              />

              <View className="flex-row flex-wrap gap-2">
                {opening.photos.map((photo, index) => (
                  <View
                    key={`${photo.uri}-${index}`}
                    className="relative w-20 h-20"
                  >
                    <Image
                      source={{ uri: photo.uri }}
                      className="w-full h-full rounded-md bg-slate-100"
                      resizeMode="cover"
                    />
                    <Pressable
                      onPress={() => handleRemovePhoto(opening.id, index)}
                      className="absolute -top-2 -right-2 bg-rose-500 w-6 h-6 rounded-full items-center justify-center border-2 border-white"
                    >
                      <Text className="text-white text-xs font-bold">×</Text>
                    </Pressable>
                  </View>
                ))}
                <Pressable
                  onPress={() => void handlePickPhotos(opening.id)}
                  className="w-20 h-20 border-2 border-dashed border-slate-300 bg-slate-50 rounded-md items-center justify-center active:bg-slate-100"
                >
                  <Text className="text-slate-400 text-2xl font-light">+</Text>
                </Pressable>
              </View>
            </View>
          ))}

          <Pressable
            onPress={() => setCustomModalVisible(true)}
            className="bg-indigo-50 border border-indigo-200 p-3 rounded-lg items-center mb-6"
          >
            <Text className="text-indigo-700 font-bold text-sm">
              + Add Custom Opening / Area
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
          <View className="flex-row flex-wrap gap-2">
            {genericPhotos.map((photo, index) => (
              <View
                key={`${photo.uri}-${index}`}
                className="relative w-20 h-20"
              >
                <Image
                  source={{ uri: photo.uri }}
                  className="w-full h-full rounded-md bg-slate-100"
                  resizeMode="cover"
                />
                <Pressable
                  onPress={() => handleRemovePhoto("generic", index)}
                  className="absolute -top-2 -right-2 bg-rose-500 w-6 h-6 rounded-full items-center justify-center border-2 border-white"
                >
                  <Text className="text-white text-xs font-bold">×</Text>
                </Pressable>
              </View>
            ))}
            <Pressable
              onPress={() => void handlePickPhotos("generic")}
              className="w-20 h-20 border-2 border-dashed border-slate-300 bg-slate-50 rounded-md items-center justify-center active:bg-slate-100"
            >
              <Text className="text-slate-400 text-2xl font-light">+</Text>
            </Pressable>
          </View>
        </View>

        {isSubmitting && uploadProgress.total > 0 && (
          <Text className="text-xs text-slate-500 text-center mb-3">
            Uploading {uploadProgress.current} of {uploadProgress.total} new
            photos
          </Text>
        )}

        <Pressable
          className={`p-4 rounded-xl items-center mb-6 ${selectedJob && !isSubmitting ? "bg-slate-900 active:bg-slate-800" : "bg-slate-300"}`}
          disabled={!selectedJob || isSubmitting}
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

      <Modal
        visible={customModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCustomModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-center px-6">
          <View className="bg-white p-5 rounded-2xl shadow-xl">
            <Text className="text-lg font-bold text-slate-900 mb-2">
              New Opening / Area
            </Text>
            <Text className="text-sm text-slate-500 mb-4">
              Enter the name of the new opening (e.g., "Prep Sink", "Wine
              Cooler").
            </Text>
            <TextInput
              className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 text-sm mb-5"
              placeholder="Area Name"
              placeholderTextColor="#94a3b8"
              value={newOpeningName}
              onChangeText={setNewOpeningName}
              autoFocus
            />
            <View className="flex-row justify-end gap-3">
              <Pressable
                onPress={() => setCustomModalVisible(false)}
                className="px-4 py-2 rounded-lg"
              >
                <Text className="text-slate-500 font-bold">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={addCustomOpening}
                className="bg-slate-900 px-4 py-2 rounded-lg"
              >
                <Text className="text-white font-bold">Add Area</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
