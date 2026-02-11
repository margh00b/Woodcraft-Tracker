import React from "react";
import { Page, Text, View, Document, StyleSheet } from "@react-pdf/renderer";
import dayjs from "dayjs";
import { Tables } from "@/types/db";

export type JoinedCabinet = Tables<"cabinets"> & {
  door_styles: { name: string } | null;
  species: { Species: string } | null;
  colors: { Name: string } | null;
};

export type ShippingReportJob = Tables<"jobs"> & {
  sales_orders: Tables<"sales_orders"> & {
    cabinet: JoinedCabinet | null;
  };
  production_schedule: Tables<"production_schedule">;
  installation: {
    notes: string | null;
    wrap_completed?: boolean;
    partially_shipped: boolean;
    in_warehouse?: string | null;
    has_shipped?: boolean;
  } | null;
  warehouse_tracking?: {
    pickup_date?: string | null;
    dropoff_date?: string | null;
  } | null;
};

const BORDER_COLOR = "#e0e0e0";
const HEADER_BORDER_COLOR = "#000";

const styles = StyleSheet.create({
  page: {
    paddingTop: 80,
    paddingBottom: 40,
    paddingHorizontal: 30,
    fontFamily: "Helvetica",
    fontSize: 9,
    flexDirection: "column",
  },
  headerContainer: {
    position: "absolute",
    top: 30,
    left: 30,
    right: 30,
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 2,
    borderBottomColor: "#000",
    paddingBottom: 5,
    height: 40,
  },
  reportTitle: { fontSize: 18, fontWeight: "bold" },
  metaInfoContainer: {
    position: "absolute",
    top: 30,
    right: 30,
    alignItems: "flex-end",
  },
  metaInfo: { fontSize: 8, textAlign: "right" },

  dateGroupHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#dfdfdf",
    paddingVertical: 4,
    paddingHorizontal: 5,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#000",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
  },
  dateGroupText: { fontSize: 10, fontWeight: "bold", paddingHorizontal: 5 },

  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    backgroundColor: "#f8f9fa",
    alignItems: "stretch",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER_COLOR,
    alignItems: "stretch",
  },

  cellBase: {
    paddingVertical: 3,
    paddingHorizontal: 2,
    borderRightWidth: 0.5,
    borderRightColor: BORDER_COLOR,
    justifyContent: "center",
  },
  headerCellBase: {
    paddingVertical: 4,
    paddingHorizontal: 2,
    borderRightWidth: 0.5,
    borderRightColor: HEADER_BORDER_COLOR,
    justifyContent: "center",
    backgroundColor: "#f8f9fa",
  },

  colJob: { width: "6%" },
  colConfirm: { width: "3%", alignItems: "center" },
  colCust: { width: "16%" },
  colAddr: { width: "17%" },
  colBox: { width: "3%", alignItems: "center" },
  colDoor: { width: "13%" },
  colSpec: { width: "6%" },
  colColor: { width: "9%" },
  colWrapped: { width: "3%", alignItems: "center" },
  colWarehouse: { width: "4%", alignItems: "center" },
  colNotes: { width: "15%", paddingRight: 4 },

  headerText: { fontSize: 8, fontWeight: "bold", textAlign: "center" },
  headerTextLeft: { fontSize: 8, fontWeight: "bold", textAlign: "left" },
  cellText: { fontSize: 8 },
  cellTextSmall: { fontSize: 7 },

  checkbox: {
    width: 10,
    height: 10,
    borderWidth: 1,
    borderColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  checkMark: {
    fontSize: 8,
    fontWeight: "bold",
    lineHeight: 1,
    marginTop: -1,
  },

  footer: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 8,
    color: "#888",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 5,
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: "#000",
    marginBottom: 5,
  },
  totalText: { fontSize: 9, fontWeight: "bold" },
});

const Checkbox = ({ checked }: { checked: boolean }) => (
  <View style={styles.checkbox}>
    {checked ? <Text style={styles.checkMark}>X</Text> : null}
  </View>
);

const safeGet = (data: any) => {
  if (Array.isArray(data)) return data[0] || null;
  return data || null;
};

const ColumnHeaders = () => (
  <View style={styles.tableHeader} wrap={false}>
    <View style={[styles.headerCellBase, styles.colConfirm]}>
      <Text style={styles.headerText}>Conf</Text>
    </View>
    <View style={[styles.headerCellBase, styles.colWrapped]}>
      <Text style={styles.headerText}>W</Text>
    </View>
    <View style={[styles.headerCellBase, styles.colWarehouse]}>
      <Text style={styles.headerText}>WrHs</Text>
    </View>
    <View style={[styles.headerCellBase, styles.colWarehouse]}>
      <Text style={styles.headerText}>Partial</Text>
    </View>
    <View style={[styles.headerCellBase, styles.colJob]}>
      <Text style={styles.headerText}>Job #</Text>
    </View>
    <View style={[styles.headerCellBase, styles.colCust]}>
      <Text style={styles.headerText}>Customer</Text>
    </View>
    <View style={[styles.headerCellBase, styles.colAddr]}>
      <Text style={styles.headerText}>Address</Text>
    </View>
    <View style={[styles.headerCellBase, styles.colBox]}>
      <Text style={styles.headerText}>Box</Text>
    </View>
    <View style={[styles.headerCellBase, styles.colDoor]}>
      <Text style={styles.headerText}>Door Style</Text>
    </View>
    <View style={[styles.headerCellBase, styles.colSpec]}>
      <Text style={styles.headerText}>Species</Text>
    </View>
    <View style={[styles.headerCellBase, styles.colColor]}>
      <Text style={styles.headerText}>Color</Text>
    </View>

    <View
      style={[
        styles.headerCellBase,
        styles.colNotes,
        { borderRightWidth: 0, justifyContent: "flex-start", paddingLeft: 4 },
      ]}
    >
      <Text style={styles.headerTextLeft}>Installation Notes</Text>
    </View>
  </View>
);

