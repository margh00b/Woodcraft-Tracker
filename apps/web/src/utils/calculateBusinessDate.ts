import dayjs from "dayjs";

export const calculateBusinessDate = (
  startDate: dayjs.Dayjs,
  days: number,
  operation: "add" | "subtract"
) => {
  let currentDate = startDate;
  let daysRemaining = days;
  while (daysRemaining > 0) {
    currentDate =
      operation === "add"
        ? currentDate.add(1, "day")
        : currentDate.subtract(1, "day");

    const dayOfWeek = currentDate.day();

    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      daysRemaining--;
    }
  }

  return currentDate.format("YYYY-MM-DD");
};
