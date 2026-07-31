"use client";

import { useState, useMemo } from "react";
import {
  Paper,
  Group,
  Text,
  Button,
  Stack,
  Title,
  ThemeIcon,
  Container,
  Center,
  Loader,
  TextInput,
  Table,
  ScrollArea,
  Badge,
  Select,
  Pagination,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import {
  FaFileInvoice,
  FaCalendarAlt,
  FaFileExcel,
  FaSearch,
  FaFilter,
  FaTimes,
} from "react-icons/fa";
import dayjs from "dayjs";
import { colors, gradients } from "@/theme";
import { exportToExcel } from "@/utils/exportToExcel";
import {
  useBuilderSummaryReport,
  useBuilderSummaryExport,
  BuilderSummaryParams,
  BuilderSummaryExcelParams,
} from "@/hooks/useBuilderSummaryReport";
import { useClientSearch } from "@/hooks/useClientSearch";
import "@mantine/dates/styles.css";

export default function BuilderSummaryReport() {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedClientName, setSelectedClientName] = useState<string>("");

  const [shipDateRange, setShipDateRange] = useState<
    [Date | null, Date | null]
  >([null, null]);
  const [creationDateRange, setCreationDateRange] = useState<
    [Date | null, Date | null]
  >([null, null]);
  const [shipStatusFilter, setShipStatusFilter] = useState<string | null>(null);

  const {
    options: clientOptions,
    isLoading: clientsLoading,
    setSearch: setClientSearch,
    search: clientSearch,
  } = useClientSearch(selectedClientId);

  const selectData = useMemo(() => {
    const items: any[] = [...clientOptions];

    if (items.length === 0) {
      if (clientsLoading) {
        items.push({
          value: "STATUS_SEARCHING",
          label: "Searching...",
          disabled: true,
        });
      } else {
        items.push({
          value: "STATUS_NOTHING_FOUND",
          label: "No matching clients found.",
          disabled: true,
        });
      }
    }
    return items;
  }, [clientOptions, clientsLoading]);

  const [queryParams, setQueryParams] = useState<BuilderSummaryParams>({
    builderName: undefined,
    shipDateStart: null,
    shipDateEnd: null,
    creationDateStart: null,
    creationDateEnd: null,
    shipStatus: null,
    page: 0,
    pageSize: 30,
  });

  const {
    data: queryResult,
    isLoading,
    isError,
    error,
    refetch,
  } = useBuilderSummaryReport(queryParams);

  const reportData = queryResult?.data || [];
  const totalCount = queryResult?.count || 0;
  const totalPages = Math.ceil(totalCount / queryParams.pageSize);

  const exportParams: BuilderSummaryExcelParams = useMemo(
    () => ({
      builderName: queryParams.builderName,
      shipDateStart: queryParams.shipDateStart,
      shipDateEnd: queryParams.shipDateEnd,
      creationDateStart: queryParams.creationDateStart,
      creationDateEnd: queryParams.creationDateEnd,
      shipStatus: queryParams.shipStatus,
    }),
    [queryParams],
  );

  const { fetchExportData } = useBuilderSummaryExport(exportParams);
  const [exportLoading, setExportLoading] = useState(false);

  const handleApplyFilters = () => {
    setQueryParams({
      builderName: selectedClientName || undefined,
      shipDateStart: shipDateRange[0],
      shipDateEnd: shipDateRange[1],
      creationDateStart: creationDateRange[0],
      creationDateEnd: creationDateRange[1],
      shipStatus: (shipStatusFilter as BuilderSummaryParams["shipStatus"]) || null,
      page: 0,
      pageSize: 30,
    });
  };

  const handleClearFilters = () => {
    setSelectedClientId(null);
    setSelectedClientName("");
    setClientSearch("");
    setShipDateRange([null, null]);
    setCreationDateRange([null, null]);
    setShipStatusFilter(null);
    setQueryParams({
      builderName: undefined,
      shipDateStart: null,
      shipDateEnd: null,
      creationDateStart: null,
      creationDateEnd: null,
      shipStatus: null,
      page: 0,
      pageSize: 30,
    });
  };

  const handlePageChange = (newPage: number) => {
    setQueryParams((prev) => ({ ...prev, page: newPage - 1 }));
  };

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const allData = await fetchExportData();
      if (!allData || allData.length === 0) {
        setExportLoading(false);
        return;
      }

      const excelData = allData.map((item) => {
        let shipStatus = "Not Shipped";
        if (item.has_shipped) shipStatus = "Shipped";
        else if (item.partially_shipped) shipStatus = "Partially Shipped";

        return {
          "Job #": item.job_number || "",
          Address: item.site_address || "",
          "Order Date": item.created_at
            ? dayjs(item.created_at).format("YYYY-MM-DD")
            : "-",
          "Placement Date": item.placement_date
            ? dayjs(item.placement_date).format("YYYY-MM-DD")
            : "-",
          "Ship Status": shipStatus,
          "Shipping Date": item.ship_schedule
            ? dayjs(item.ship_schedule).format("YYYY-MM-DD")
            : "-",
          "Ship Date Status": item.ship_status || "-",
        };
      });

      let builderHeader = "All Builders";
      if (queryParams.builderName)
        builderHeader = `Builder: ${queryParams.builderName}`;

      let dateRangeStr = "All Ship Dates";
      if (queryParams.shipDateStart || queryParams.shipDateEnd) {
        const start = queryParams.shipDateStart
          ? dayjs(queryParams.shipDateStart).format("YYYY-MM-DD")
          : "Start";
        const end = queryParams.shipDateEnd
          ? dayjs(queryParams.shipDateEnd).format("YYYY-MM-DD")
          : "End";
        dateRangeStr = `Ship Date: ${start} to ${end}`;
      }

      const customHeaders = [[builderHeader, dateRangeStr, "", "", "", "", ""]];

      exportToExcel(excelData, "Builder_Summary_Report", {
        customHeaders,
        merges: [
          { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
          { s: { r: 0, c: 2 }, e: { r: 0, c: 6 } },
        ],
      });
    } catch (e) {
      console.error(e);
    } finally {
      setExportLoading(false);
    }
  };

  const rows = reportData?.map((item) => {
    let shipStatusColor = "gray";
    let shipStatusText = "Not Shipped";
    if (item.has_shipped) {
      shipStatusColor = "green";
      shipStatusText = "Shipped";
    } else if (item.partially_shipped) {
      shipStatusColor = "yellow";
      shipStatusText = "Partially Shipped";
    }

    return (
      <Table.Tr key={item.job_number}>
        <Table.Td>{item.job_number}</Table.Td>
        {}
        <Table.Td>
          <Text size="sm" truncate>
            {item.site_address}
          </Text>
        </Table.Td>
        <Table.Td>
          {item.created_at ? dayjs(item.created_at).format("YYYY-MM-DD") : "-"}
        </Table.Td>
        <Table.Td>
          {item.placement_date
            ? dayjs(item.placement_date).format("YYYY-MM-DD")
            : "-"}
        </Table.Td>
        <Table.Td>
          <Badge color={shipStatusColor} variant="light">
            {shipStatusText}
          </Badge>
        </Table.Td>
        <Table.Td>
          {item.ship_schedule
            ? dayjs(item.ship_schedule).format("YYYY-MM-DD")
            : "-"}
        </Table.Td>
        <Table.Td>{item.ship_status}</Table.Td>
      </Table.Tr>
    );
  });

  return (
    <Container size="100%" p="md">
      <Stack gap={0}>
        <Paper p="md" radius="md" shadow="sm" bg="white">
          <Group justify="space-between" align="flex-end" wrap="wrap">
            <Group>
              <ThemeIcon
                size={50}
                radius="md"
                variant="gradient"
                gradient={gradients.primary}
              >
                <FaFileInvoice size={26} />
              </ThemeIcon>
              <Stack gap={0}>
                <Title order={2} style={{ color: colors.gray.title }}>
                  Builder Summary
                </Title>
                <Text size="sm" c="dimmed">
                  Report for Builder Jobs, Shipping & Status
                </Text>
              </Stack>
            </Group>

            {}
            <Group align="flex-end" style={{ flexGrow: 1 }} justify="flex-end">
              <Select
                label="Client"
                placeholder="Search clients..."
                data={selectData}
                searchable
                searchValue={clientSearch}
                onSearchChange={setClientSearch}
                value={selectedClientId}
                onChange={(val) => {
                  setSelectedClientId(val);
                  const selectedOption = clientOptions.find(
                    (opt: any) => opt.value === val,
                  );
                  if (selectedOption) {
                    setSelectedClientName(selectedOption.label);
                  } else {
                    setSelectedClientName("");
                  }
                }}
                nothingFoundMessage={null}
                style={{ width: 350 }}
                clearable
                rightSection={clientsLoading ? <Loader size={16} /> : null}
                filter={({ options }) => options}
              />
              <DatePickerInput
                type="range"
                allowSingleDateInRange
                label="Ship Date"
                placeholder="Select date range"
                value={shipDateRange}
                onChange={(value) =>
                  setShipDateRange(value as [Date | null, Date | null])
                }
                leftSection={<FaCalendarAlt size={16} />}
                clearable
                w={300}
              />
              <DatePickerInput
                type="range"
                allowSingleDateInRange
                label="Order Date"
                placeholder="Select date range"
                value={creationDateRange}
                onChange={(value) =>
                  setCreationDateRange(value as [Date | null, Date | null])
                }
                leftSection={<FaCalendarAlt size={16} />}
                clearable
                w={300}
              />
              <Select
                label="Ship Status"
                placeholder="All Statuses"
                data={[
                  { value: "shipped", label: "Shipped" },
                  { value: "not_shipped", label: "Not Shipped" },
                  { value: "partially_shipped", label: "Partially Shipped" },
                ]}
                value={shipStatusFilter}
                onChange={setShipStatusFilter}
                clearable
                w={200}
              />
            </Group>
          </Group>

          <Group justify="flex-end" mt="md">
            <Button
              variant="default"
              onClick={handleClearFilters}
              leftSection={<FaTimes size={12} />}
            >
              Clear Filters
            </Button>
            <Button
              variant="filled"
              color="blue"
              onClick={handleApplyFilters}
              leftSection={<FaFilter size={12} />}
              style={{ background: gradients.primary.to }}
            >
              Apply Filters
            </Button>

            <Button
              onClick={handleExport}
              loading={exportLoading}
              disabled={!reportData || reportData.length === 0}
              leftSection={<FaFileExcel size={14} />}
              variant="outline"
              color="green"
              ml="xl"
            >
              Export Excel
            </Button>
          </Group>
        </Paper>

        <Paper
          shadow="md"
          p="md"
          radius="md"
          style={{
            height: "calc(100vh - 220px)",
            border: `1px solid ${colors.gray.border}`,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {isLoading ? (
            <Center h="100%">
              <Loader type="bars" size="xl" color="violet" />
            </Center>
          ) : isError ? (
            <Center h="100%">
              <Text c="red">
                Error loading report: {(error as Error).message}
              </Text>
            </Center>
          ) : reportData && reportData.length > 0 ? (
            <ScrollArea style={{ flex: 1 }}>
              <Table stickyHeader highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Job #</Table.Th>
                    <Table.Th>Address</Table.Th>
                    <Table.Th>Order Date</Table.Th>
                    <Table.Th>Placement Date</Table.Th>
                    <Table.Th>Ship Status</Table.Th>
                    <Table.Th>Shipping Date</Table.Th>
                    <Table.Th>Ship Date Status</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>{rows}</Table.Tbody>
              </Table>
            </ScrollArea>
          ) : (
            <Center h="100%">
              <Stack align="center" gap="xs">
                <ThemeIcon color="gray" variant="light" size={60} radius="xl">
                  <FaSearch size={30} />
                </ThemeIcon>
                <Text size="lg" fw={500} c="dimmed">
                  {!queryParams.builderName
                    ? "Please select a client to view the report."
                    : "No records found. Try adjusting filters."}
                </Text>
              </Stack>
            </Center>
          )}
        </Paper>
        {totalPages > 1 && (
          <Center mt="md">
            <Pagination
              total={totalPages}
              value={queryParams.page + 1}
              onChange={handlePageChange}
              color="violet"
            />
          </Center>
        )}
      </Stack>
    </Container>
  );
}
