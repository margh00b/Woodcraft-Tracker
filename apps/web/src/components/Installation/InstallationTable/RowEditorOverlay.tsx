import {
  Table,
  Group,
  Loader,
  Center,
  Text,
  Box,
  Badge,
  Button,
  Transition,
  Select,
  Portal,
  Overlay,
  Popover,
  Stack,
  Paper,
  ActionIcon,
  TextInput,
  Modal,
  Tooltip,
} from "@mantine/core";
import {
  FaCheckCircle,
  FaFire,
  FaTimes,
  FaTruck,
  FaRegCircle,
  FaCalendarCheck,
  FaSave,
  FaExternalLinkAlt,
  FaDollarSign,
} from "react-icons/fa";
import dayjs from "dayjs";
import { DatePickerInput } from "@mantine/dates";
import { useDebouncedCallback } from "@mantine/hooks";
import { useSupabase } from "@/hooks/useSupabase";
import { notifications } from "@mantine/notifications";
import { useInstallerSearch } from "@/hooks/useInstallerSearch";
import { useState, useEffect } from "react";
import {
  Table as ReactTableInstance,
  Row,
  flexRender,
} from "@tanstack/react-table";
import { Views } from "@/types/db";
import { SiRenovate } from "react-icons/si";

type InstallationJobView = Views<"installation_table_view"> & {
  partially_shipped?: boolean;
  installer_id?: number | null;
  prod_id?: number | null;
  cabinet_color?: string | null;
};

