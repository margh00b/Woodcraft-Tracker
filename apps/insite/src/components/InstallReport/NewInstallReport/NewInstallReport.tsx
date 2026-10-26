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
import { useUser } from "@clerk/expo";
import * as ImagePicker from "expo-image-picker";
import * as Crypto from "expo-crypto";
import { File } from "expo-file-system";
import { useSupabase } from "@/hooks/useSupabase";
import { KeyboardAwareContainer } from "@/components/Common/KeyboardAwareContainer/KeyboardAwareContainer";
import { useJobHydration } from "@/hooks/useJobHydration";
import {
  clearPendingSubmission,
  createPendingSubmission,
  recoverOrphanedUploads,
  setPendingSubmissionStatus,
  cleanupKnownUncommittedSubmission,
  uploadTasksConcurrently,
} from "@/utils/submissionRecovery";
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

type PhotoInfo = { uri: string; mimeType: string };

type OpeningEntry = {
  id: string;
  label: string;
  tag: string;
  measurement: string;
  photos: PhotoInfo[];
  isMandatory: boolean;
};

type UploadTask = PhotoInfo & {
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

export default function NewInstallReport() {
  const router = useRouter();
  const params = useLocalSearchParams<{ jobId?: string }>();
  const supabase = useSupabase();
  const { user } = useUser();

  const parsedJobId = params.jobId ? Number(params.jobId) : undefined;
  const validJobId =
    parsedJobId !== undefined && Number.isFinite(parsedJobId) && parsedJobId > 0
      ? parsedJobId
      : undefined;
  const { selectedJob, isLoadingJob } = useJobHydration(validJobId);

  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    cabinets_site_cleaned: false,
    excess_material_removed: false,
    final_adjustment: false,
    missing_materials_damages: false,
  });
  const [notes, setNotes] = useState("");
  const [openings, setOpenings] = useState<OpeningEntry[]>(DEFAULT_OPENINGS);
  const [genericPhotos, setGenericPhotos] = useState<PhotoInfo[]>([]);
  const [customModalVisible, setCustomModalVisible] = useState(false);
  const [newOpeningName, setNewOpeningName] = useState("");
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
    (targetId: string | "generic", newPhotos: PhotoInfo[]) => {
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
                "Camera permission is required to capture photos.",
              );
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ["images"],
              quality: 0.7,
            });
            if (!result.canceled) {
              const asset = result.assets[0];
              if (asset) {
                appendPhotos(targetId, [
                  {
                    uri: asset.uri,
                    mimeType: asset.mimeType || "image/jpeg",
                  },
                ]);
              }
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

    const rawTasks = [
      ...openings.flatMap((opening) =>
        opening.photos.map((photo) => ({ ...photo, tag: opening.tag })),
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
    setUploadProgress({ current: 0, total: tasks.length });

    try {
      await createPendingSubmission(
        submissionId,
        tasks.map((task) => task.storagePath),
      );

      const attachments = await uploadTasksConcurrently(
        tasks,
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

      const measurements = openings.reduce(
        (acc, curr) => {
          acc[curr.label] = curr.measurement.trim();
          return acc;
        },
        {} as Record<string, string>,
      );

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
          },
          p_submitted_by: user?.username || user?.id || "Unknown User",
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
        {isLoadingJob && (
          <View className="py-6 items-center">
            <ActivityIndicator />
            <Text className="text-sm text-slate-500 mt-2">Loading job...</Text>
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
            Uploaded {uploadProgress.current} of {uploadProgress.total} photos
          </Text>
        )}

        <Pressable
          className={`p-4 rounded-xl items-center mb-6 ${selectedJob && !isSubmitting ? "bg-slate-900 active:bg-slate-800" : "bg-slate-300"}`}
          disabled={!selectedJob || isSubmitting}
          onPress={() => void handleSubmit()}
        >
          {isSubmitting ? (
            <View className="flex-row items-center gap-2">
              <ActivityIndicator color="#ffffff" size="small" />
              <Text className="text-white font-semibold">Submitting...</Text>
            </View>
          ) : (
            <Text className="text-white font-bold text-lg">
              Submit Final Report
            </Text>
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
