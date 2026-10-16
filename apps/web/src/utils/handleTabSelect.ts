import { UseFormReturnType } from "@mantine/form";

export const handleTabSelect = (
  e: React.KeyboardEvent<HTMLInputElement>,
  options: { value: string; label: string }[],
  path: string,
  setSearchState: (val: string) => void,
  form: UseFormReturnType<any>
) => {
  if (e.key === "Tab" && options.length === 1) {
    const match = options[0];
    form.setFieldValue(path, match.value);
    setSearchState(match.label);
  }
};