export function RowEditorOverlay({
  data,
  rowMeta,
  table,
  onCancel,
  row,
  onSuccess,
}: {
  data: InstallationJobView;
  rowMeta: {
    top: number;
    left: number;
    width: number;
    height: number;
    cellWidths: number[];
  };
  table: ReactTableInstance<InstallationJobView>;
  onCancel: () => void;
  row: Row<InstallationJobView>;
  onSuccess: () => void;
}) {
  const { supabase } = useSupabase();
  const [formData, setFormData] = useState<Partial<InstallationJobView>>({
    ...data,
  });
  const [animate, setAnimate] = useState(false);
  const [shipPopoverOpened, setShipPopoverOpened] = useState(false);

  const [confirmModalOpened, setConfirmModalOpened] = useState(false);
  const [pendingDate, setPendingDate] = useState<string | null>(null);

  const {
    options: installerOptions,
    search: installerSearch,
    setSearch: setInstallerSearch,
    isLoading: loadingInstallers,
  } = useInstallerSearch(
    formData.installer_id ? String(formData.installer_id) : null,
  );

  useEffect(() => {
    requestAnimationFrame(() => setAnimate(true));
  }, []);

  const handleClose = () => {
    setAnimate(false);
    setTimeout(onCancel, 300);
  };

  const getDateValue = (dateVal: string | Date | null | undefined) => {
    if (!dateVal) return null;
    return dayjs(dateVal).toDate();
  };

  const checkRls = (error: any, data: any[] | null, context: string) => {
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error(
        `Update blocked: You do not have permission to update ${context}.`,
      );
    }
  };

  const updateDB = async (
    field: keyof InstallationJobView | string,
    value: any,
  ) => {
    try {
      if (!data.installation_id) return;

      if (
        [
          "wrap_date",
          "installation_date",
          "inspection_date",
          "installation_completed",
          "inspection_completed",
          "has_shipped",
          "partially_shipped",
          "installer_company",
          "installer_id",
        ].includes(field as string)
      ) {
        if (field === "installer_company") return;

        const payload = { [field]: value };

        const { error, data: returnedData } = await supabase
          .from("installation")
          .update(payload)
          .eq("installation_id", data.installation_id)
          .select();

        checkRls(error, returnedData, "this installation record");
      } else if (["ship_schedule", "ship_status"].includes(field as string)) {
        if (!data.prod_id) {
          console.error("prod_id missing from view data for job", data.job_id);
          notifications.show({
            title: "Error",
            message: "Cannot update shipping: Production ID missing.",
            color: "red",
          });
          return;
        }

        const { error, data: returnedData } = await supabase
          .from("production_schedule")
          .update({ [field]: value })
          .eq("prod_id", data.prod_id)
          .select();

        checkRls(error, returnedData, "this shipping schedule");
      }

      notifications.show({
        title: "Updated",
        message: `${field.toString().replace(/_/g, " ")} saved`,
        color: "green",
        autoClose: 2000,
      });
      onSuccess();
    } catch (err: any) {
      setFormData((prev) => ({
        ...prev,
        [field]: data[field as keyof InstallationJobView],
      }));

      notifications.show({
        title: "Update Failed",
        message: err.message,
        color: "red",
      });
    }
  };

  const debouncedUpdate = useDebouncedCallback((field: string, value: any) => {
    updateDB(field, value);
  }, 1000);

  const handleChange = (key: keyof InstallationJobView, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));

    if (
      typeof value === "string" &&
      key !== "ship_status" &&
      key !== "installer_id"
    ) {
      debouncedUpdate(key, value);
    } else {
      updateDB(key, value);
    }
  };

  const handleDateChange = (
    key: keyof InstallationJobView,
    date: Date | string | null,
  ) => {
    const val = date instanceof Date ? dayjs(date).format("YYYY-MM-DD") : date;

    setFormData((prev) => ({ ...prev, [key]: val }));
    updateDB(key, val);
  };

  const setShippingStatus = async (status: "full" | "partial" | "none") => {
    const isFull = status === "full";
    const isPartial = status === "partial";

    setFormData((prev) => ({
      ...prev,
      has_shipped: isFull,
      partially_shipped: isPartial,
    }));
    setShipPopoverOpened(false);

    try {
      const { error, data: returnedData } = await supabase
        .from("installation")
        .update({ has_shipped: isFull, partially_shipped: isPartial })
        .eq("installation_id", data.installation_id!)
        .select();

      checkRls(error, returnedData, "shipping status");

      notifications.show({
        title: "Updated",
        message: "Shipping status saved",
        color: "green",
        autoClose: 2000,
      });
      onSuccess();
    } catch (err: any) {
      setFormData((prev) => ({
        ...prev,
        has_shipped: data.has_shipped,
        partially_shipped: data.partially_shipped,
      }));

      notifications.show({
        title: "Update Failed",
        message: err.message,
        color: "red",
      });
    }
  };

  const handleShipDateConfirm = async (status: "tentative" | "confirmed") => {
    setConfirmModalOpened(false);
    const dateStr = pendingDate ? pendingDate : null;

    setFormData((prev) => ({
      ...prev,
      ship_schedule: dateStr,
      ship_status: status,
    }));

    try {
      if (!data.prod_id) {
        throw new Error("Missing Production ID");
      }

      const { error, data: returnedData } = await supabase
        .from("production_schedule")
        .update({ ship_schedule: dateStr, ship_status: status })
        .eq("prod_id", data.prod_id)
        .select();

      checkRls(error, returnedData, "shipping schedule");

      notifications.show({
        title: "Updated",
        message: "Shipping schedule & status saved",
        color: "green",
        autoClose: 2000,
      });
      onSuccess();
    } catch (err: any) {
      setFormData((prev) => ({
        ...prev,
        ship_schedule: data.ship_schedule,
        ship_status: data.ship_status,
      }));

      notifications.show({
        title: "Update Failed",
        message: err.message,
        color: "red",
      });
    }
  };

  return (
    <>
      <Modal
        opened={confirmModalOpened}
        onClose={() => setConfirmModalOpened(false)}
        title="Confirm Shipping Status"
        zIndex={3000}
        centered
        overlayProps={{
          backgroundOpacity: 0.55,
          blur: 3,
        }}
      >
        <Stack>
          <Text size="sm">
            You've selected a ship date. Is this date tentative or confirmed?
          </Text>
          <Group grow>
            <Button
              variant="light"
              color="orange"
              onClick={() => handleShipDateConfirm("tentative")}
            >
              Tentative
            </Button>
            <Button
              variant="filled"
              color="green"
              onClick={() => handleShipDateConfirm("confirmed")}
            >
              Confirmed
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Portal>
        <Overlay
          color="#000"
          opacity={animate ? 0.3 : 0}
          zIndex={200}
          blur={5}
          onClick={handleClose}
          style={{ transition: "opacity 0.3s ease" }}
        />

        <Transition
          mounted={animate}
          transition="fade"
          duration={300}
          timingFunction="ease-out"
        >
          {(styles) => (
            <Paper
              shadow="xl"
              radius={0}
              style={{
                ...styles,
                position: "fixed",
                top: rowMeta.top,
                left: rowMeta.left,
                width: rowMeta.width,
                minHeight: rowMeta.height,
                zIndex: 201,
                display: "block",
                overflow: "visible",
                backgroundColor: "white",
                padding: 0,
              }}
            >
              <Table
                withColumnBorders={false}
                horizontalSpacing={0}
                verticalSpacing={0}
                style={{
                  tableLayout: "fixed",
                  width: "100%",
                  height: "100%",
                  borderCollapse: "collapse",
                }}
              >
                <Table.Tbody>
                  <Table.Tr>
                    {table.getVisibleLeafColumns().map((col, index) => {
                      const exactWidth = rowMeta.cellWidths[index];
                      const key = col.id;

                      return (
                        <Table.Td
                          key={key}
                          style={{
                            width: exactWidth,
                            minWidth: exactWidth,
                            maxWidth: exactWidth,
                            padding: key === "select" ? 0 : "2px 4px",
                            borderRight:
                              "1px solid var(--mantine-color-gray-2)",
                            height: rowMeta.height,
                            verticalAlign: "middle",
                          }}
                        >
                          {(() => {
                            switch (key) {
                              case "actions":
                                return (
                                  <Center>
                                    <ActionIcon
                                      variant="subtle"
                                      color="violet"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(
                                          `/dashboard/installation/${row.original.job_id}`,
                                          "_blank",
                                        );
                                      }}
                                    >
                                      <FaExternalLinkAlt size={12} />
                                    </ActionIcon>
                                  </Center>
                                );

                              case "select":
                                return <Box w="100%" h="100%" />;

                              case "job_number":
                                return (
                                  <Group
                                    gap={4}
                                    pl={8}
                                    style={{ pointerEvents: "none" }}
                                  >
                                    <Text size="xs" fw={600} c="#6f00ffff">
                                      {formData.job_number}
                                    </Text>
                                    {formData.rush && (
                                      <FaFire size={12} color="red" />
                                    )}
                                    {formData.is_cod && (
                                      <Tooltip
                                        label={
                                          formData.payment_received
                                            ? "COD : Received"
                                            : "COD : Pending"
                                        }
                                      >
                                        <Badge
                                          style={{ cursor: "pointer" }}
                                          size="xs"
                                          radius="100%"
                                          styles={{
                                            root: { padding: 3, marginLeft: 3 },
                                          }}
                                          variant="gradient"
                                          gradient={
                                            formData.payment_received
                                              ? {
                                                  from: "#00470cff",
                                                  to: "#009917ff",
                                                  deg: 135,
                                                }
                                              : {
                                                  from: "#a30000ff",
                                                  to: "#d60000ff",
                                                  deg: 135,
                                                }
                                          }
                                        >
                                          <FaDollarSign
                                            size={10}
                                            color="white"
                                          />
                                        </Badge>
                                      </Tooltip>
                                    )}
                                    {formData.order_type === "Reno" && (
                                      <Tooltip label={"Reno Job"}>
                                        <Badge
                                          style={{ cursor: "pointer" }}
                                          size="xs"
                                          radius="100%"
                                          styles={{
                                            root: { padding: 3, marginLeft: 3 },
                                          }}
                                          variant="gradient"
                                          gradient={{
                                            from: "#0062a3ff",
                                            to: "#23c1ffff",
                                            deg: 135,
                                          }}
                                        >
                                          <SiRenovate size={10} color="white" />
                                        </Badge>
                                      </Tooltip>
                                    )}
                                  </Group>
                                );

                              case "wrap_date":
                                return (
                                  <DatePickerInput
                                    size="xs"
                                    w="100%"
                                    allowDeselect
                                    value={getDateValue(formData.wrap_date)}
                                    onChange={(d) =>
                                      handleDateChange("wrap_date", d)
                                    }
                                    valueFormat="YYYY-MM-DD"
                                    popoverProps={{
                                      withinPortal: true,
                                      zIndex: 300,
                                    }}
                                  />
                                );
                              case "ship_schedule":
                                return (
                                  <DatePickerInput
                                    size="xs"
                                    w="100%"
                                    allowDeselect
                                    value={getDateValue(formData.ship_schedule)}
                                    onChange={(d) => {
                                      if (d) {
                                        setPendingDate(
                                          dayjs(d).format("YYYY-MM-DD"),
                                        );
                                        setConfirmModalOpened(true);
                                      } else {
                                        handleDateChange("ship_schedule", null);
                                      }
                                    }}
                                    valueFormat="YYYY-MM-DD"
                                    popoverProps={{
                                      withinPortal: true,
                                      zIndex: 300,
                                    }}
                                  />
                                );
                              case "has_shipped":
                                const isPartial = formData.partially_shipped;
                                const isFull = formData.has_shipped;

                                return (
                                  <Center w="100%">
                                    <Popover
                                      width={200}
                                      position="bottom"
                                      withArrow
                                      shadow="md"
                                      opened={shipPopoverOpened}
                                      onChange={setShipPopoverOpened}
                                      zIndex={300}
                                    >
                                      <Popover.Target>
                                        <Badge
                                          style={{ cursor: "pointer" }}
                                          size="xs"
                                          variant="gradient"
                                          gradient={
                                            isPartial
                                              ? {
                                                  from: "orange",
                                                  to: "yellow",
                                                  deg: 90,
                                                }
                                              : isFull
                                                ? {
                                                    from: "lime",
                                                    to: "green",
                                                    deg: 90,
                                                  }
                                                : {
                                                    from: "red",
                                                    to: "#ff2c2cff",
                                                    deg: 90,
                                                  }
                                          }
                                          onClick={() =>
                                            setShipPopoverOpened((o) => !o)
                                          }
                                        >
                                          {isPartial
                                            ? "PARTIAL"
                                            : isFull
                                              ? "YES"
                                              : "NO"}
                                        </Badge>
                                      </Popover.Target>
                                      <Popover.Dropdown p={4}>
                                        <Stack gap="xs">
                                          <Text
                                            size="xs"
                                            fw={700}
                                            ta="center"
                                            c="dimmed"
                                          >
                                            Set Shipping Status
                                          </Text>
                                          <Button
                                            fullWidth
                                            size="xs"
                                            color="green"
                                            variant={
                                              isFull ? "filled" : "light"
                                            }
                                            onClick={() =>
                                              setShippingStatus("full")
                                            }
                                            leftSection={<FaCheckCircle />}
                                          >
                                            Fully Shipped
                                          </Button>
                                          <Button
                                            fullWidth
                                            size="xs"
                                            color="orange"
                                            variant={
                                              isPartial ? "filled" : "light"
                                            }
                                            onClick={() =>
                                              setShippingStatus("partial")
                                            }
                                            leftSection={<FaTruck />}
                                          >
                                            Partially Shipped
                                          </Button>
                                          <Button
                                            fullWidth
                                            size="xs"
                                            color="red"
                                            variant={
                                              !isFull && !isPartial
                                                ? "filled"
                                                : "light"
                                            }
                                            onClick={() =>
                                              setShippingStatus("none")
                                            }
                                            leftSection={<FaTimes />}
                                          >
                                            Not Shipped
                                          </Button>
                                        </Stack>
                                      </Popover.Dropdown>
                                    </Popover>
                                  </Center>
                                );
                              case "installer":
                              case "installer_company":
                                return (
                                  <Select
                                    size="xs"
                                    w="100%"
                                    placeholder="Select Installer"
                                    data={installerOptions}
                                    value={
                                      formData.installer_id
                                        ? String(formData.installer_id)
                                        : null
                                    }
                                    searchable
                                    searchValue={installerSearch}
                                    onSearchChange={setInstallerSearch}
                                    allowDeselect
                                    nothingFoundMessage={
                                      loadingInstallers
                                        ? "Loading..."
                                        : "No installers found"
                                    }
                                    onChange={(val) => {
                                      const numVal = val ? Number(val) : null;
                                      handleChange("installer_id", numVal);
                                    }}
                                    comboboxProps={{
                                      withinPortal: true,
                                      zIndex: 300,
                                      width: 300,
                                    }}
                                    rightSection={
                                      loadingInstallers ? (
                                        <Loader size={10} />
                                      ) : null
                                    }
                                  />
                                );
                              case "installation_date":
                                return (
                                  <DatePickerInput
                                    size="xs"
                                    w="100%"
                                    allowDeselect
                                    value={getDateValue(
                                      formData.installation_date,
                                    )}
                                    onChange={(d) =>
                                      handleDateChange("installation_date", d)
                                    }
                                    valueFormat="YYYY-MM-DD"
                                    popoverProps={{
                                      withinPortal: true,
                                      zIndex: 300,
                                    }}
                                  />
                                );
                              case "inspection_date":
                                return (
                                  <DatePickerInput
                                    size="xs"
                                    w="100%"
                                    allowDeselect
                                    value={getDateValue(
                                      formData.inspection_date,
                                    )}
                                    onChange={(d) =>
                                      handleDateChange("inspection_date", d)
                                    }
                                    valueFormat="YYYY-MM-DD"
                                    popoverProps={{
                                      withinPortal: true,
                                      zIndex: 300,
                                    }}
                                  />
                                );
                              case "installation_completed":
                                return (
                                  <DatePickerInput
                                    size="xs"
                                    w="100%"
                                    allowDeselect
                                    placeholder="Pending"
                                    value={getDateValue(
                                      formData.installation_completed,
                                    )}
                                    onChange={(d) =>
                                      handleDateChange(
                                        "installation_completed",
                                        d,
                                      )
                                    }
                                    valueFormat="YYYY-MM-DD"
                                    popoverProps={{
                                      withinPortal: true,
                                      zIndex: 300,
                                    }}
                                  />
                                );
                              case "inspection_completed":
                                return (
                                  <DatePickerInput
                                    size="xs"
                                    w="100%"
                                    allowDeselect
                                    placeholder="Pending"
                                    value={getDateValue(
                                      formData.inspection_completed,
                                    )}
                                    onChange={(d) =>
                                      handleDateChange(
                                        "inspection_completed",
                                        d,
                                      )
                                    }
                                    valueFormat="YYYY-MM-DD"
                                    popoverProps={{
                                      withinPortal: true,
                                      zIndex: 300,
                                    }}
                                  />
                                );

                              case "cabinet_color":
                                return (
                                  <Box
                                    fz="xs"
                                    style={{
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                      width: "100%",
                                      paddingLeft: 8,
                                    }}
                                  >
                                    <Text size="xs">
                                      {(formData as InstallationJobView)
                                        .cabinet_color ?? "—"}
                                    </Text>
                                  </Box>
                                );

                              default:
                                return (
                                  <Box
                                    fz="xs"
                                    style={{
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                      width: "100%",
                                      paddingLeft: 8,
                                    }}
                                  >
                                    {row
                                      .getVisibleCells()
                                      .find((c) => c.column.id === key)
                                      ? flexRender(
                                          row
                                            .getVisibleCells()
                                            .find((c) => c.column.id === key)!
                                            .column.columnDef.cell,
                                          row
                                            .getVisibleCells()
                                            .find((c) => c.column.id === key)!
                                            .getContext(),
                                        )
                                      : "—"}
                                  </Box>
                                );
                            }
                          })()}
                        </Table.Td>
                      );
                    })}
                  </Table.Tr>
                </Table.Tbody>
              </Table>
            </Paper>
          )}
        </Transition>
      </Portal>
    </>
  );
}
