import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Alert,
  ActivityIndicator,
  ScrollView,
  TextInput,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSupabase } from "@/hooks/useSupabase";
import { useJobHydration } from "@/hooks/useJobHydration";
import { KeyboardAwareContainer } from "@/components/Common/KeyboardAwareContainer/KeyboardAwareContainer";
import { PhotoPickerModal } from "@/components/Common/PhotoPicker/PhotoPicker";
import { PhotoGrid } from "../PhotoGrid";
import { MarkoutNotes } from "../MarkoutNotes";
import { usePhotoUploadPipeline } from "@/hooks/usePhotoUploadPipeline";
import { invalidateFormDetailsCache } from "@/hooks/useFormDetails";
import type { PhotoInfo, ExistingPhoto } from "@/types/markout";
import { getErrorMessage } from "@/utils/installReports/photos";
import { useJob } from "@/context/JobContext";

interface EditMarkoutProps {
  reportId: string;
}

export default function EditMarkout({ reportId }: EditMarkoutProps) {
  const router = useRouter();
  const params = useLocalSearchParams<{ jobId?: string }>();
  const { supabase, user } = useSupabase();

  const username =
    user?.user_metadata?.username ||
    user?.email?.split("@")[0] ||
    "Unknown User";

  const parsedReportId = reportId ? Number(reportId) : undefined;

  const { selectedJob, setSelectedJob } = useJob();

  const [isLoadingReport, setIsLoadingReport] = useState(true);
  const [notes, setNotes] = useState("");
  const [sitesuperEmail, setSitesuperEmail] = useState("");

  useEffect(() => {
    setSitesuperEmail(selectedJob?.sales_orders?.sitesuper_email || "");
  }, [selectedJob?.id, selectedJob?.sales_orders?.sitesuper_email]);
  const [photos, setPhotos] = useState<ExistingPhoto[]>([]);
  const [deletedAttachmentIds, setDeletedAttachmentIds] = useState<number[]>(
    [],
  );
  const [deletedStoragePaths, setDeletedStoragePaths] = useState<string[]>([]);
  const [photoPickerTarget, setPhotoPickerTarget] = useState<string | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    uploadPhotos,
    commitSuccess,
    rollbackSubmission,
    isUploading,
    uploadProgress,
  } = usePhotoUploadPipeline();

  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!parsedReportId || !Number.isFinite(parsedReportId)) {
      setIsLoadingReport(false);
      return;
    }

    let cancelled = false;

    async function loadExistingMarkout() {
      try {
        setIsLoadingReport(true);

        const { data: reportData, error: reportError } = await supabase
          .schema("insite")
          .from("markouts")
          .select("*")
          .eq("id", parsedReportId)
          .single();

        if (reportError) throw reportError;
        if (!reportData) throw new Error("Markout not found.");

        const details = reportData.details || {};
        const { data: attachmentsData, error: attachmentError } = await supabase
          .from("job_attachments")
          .select("*")
          .eq("markout_id", parsedReportId);

        if (attachmentError) throw attachmentError;

        const attachments = attachmentsData || [];
        const loadedPhotos: ExistingPhoto[] = await Promise.all(
          attachments.map(async (att) => {
            let publicUrl = att.file_url;
            if (!publicUrl || !publicUrl.startsWith("http")) {
              const { data: storageData } = supabase.storage
                .from("job_files")
                .getPublicUrl(att.file_path);
              publicUrl = storageData?.publicUrl || att.file_path;
            }
            return {
              id: att.id,
              uri: publicUrl,
              mimeType: att.file_type || "image/jpeg",
              isNew: false,
              storagePath: att.file_path,
            };
          }),
        );

        if (cancelled) return;

        setNotes(details.notes || details.note || "");
        setPhotos(loadedPhotos);
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

    void loadExistingMarkout();

    return () => {
      cancelled = true;
    };
  }, [parsedReportId, supabase]);

  const handleAddPhotos = useCallback(
    (_target: string, newPhotos: PhotoInfo[]) => {
      const wrapped: ExistingPhoto[] = newPhotos.map((photo) => ({
        ...photo,
        isNew: true,
      }));
      setPhotos((previous) => [...previous, ...wrapped]);
    },
    [],
  );

  const handleRemovePhoto = useCallback(
    (photoIndex: number) => {
      const photo = photos[photoIndex];
      if (photo && !photo.isNew && photo.id !== undefined) {
        setDeletedAttachmentIds((previous) => [...previous, photo.id!]);
        if (photo.storagePath) {
          setDeletedStoragePaths((previous) => [
            ...previous,
            photo.storagePath!,
          ]);
        }
      }
      setPhotos((previous) =>
        previous.filter((_, index) => index !== photoIndex),
      );
    },
    [photos],
  );

  const handleUpdate = async () => {
    if (isSubmitting || isUploading) return;

    if (!selectedJob || !parsedReportId) {
      Alert.alert("Error", "Missing job or markout context.");
      return;
    }

    if (photos.length === 0) {
      Alert.alert("Photos Required", "A markout must have at least one photo.");
      return;
    }

    const newPhotos = photos.filter((p) => p.isNew);
    setIsSubmitting(true);
    let activeSubmissionId: string | null = null;

    try {
      let formattedNewAttachments: any[] = [];

      if (newPhotos.length > 0) {
        const { submissionId, attachments } = await uploadPhotos(
          selectedJob.id,
          "Markout",
          newPhotos.map((p) => ({ ...p, tag: "Markout" })),
          { defaultTag: "Markout", category: "Markout" },
        );

        activeSubmissionId = submissionId;

        formattedNewAttachments = attachments.map((att) => ({
          ...att,
          uploaded_by: username,
        }));
      }

      if (deletedStoragePaths.length > 0) {
        await supabase.storage.from("job_files").remove(deletedStoragePaths);
      }

      const { error: updateError } = await supabase
        .schema("insite")
        .rpc("update_markout", {
          p_markout_id: parsedReportId,
          p_details: {
            notes: notes.trim() || null,
          },
          p_sitesuper_email: sitesuperEmail?.trim() || null,
          p_deleted_attachment_ids: deletedAttachmentIds,
          p_new_attachments: formattedNewAttachments,
        });

      if (updateError) throw updateError;
      setSelectedJob({
        ...selectedJob,
        sales_orders: selectedJob.sales_orders
          ? {
              ...selectedJob.sales_orders,
              sitesuper_email: sitesuperEmail.trim() || null,
            }
          : selectedJob.sales_orders,
      });
      if (activeSubmissionId) {
        await commitSuccess(activeSubmissionId);
      }

      invalidateFormDetailsCache(selectedJob.id, "markouts");

      Alert.alert(
        "Success",
        `Markout #${parsedReportId} was successfully updated.`,
        [{ text: "OK", onPress: () => router.back() }],
      );
    } catch (error) {
      if (activeSubmissionId) {
        await rollbackSubmission(activeSubmissionId);
      }
      Alert.alert("Update Failed", getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isBusy = isSubmitting || isUploading;

  if (isLoadingReport) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color="#0f172a" />
        <Text className="mt-3 text-sm text-slate-500">Loading markout...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      <View className="flex-row items-center justify-between px-5 py-4 bg-white border-b border-slate-200">
        <Pressable
          className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200"
          onPress={() => router.back()}
          disabled={isBusy}
        >
          <Text className="text-slate-700 font-medium text-md">← Back</Text>
        </Pressable>
        <Text className="text-lg font-bold text-slate-900">
          Edit Markout #{reportId}
        </Text>
        <View className="w-12" />
      </View>
      <KeyboardAwareContainer ref={scrollViewRef}>
        <View>
          <View className="bg-white p-4 rounded-xl border border-slate-200 mb-5 shadow-sm">
            <View className="flex-row justify-between items-center mb-1">
              <Text className="text-md font-semibold text-slate-500 uppercase">
                Markout Photos
              </Text>
              <Text className="text-xs font-semibold text-slate-500">
                {photos.length} photo{photos.length === 1 ? "" : "s"}
              </Text>
            </View>
            <Text className="text-sm text-slate-500 mb-4">
              Upload or edit photos showing all markouts.
            </Text>

            <PhotoGrid
              photos={photos}
              onAdd={() => setPhotoPickerTarget("markout")}
              onRemove={handleRemovePhoto}
              disabled={isBusy}
            />
          </View>

          <MarkoutNotes value={notes} onChange={setNotes} disabled={isBusy} />
          <View className="bg-white p-4 rounded-xl border border-slate-200 mb-5 shadow-sm">
            <Text className="text-md font-semibold text-slate-500 uppercase mb-2">
              Site Supervisor Email
            </Text>

            <Text className="text-xs text-slate-500 mb-2">
              (If left blank, it will not be emailed to the site supervisor)
            </Text>

            <TextInput
              className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 text-sm"
              placeholder="Site supervisor email..."
              placeholderTextColor="#94a3b8"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isBusy}
              value={sitesuperEmail}
              onChangeText={setSitesuperEmail}
              returnKeyType="done"
            />
          </View>
          <Pressable
            className={`w-full py-4 rounded-xl items-center justify-center shadow-sm mt-2 ${
              isBusy ? "bg-slate-400" : "bg-slate-900 active:bg-slate-800"
            }`}
            onPress={handleUpdate}
            disabled={isBusy}
          >
            {isBusy ? (
              <View className="flex-row items-center">
                <ActivityIndicator color="#ffffff" size="small" />
                <Text className="text-white font-bold text-base ml-2">
                  Updating ({uploadProgress.current}/{uploadProgress.total})...
                </Text>
              </View>
            ) : (
              <Text className="text-white font-bold text-base">
                Save Changes
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAwareContainer>
      <PhotoPickerModal
        target={photoPickerTarget}
        onClose={() => setPhotoPickerTarget(null)}
        onAddPhotos={handleAddPhotos}
        openings={[{ id: "markout", label: "Markout" }]}
      />
    </View>
  );
}
