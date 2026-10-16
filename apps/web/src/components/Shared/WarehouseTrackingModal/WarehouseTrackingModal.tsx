import { useEffect } from "react";
import {
  Modal,
  Stack,
  NumberInput,
  Textarea,
  Button,
  Group,
  LoadingOverlay,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { useSupabase } from "@/hooks/useSupabase";
import { notifications } from "@mantine/notifications";
import { useQueryClient } from "@tanstack/react-query";
import { gradients } from "@/theme";
import dayjs from "dayjs";
import { zodResolver } from "@/utils/zodResolver/zodResolver";
import { warehouseTrackingSchema } from "@/zod/warehouse_tracking.schema";

interface WarehouseTrackingModalProps {
  opened: boolean;
  onClose: () => void;
  jobId: number;
  installationId?: number;
  onSuccess?: () => void;
  initialData?: {
    dropoff_date: Date | string | null;
    pickup_date: Date | string | null;
    pallets: number | null;
    notes: string | null;
  } | null;
}

export default function WarehouseTrackingModal({
  opened,
  onClose,
  jobId,
  installationId,
  onSuccess,
  initialData,
}: WarehouseTrackingModalProps) {
  const { supabase } = useSupabase();
  const queryClient = useQueryClient();

  const form = useForm({
    initialValues: {
      dropoff_date: null as string | null,
      pickup_date: null as string | null,
      pallets: 0,
      notes: "",
    },
    validate: zodResolver(warehouseTrackingSchema),
  });

  useEffect(() => {
    if (opened) {
      if (initialData) {
        form.setValues({
          dropoff_date: initialData.dropoff_date
            ? dayjs(initialData.dropoff_date).format("YYYY-MM-DD")
            : null,
          pickup_date: initialData.pickup_date
            ? dayjs(initialData.pickup_date).format("YYYY-MM-DD")
            : null,
          pallets: initialData.pallets || 0,
          notes: initialData.notes || "",
        });
      } else {
        form.reset();
      }
    }
  }, [opened, initialData]);

  const handleSubmit = async (values: typeof form.values) => {
    try {
      const payload = {
        job_id: jobId,
        dropoff_date: values.dropoff_date || null,
        pickup_date: values.pickup_date || null,
        pallets: values.pallets,
        notes: values.notes,
      };

      const { error } = await supabase
        .from("warehouse_tracking")
        .upsert([payload], { onConflict: "job_id" });

      if (error) throw error;

      if (installationId) {
        const { error: installError } = await supabase
          .from("installation")
          .update({ in_warehouse: dayjs().format("YYYY-MM-DD HH:mm") } as any)
          .eq("installation_id", installationId);
        if (installError) throw installError;
      }

      notifications.show({
        title: "Success",
        message: "Warehouse tracking details saved successfully",
        color: "green",
      });

      queryClient.invalidateQueries({
        queryKey: ["warehouse_tracking", jobId],
      });

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (error: any) {
      console.error(error);
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Warehouse Tracking Details"
      centered
      radius="lg"
      styles={{
        title: {
          fontWeight: "bold",
        },
      }}
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <DatePickerInput
            label="Dropoff Date"
            placeholder="Dropoff date"
            clearable
            {...form.getInputProps("dropoff_date")}
            value={
              form.values.dropoff_date
                ? dayjs(form.values.dropoff_date).toDate()
                : null
            }
            onChange={(date) =>
              form.setFieldValue(
                "dropoff_date",
                date ? dayjs(date).format("YYYY-MM-DD") : null
              )
            }
          />
          <DatePickerInput
            label="Pickup Date"
            placeholder="Pickup date"
            clearable
            {...form.getInputProps("pickup_date")}
            disabled={!form.values.dropoff_date}
            value={
              form.values.pickup_date
                ? dayjs(form.values.pickup_date).toDate()
                : null
            }
            onChange={(date) =>
              form.setFieldValue(
                "pickup_date",
                date ? dayjs(date).format("YYYY-MM-DD") : null
              )
            }
            minDate={
              form.values.dropoff_date
                ? dayjs(form.values.dropoff_date).toDate()
                : undefined
            }
          />
          <NumberInput
            label="Pallets"
            placeholder="Number of pallets"
            min={0}
            {...form.getInputProps("pallets")}
          />
          <Textarea
            label="Notes"
            placeholder="Additional notes..."
            minRows={3}
            autosize
            {...form.getInputProps("notes")}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="gradient"
              gradient={gradients.primary}
            >
              Save Changes
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
