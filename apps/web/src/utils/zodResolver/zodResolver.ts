import { ZodType } from "zod";
import { notifications } from "@mantine/notifications";

export function zodResolver(schema: ZodType<any, any, any>) {
  return (values: any) => {
    const parsed = schema.safeParse(values);

    if (parsed.success) return {};

    const errors: Record<string, string> = {};

    parsed.error.issues.forEach((issue) => {
      console.log("Zod issue:", issue);
      const path = issue.path.join(".");
      errors[path] = issue.message;
    });
    if (Object.keys(errors).length > 0) {
      notifications.show({
        title: "Validation Error",
        message: "Please fix the highlighted fields.",
        color: "red",
      });
    }

    return errors;
  };
}
