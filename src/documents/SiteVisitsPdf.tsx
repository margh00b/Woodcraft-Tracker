import React from "react";
import { Page, Text, View, Document, StyleSheet } from "@react-pdf/renderer";
import dayjs from "dayjs";

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: "Helvetica",
    fontSize: 9,
    lineHeight: 1.3,
    flexDirection: "column",
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    paddingBottom: 10,
  },
  reportTitle: { fontSize: 18, fontWeight: "bold", textTransform: "uppercase" },
  metaInfo: { fontSize: 9, textAlign: "right" },

  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    paddingVertical: 4,
    backgroundColor: "#f0f0f0",
    fontWeight: "bold",
  },
  headerText: { fontSize: 9, fontWeight: "bold" },

  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e0e0e0",
  },

  colJob: { width: "12%" },
  colClient: { width: "20%" },
  colAddress: { width: "25%" },
  colVisitDate: { width: "13%" },
  colVisitedBy: { width: "15%" },
  colNotes: { width: "15%" },

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

interface SiteVisitsPdfProps {
  data: any[];
  dateRange: [Date | null, Date | null];
}

const truncate = (str: string | null, max: number) => {
  if (!str) return "—";
  const cleanStr = str.replace(/\n/g, " ");
  if (cleanStr.length <= max) return cleanStr;
  return cleanStr.substring(0, max) + "...";
};

export const SiteVisitsPdf = ({ data, dateRange }: SiteVisitsPdfProps) => {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.headerContainer} fixed>
          <View>
            <Text style={styles.reportTitle}>Site Visits Report</Text>
            <Text style={{ fontSize: 10, color: "#666", marginTop: 10 }}>
              Total Visits: {data.length}
            </Text>
          </View>
          <View>
            <Text style={styles.metaInfo}>
              Printed: {dayjs().format("MMM D, YYYY")}
            </Text>
            <Text style={styles.metaInfo}>
              Range:{" "}
              {dateRange[0] ? dayjs(dateRange[0]).format("MMM D") : "All"} -{" "}
              {dateRange[1] ? dayjs(dateRange[1]).format("MMM D, YYYY") : "All"}
            </Text>
          </View>
        </View>

        <View style={styles.tableHeader} fixed>
          <Text style={[styles.headerText, styles.colJob]}>Job #</Text>
          <Text style={[styles.headerText, styles.colClient]}>Client</Text>
          <Text style={[styles.headerText, styles.colAddress]}>
            Site Address
          </Text>
          <Text style={[styles.headerText, styles.colVisitDate]}>
            Visit Date
          </Text>
          <Text style={[styles.headerText, styles.colVisitedBy]}>
            Visited By
          </Text>
          <Text style={[styles.headerText, styles.colNotes]}>Notes</Text>
        </View>

        {data.map((item, index) => {
          const address = [
            item.jobs?.sales_orders?.shipping_street,
            item.jobs?.sales_orders?.shipping_city,
          ]
            .filter(Boolean)
            .join(", ");

          return (
            <View style={styles.tableRow} key={item.id || index} wrap={false}>
              <Text style={styles.colJob}>{item.jobs?.job_number || "—"}</Text>
              <Text style={styles.colClient}>
                {truncate(item.jobs?.sales_orders?.shipping_client_name, 20)}
              </Text>
              <Text style={styles.colAddress}>{truncate(address, 30)}</Text>
              <Text style={styles.colVisitDate}>
                {item.visit_date
                  ? dayjs(item.visit_date).format("YYYY-MM-DD")
                  : "—"}
              </Text>
              <Text style={styles.colVisitedBy}>
                {truncate(item.created_by, 20)}
              </Text>
              <Text style={styles.colNotes}>{truncate(item.notes, 20)}</Text>
            </View>
          );
        })}

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
