import { notifications } from "@mantine/notifications";
import { ZodType } from "zod";

export function zodResolver(schema: ZodType<any, any, any>) {
  return (values: any) => {
    const parsed = schema.safeParse(values);

    if (parsed.success) return {};

    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      console.log("Zod issue:", issue);
      notifications.show({
        title: "Error",
        message: issue.message,
        color: "red",
      });
    }

    return errors;
  };
}
