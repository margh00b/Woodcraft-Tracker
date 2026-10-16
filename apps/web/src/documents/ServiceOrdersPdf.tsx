import React from "react";
import { Page, Text, View, Document, StyleSheet } from "@react-pdf/renderer";
import dayjs from "dayjs";
import { Database } from "@/types/supabase";

type PlantServiceOrderView =
  Database["public"]["Views"]["plant_service_orders_view"]["Row"];

interface ServiceOrderPart {
  id: number;
  qty: number;
  part: string;
  description: string;
  location: string;
  status: string;
  part_due_date?: string | null;
}

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: "Helvetica",
    fontSize: 9,
    flexDirection: "column",
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: "#000",
    paddingBottom: 5,
    height: 40,
  },
  reportTitle: { fontSize: 18, fontWeight: "bold" },
  metaInfo: { fontSize: 8, textAlign: "right" },

  dateGroupHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#dfdfdf",
    paddingVertical: 4,
    paddingHorizontal: 5,
    marginTop: 5,
    marginBottom: 10,
    borderTopWidth: 1,
    borderTopColor: "#000",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
  },
  dateGroupText: { fontSize: 10, fontWeight: "bold", paddingHorizontal: 5 },

  soContainer: {
    marginBottom: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e0e0e0",
    paddingBottom: 4,
    width: "98%",
    marginLeft: "auto",
  },
  soHeader: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    padding: 4,
    marginBottom: 2,
    borderLeft: "2px solid red",
  },
  soHeaderText: { fontSize: 9, fontWeight: "bold", marginRight: 10 },

  partsTableHeader: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#000",
    marginBottom: 2,
    paddingLeft: 10,
  },
  partRow: {
    flexDirection: "row",
    paddingLeft: 10,
    paddingVertical: 1,
  },

  colQty: { width: "5%", textAlign: "center" },
  colName: { width: "20%" },
  colDesc: { width: "35%" },
  colLoc: { width: "15%" },
  colDueDate: { width: "10%" },
  colStatus: { width: "15%" },

  headerText: { fontSize: 8, fontWeight: "bold" },
  cellText: { fontSize: 8 },

  footer: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 8,
    color: "#888",
  },
});

export const ServiceOrdersPdf = ({
  data,
  startDate,
  endDate,
}: {
  data: PlantServiceOrderView[];
  startDate: Date | null;
  endDate: Date | null;
}) => {
  const grouped = data.reduce((acc, so) => {
    const parts = (so.pending_parts as unknown as ServiceOrderPart[]) || [];
    const distinctDates = new Set<string>();

    parts.forEach((part) => {
      if (part.part_due_date) {
        distinctDates.add(dayjs(part.part_due_date).format("YYYY-MM-DD"));
      }
    });

    distinctDates.forEach((dateKey) => {
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(so);
    });

    return acc;
  }, {} as Record<string, PlantServiceOrderView[]>);

  const sortedDates = Object.keys(grouped).sort((a, b) => {
    if (a === "No Date") return 1;
    if (b === "No Date") return -1;
    return new Date(a).getTime() - new Date(b).getTime();
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerContainer} fixed>
          <Text style={styles.reportTitle}>Service Orders Schedule</Text>
          <View>
            <Text style={styles.metaInfo}>
              Printed: {dayjs().format("DD-MMM-YY")}
            </Text>
            <Text style={styles.metaInfo}>
              Range: {startDate ? dayjs(startDate).format("DD-MMM") : "?"} -{" "}
              {endDate ? dayjs(endDate).format("DD-MMM") : "?"}
            </Text>
          </View>
        </View>

        {sortedDates.map((dateKey) => {
          const orders = grouped[dateKey];
          const dateObj = dayjs(dateKey);
          const formattedDate =
            dateKey === "No Date" ? "Unscheduled" : dateObj.format("DD-MMM-YY");
          const dayName = dateKey === "No Date" ? "" : dateObj.format("dddd");

          let totalPartsForDate = 0;
          orders.forEach((so) => {
            const parts =
              (so.pending_parts as unknown as ServiceOrderPart[]) || [];
            const matchingParts = parts.filter((p) => {
              if (!p.part_due_date) return false;
              return dayjs(p.part_due_date).format("YYYY-MM-DD") === dateKey;
            });
            totalPartsForDate += matchingParts.length;
          });

          return (
            <View key={dateKey}>
              <View style={styles.dateGroupHeader}>
                <Text style={styles.dateGroupText}>Part Due Date:</Text>
                <Text style={styles.dateGroupText}>{formattedDate}</Text>
                <Text style={styles.dateGroupText}>{dayName}</Text>
                <Text style={[styles.dateGroupText, { marginLeft: "auto" }]}>
                  {orders.length} Orders, {totalPartsForDate} Parts
                </Text>
              </View>

              {orders.map((so) => {
                const clientName = so.client_name || "Unknown";
                const jobNum = so.job_number || "Unknown";

                const allParts =
                  (so.pending_parts as unknown as ServiceOrderPart[]) || [];

                const displayParts = allParts.filter((part) => {
                  if (!part.part_due_date) return false;
                  return (
                    dayjs(part.part_due_date).format("YYYY-MM-DD") === dateKey
                  );
                });

                if (displayParts.length === 0) return null;

                return (
                  <View
                    key={`${so.service_order_number}-${dateKey}`}
                    style={styles.soContainer}
                    wrap={false}
                  >
                    <View style={styles.soHeader}>
                      <Text style={styles.soHeaderText}>
                        SO #{so.service_order_number}
                      </Text>
                      <Text style={styles.soHeaderText}>Job #{jobNum}</Text>
                      <Text style={styles.soHeaderText}>{clientName}</Text>
                      <Text style={styles.soHeaderText}>
                        {[so.shipping_street, so.shipping_city]
                          .filter(Boolean)
                          .join(", ")}
                      </Text>
                    </View>

                    <View style={styles.partsTableHeader}>
                      <Text style={[styles.headerText, styles.colQty]}>
                        Qty
                      </Text>
                      <Text style={[styles.headerText, styles.colName]}>
                        Part Name
                      </Text>
                      <Text style={[styles.headerText, styles.colDesc]}>
                        Description
                      </Text>
                      <Text style={[styles.headerText, styles.colLoc]}>
                        Location
                      </Text>
                      <Text style={[styles.headerText, styles.colDueDate]}>
                        Due Date
                      </Text>
                      <Text style={[styles.headerText, styles.colStatus]}>
                        Status
                      </Text>
                    </View>

                    {displayParts.map((part) => (
                      <View key={part.id} style={styles.partRow}>
                        <Text style={[styles.cellText, styles.colQty]}>
                          {part.qty}
                        </Text>
                        <Text style={[styles.cellText, styles.colName]}>
                          {part.part || "-"}
                        </Text>
                        <Text style={[styles.cellText, styles.colDesc]}>
                          {part.description || "-"}
                        </Text>
                        <Text style={[styles.cellText, styles.colLoc]}>
                          {part.location || "-"}
                        </Text>
                        <Text style={[styles.cellText, styles.colDueDate]}>
                          {part.part_due_date
                            ? dayjs(part.part_due_date).format("MMM D, YY")
                            : "-"}
                        </Text>
                        <Text style={[styles.cellText, styles.colStatus]}>
                          {part.status}
                        </Text>
                      </View>
                    ))}
                  </View>
                );
              })}
            </View>
          );
        })}

        <Text
          style={styles.footer}
          fixed
          render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber} of ${totalPages}`
          }
        />
      </Page>
    </Document>
  );
};
