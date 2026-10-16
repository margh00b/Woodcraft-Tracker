import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import dayjs from "dayjs";
import { Database } from "@/types/supabase";

type WarehouseTrackingRow =
  Database["public"]["Views"]["warehouse_tracking_view"]["Row"];

const styles = StyleSheet.create({
  page: {
    padding: 30,
    flexDirection: "column",
    backgroundColor: "#ffffff",
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#112233",
    paddingBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#112233",
  },
  subtitle: {
    fontSize: 10,
    color: "#666666",
    marginTop: 4,
  },
  table: {
    width: "100%",
    borderStyle: "solid",
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  tableRow: {
    margin: "auto",
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    minHeight: 24,
    alignItems: "center",
  },
  tableHeader: {
    backgroundColor: "#F3F4F6",
    borderBottomWidth: 2,
    borderBottomColor: "#112233",
  },
  tableCol: {
    paddingLeft: 4,
    paddingRight: 4,
    paddingTop: 4,
    paddingBottom: 4,
    fontSize: 8,
  },
  totalSection: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingTop: 10,
  },
  totalText: {
    fontSize: 10,
    fontWeight: "bold",
    marginLeft: 20,
  },
});

interface WarehouseTrackingPdfProps {
  data: WarehouseTrackingRow[];
  generatedAt: Date;
}

const calculateCost = (row: WarehouseTrackingRow) => {
  if (!row.dropoff_date) return 0;
  const pallets = row.pallets || 0;
  let costPerPallet = 5;
  const start = dayjs(row.dropoff_date);
  const end = row.pickup_date ? dayjs(row.pickup_date) : dayjs();
  const diff = Math.max(0, end.diff(start, "day"));
  costPerPallet += diff * 1;
  if (row.pickup_date) {
    costPerPallet += 5;
  }
  return costPerPallet * pallets;
};

export const WarehouseTrackingPdf = ({
  data,
  generatedAt,
}: WarehouseTrackingPdfProps) => {
  const totalPallets = data.reduce((sum, row) => {
    return row.pickup_date ? sum : sum + (row.pallets || 0);
  }, 0);

  const totalCost = data.reduce((sum, row) => sum + calculateCost(row), 0);

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Warehouse Tracking Report</Text>
            <Text style={styles.subtitle}>
              Generated on {dayjs(generatedAt).format("MMM D, YYYY h:mm A")}
            </Text>
          </View>
          <View style={styles.totalSection}>
            <Text style={styles.totalText}>Records: {data.length}</Text>
            <Text style={styles.totalText}>
              Total Pallets in Warehouse: {totalPallets}
            </Text>
          </View>
        </View>

        <View style={styles.table}>
          {}
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.tableCol, { width: "8%" }]}>Job #</Text>
            <Text style={[styles.tableCol, { width: "24%" }]}>Client</Text>
            <Text style={[styles.tableCol, { width: "34%" }]}>Address</Text>
            <Text style={[styles.tableCol, { width: "3%" }]}>Box</Text>
            <Text style={[styles.tableCol, { width: "8%" }]}>Dropoff</Text>
            <Text style={[styles.tableCol, { width: "8%" }]}>Pickup</Text>
            <Text style={[styles.tableCol, { width: "5%" }]}>Pallets</Text>
            <Text style={[styles.tableCol, { width: "3%" }]}>Days</Text>
            <Text style={[styles.tableCol, { width: "7%" }]}>Cost</Text>
          </View>

          {}
          {data.map((row) => {
            const cost = calculateCost(row);
            const days = row.dropoff_date
              ? Math.max(
                  0,
                  (row.pickup_date ? dayjs(row.pickup_date) : dayjs()).diff(
                    dayjs(row.dropoff_date),
                    "day"
                  )
                )
              : 0;

            return (
              <View key={row.id} style={styles.tableRow}>
                <Text style={[styles.tableCol, { width: "8%" }]}>
                  {row.job_number || "—"}
                </Text>
                <Text style={[styles.tableCol, { width: "24%" }]}>
                  {row.shipping_client_name || "—"}
                </Text>
                <Text style={[styles.tableCol, { width: "34%" }]}>
                  {row.shipping_address || "—"}
                </Text>
                <Text style={[styles.tableCol, { width: "3%" }]}>
                  {row.box || "—"}
                </Text>
                <Text style={[styles.tableCol, { width: "8%" }]}>
                  {row.dropoff_date
                    ? dayjs(row.dropoff_date).format("YYYY-MM-DD")
                    : "—"}
                </Text>
                <Text style={[styles.tableCol, { width: "8%" }]}>
                  {row.pickup_date
                    ? dayjs(row.pickup_date).format("YYYY-MM-DD")
                    : "—"}
                </Text>
                <Text style={[styles.tableCol, { width: "5%" }]}>
                  {row.pallets || 0}
                </Text>
                <Text style={[styles.tableCol, { width: "3%" }]}>{days}</Text>
                <Text style={[styles.tableCol, { width: "7%" }]}>
                  ${cost.toFixed(2)}
                </Text>
              </View>
            );
          })}
        </View>
      </Page>
    </Document>
  );
};
