import { Page, Text, View, Document, StyleSheet } from "@react-pdf/renderer";
import dayjs from "dayjs";
import { Views } from "@/types/db";

type PlantTableView = Views<"plant_table_view">;

const styles = StyleSheet.create({
  page: {
    padding: 20,
    fontFamily: "Helvetica",
    fontSize: 8,
    lineHeight: 1.3,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    paddingBottom: 5,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4A00E0",
  },
  metaInfo: {
    fontSize: 8,
    textAlign: "right",
    color: "#555",
  },
  dateGroupHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f3f5",
    paddingVertical: 4,
    paddingHorizontal: 5,
    marginTop: 8,
    marginBottom: 2,
    borderTopWidth: 1,
    borderTopColor: "#dee2e6",
    borderBottomWidth: 1,
    borderBottomColor: "#dee2e6",
  },
  dateGroupText: {
    fontSize: 10,
    fontWeight: "bold",
    marginRight: 10,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    paddingVertical: 3,
    marginBottom: 2,
    backgroundColor: "#fff",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e0e0e0",
    alignItems: "center",
  },
  headerText: {
    fontSize: 7,
    fontWeight: "bold",
    color: "#333",
  },
  rowText: {
    fontSize: 7,
    color: "#000",
  },

  colJob: { width: "8%" },
  colClient: { width: "17%" },
  colLoc: { width: "23%" },
  colBox: { width: "5%" },
  colDoor: { width: "10%" },
  colSpec: { width: "12%" },
  colColor: { width: "10%" },
  colCheck: { width: "3%", textAlign: "center" },

  checkbox: {
    width: 8,
    height: 8,
    borderWidth: 1,
    borderColor: "#000",
    marginLeft: "auto",
    marginRight: "auto",
    alignItems: "center",
    justifyContent: "center",
  },
  checkMark: { fontSize: 6, lineHeight: 1 },
});

const Checkbox = ({ checked }: { checked: boolean }) => (
  <View style={styles.checkbox}>
    {checked ? <Text style={styles.checkMark}>X</Text> : null}
  </View>
);

export const PlantShippingSchedulePdf = ({
  data,
  dateRange,
}: {
  data: PlantTableView[];
  dateRange: [Date | null, Date | null];
}) => {
  const grouped = data.reduce((acc, row) => {
    const dateKey = row.ship_schedule
      ? dayjs(row.ship_schedule).format("YYYY-MM-DD")
      : "Unscheduled";
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(row);
    return acc;
  }, {} as Record<string, PlantTableView[]>);

  const sortedKeys = Object.keys(grouped).sort((a, b) => {
    if (a === "Unscheduled") return 1;
    if (b === "Unscheduled") return -1;
    return new Date(a).getTime() - new Date(b).getTime();
  });

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {}
        <View style={styles.headerContainer}>
          <Text style={styles.reportTitle}>Plant Shipping Schedule</Text>
          <View>
            <Text style={styles.metaInfo}>
              Printed: {dayjs().format("MMM D, YYYY HH:mm")}
            </Text>
            <Text style={styles.metaInfo}>
              Date Range:{" "}
              {dateRange[0] ? dayjs(dateRange[0]).format("MMM D") : "?"} -{" "}
              {dateRange[1] ? dayjs(dateRange[1]).format("MMM D, YYYY") : "?"}
            </Text>
          </View>
        </View>

        {sortedKeys.map((dateKey) => {
          const rows = grouped[dateKey];
          const isUnscheduled = dateKey === "Unscheduled";
          const displayDate = isUnscheduled
            ? "Unscheduled"
            : dayjs(dateKey).format("ddd, MMM D, YYYY");

          const uniqueJobCount = new Set(
            rows.map((r) => {
              const val = r.job_number || "";
              return val.split("-")[0].trim();
            })
          ).size;

          const totalBoxes = rows.reduce((sum, r) => {
            const val = parseInt(r.cabinet_box || "0", 10);
            return isNaN(val) ? sum : sum + val;
          }, 0);

          return (
            <View key={dateKey}>
              {}
              <View style={styles.dateGroupHeader} wrap={false}>
                <Text style={styles.dateGroupText}>
                  SHIP DATE: {displayDate}
                </Text>
                <Text
                  style={[
                    styles.dateGroupText,
                    { fontWeight: "normal", fontSize: 9 },
                  ]}
                >
                  ({uniqueJobCount} Jobs, {totalBoxes} Boxes)
                </Text>
              </View>

              {}
              <View style={styles.tableHeader} wrap={false}>
                <Text style={[styles.headerText, styles.colJob]}>Job #</Text>
                <Text style={[styles.headerText, styles.colClient]}>
                  Client
                </Text>
                <Text style={[styles.headerText, styles.colLoc]}>Location</Text>
                <Text style={[styles.headerText, styles.colBox]}>Box</Text>
                <Text style={[styles.headerText, styles.colDoor]}>Door</Text>
                <Text style={[styles.headerText, styles.colSpec]}>Species</Text>
                <Text style={[styles.headerText, styles.colColor]}>Color</Text>

                {}
                <Text style={[styles.headerText, styles.colCheck]}>D</Text>
                <Text style={[styles.headerText, styles.colCheck]}>P</Text>
                <Text style={[styles.headerText, styles.colCheck]}>F/C</Text>
                <Text style={[styles.headerText, styles.colCheck]}>P/S</Text>
                <Text style={[styles.headerText, styles.colCheck]}>A</Text>
              </View>

              {}
              {rows.map((row) => (
                <View style={styles.tableRow} key={row.job_id} wrap={false}>
                  <Text style={[styles.rowText, styles.colJob]}>
                    {row.job_number}
                  </Text>
                  <Text style={[styles.rowText, styles.colClient]}>
                    {row.client_name}
                  </Text>
                  <Text style={[styles.rowText, styles.colLoc]}>
                    {[row.shipping_street, row.shipping_city]
                      .filter(Boolean)
                      .join(", ")}
                  </Text>
                  <Text style={[styles.rowText, styles.colBox]}>
                    {row.cabinet_box}
                  </Text>
                  <Text style={[styles.rowText, styles.colDoor]}>
                    {row.cabinet_door_style}
                  </Text>
                  <Text style={[styles.rowText, styles.colSpec]}>
                    {row.cabinet_species}
                  </Text>
                  <Text style={[styles.rowText, styles.colColor]}>
                    {row.cabinet_color}
                  </Text>

                  {}
                  <View style={styles.colCheck}>
                    <Checkbox checked={!!row.doors_completed_actual} />
                  </View>
                  <View style={styles.colCheck}>
                    <Checkbox checked={!!row.cut_finish_completed_actual} />
                  </View>
                  <View style={styles.colCheck}>
                    <Checkbox checked={!!row.custom_finish_completed_actual} />
                  </View>
                  <View style={styles.colCheck}>
                    <Checkbox checked={!!row.paint_completed_actual} />
                  </View>
                  <View style={styles.colCheck}>
                    <Checkbox checked={!!row.assembly_completed_actual} />
                  </View>
                </View>
              ))}
            </View>
          );
        })}
      </Page>
    </Document>
  );
};