export const ShippingReportPdf = ({
  data,
  startDate,
  endDate,
}: {
  data: ShippingReportJob[];
  startDate: Date | null;
  endDate: Date | null;
}) => {
  const grouped = data.reduce(
    (acc, job) => {
      const ps = safeGet(job.production_schedule);
      const dateKey = ps?.ship_schedule || "No Date";
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(job);
      return acc;
    },
    {} as Record<string, ShippingReportJob[]>,
  );

  const sortedDates = Object.keys(grouped).sort((a, b) => {
    if (a === "No Date") return 1;
    if (b === "No Date") return -1;
    return new Date(a).getTime() - new Date(b).getTime();
  });

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {}
        <View style={styles.headerContainer} fixed>
          <Text style={styles.reportTitle}>Shipping Report</Text>
        </View>

        {}
        <View style={styles.metaInfoContainer} fixed>
          <Text style={styles.metaInfo}>
            Printed: {dayjs().format("DD-MMM-YY")}
          </Text>
          <Text style={styles.metaInfo}>
            Range: {startDate ? dayjs(startDate).format("DD-MMM") : "?"} -{" "}
            {endDate ? dayjs(endDate).format("DD-MMM") : "?"}
          </Text>
          <Text
            style={styles.metaInfo}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>

        {}
        {sortedDates.map((dateKey) => {
          const jobs = grouped[dateKey];
          const dateObj = dayjs(dateKey);
          const formattedDate =
            dateKey === "No Date" ? "Unscheduled" : dateObj.format("DD-MMM-YY");
          const dayName = dateKey === "No Date" ? "" : dateObj.format("dddd");

          const boxTotal = jobs.reduce((sum, job) => {
            const so = safeGet(job.sales_orders);
            const cab = safeGet(so?.cabinet);
            const box = parseInt(cab?.box || "0", 10);
            return isNaN(box) ? sum : sum + box;
          }, 0);

          return (
            <View key={dateKey}>
              {}
              <View style={styles.dateGroupHeader} wrap={false}>
                <Text style={styles.dateGroupText}>Ship Date:</Text>
                <Text style={styles.dateGroupText}>{formattedDate}</Text>
                <Text style={styles.dateGroupText}>{dayName}</Text>
              </View>

              <ColumnHeaders />

              {}
              {jobs.map((job) => {
                const so = safeGet(job.sales_orders);
                const cab = safeGet(so?.cabinet);
                const jobNum = job.job_number || "—";
                const clientName = so?.shipping_client_name || "Unknown";
                const address =
                  [so?.shipping_street, so?.shipping_city]
                    .filter(Boolean)
                    .join(", ") || "—";
                const box = cab?.box || "0";
                const door = safeGet(cab?.door_styles)?.name || "—";
                const species = safeGet(cab?.species)?.Species || "—";
                const color = safeGet(cab?.colors)?.Name || "—";

                return (
                  <View style={styles.tableRow} key={job.id} wrap={false}>
                    <View style={[styles.cellBase, styles.colConfirm]}>
                      <Checkbox
                        checked={
                          job.production_schedule?.ship_status === "confirmed"
                        }
                      />
                    </View>
                    <View style={[styles.cellBase, styles.colWrapped]}>
                      <Checkbox
                        checked={Boolean(job.installation?.wrap_completed)}
                      />
                    </View>
                    <View style={[styles.cellBase, styles.colWarehouse]}>
                      <Checkbox
                        checked={Boolean(job.installation?.in_warehouse)}
                      />
                    </View>
                    <View style={[styles.cellBase, styles.colWarehouse]}>
                      <Checkbox
                        checked={Boolean(job.installation?.partially_shipped)}
                      />
                    </View>
                    <View style={[styles.cellBase, styles.colJob]}>
                      <Text style={styles.cellText}>{jobNum}</Text>
                    </View>
                    <View style={[styles.cellBase, styles.colCust]}>
                      <Text style={styles.cellText}>{clientName}</Text>
                    </View>
                    <View style={[styles.cellBase, styles.colAddr]}>
                      <Text style={styles.cellTextSmall}>{address}</Text>
                    </View>
                    <View style={[styles.cellBase, styles.colBox]}>
                      <Text style={[styles.cellText, { fontWeight: "bold" }]}>
                        {box}
                      </Text>
                    </View>
                    <View style={[styles.cellBase, styles.colDoor]}>
                      <Text style={styles.cellTextSmall}>{door}</Text>
                    </View>
                    <View style={[styles.cellBase, styles.colSpec]}>
                      <Text style={styles.cellTextSmall}>{species}</Text>
                    </View>
                    <View style={[styles.cellBase, styles.colColor]}>
                      <Text style={styles.cellTextSmall}>{color}</Text>
                    </View>

                    <View
                      style={[
                        styles.cellBase,
                        styles.colNotes,
                        {
                          borderRightWidth: 0,
                          justifyContent: "flex-start",
                          paddingLeft: 4,
                        },
                      ]}
                    >
                      <Text style={styles.cellTextSmall}>
                        {job.installation?.notes || "—"}
                      </Text>
                    </View>
                  </View>
                );
              })}

              {}
              <View style={styles.totalRow} wrap={false}>
                <Text style={styles.totalText}>Total Boxes: {boxTotal}</Text>
              </View>
            </View>
          );
        })}

        {}
        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber} of ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
};
