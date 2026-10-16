import { SimpleGrid, Text, TextInput } from "@mantine/core";
import { UseFormReturnType } from "@mantine/form";
import { ServiceOrderFormValues } from "@/zod/serviceorder.schema";

interface HomeOwnersInfoProps {
  form: UseFormReturnType<ServiceOrderFormValues>;
}

export default function HomeOwnersInfo({ form }: HomeOwnersInfoProps) {
  return (
    <div>
      <SimpleGrid cols={2} spacing="xs">
        <TextInput
          label="Home Owner"
          placeholder="Homeowner Name"
          {...form.getInputProps("homeowner_name")}
        />
        <TextInput
          label="Phone"
          placeholder="Homeowner Phone"
          {...form.getInputProps("homeowner_phone")}
        />
      </SimpleGrid>

      <TextInput
        label="Email"
        placeholder="Homeowner Email"
        mt="xs"
        {...form.getInputProps("homeowner_email")}
      />

      <TextInput
        label="Details"
        placeholder="Homeowner Details"
        mt="xs"
        {...form.getInputProps("homeowner_details")}
      />
    </div>
  );
}
