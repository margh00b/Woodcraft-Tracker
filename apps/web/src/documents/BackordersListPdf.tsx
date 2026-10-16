import React from "react";
import { Page, Text, View, Document, StyleSheet } from "@react-pdf/renderer";
import dayjs from "dayjs";

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

  colId: { width: "8%" },
  colJob: { width: "12%" },
  colClient: { width: "18%" },
  colDesc: { width: "27%" },
  colDate: { width: "12%" },
  colDue: { width: "12%" },
  colStatus: { width: "11%" },

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

interface BackordersListPdfProps {
  data: any[];
  dateRange: [Date | null, Date | null];
}

const truncate = (str: string | null, max: number) => {
  if (!str) return "—";
  const cleanStr = str.replace(/\n/g, " ");
  if (cleanStr.length <= max) return cleanStr;
  return cleanStr.substring(0, max) + "...";
};

export const BackordersListPdf = ({
  data,
  dateRange,
}: BackordersListPdfProps) => {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.headerContainer} fixed>
          <View>
            <Text style={styles.reportTitle}>Backorders Report</Text>
            <Text style={{ fontSize: 10, color: "#666", marginTop: 10 }}>
              Total Items: {data.length}
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
          <Text style={[styles.headerText, styles.colId]}>BO #</Text>
          <Text style={[styles.headerText, styles.colJob]}>Job #</Text>
          <Text style={[styles.headerText, styles.colClient]}>Client</Text>
          <Text style={[styles.headerText, styles.colDesc]}>Description</Text>
          <Text style={[styles.headerText, styles.colDate]}>Date Entered</Text>
          <Text style={[styles.headerText, styles.colDue]}>Due Date</Text>
          <Text style={[styles.headerText, styles.colStatus]}>Status</Text>
        </View>

        {data.map((item, index) => (
          <View style={styles.tableRow} key={item.id || index} wrap={false}>
            <Text style={styles.colId}>BO-{item.id}</Text>
            <Text style={styles.colJob}>{item.job_number || "—"}</Text>

            <Text style={styles.colClient}>
              {truncate(item.shipping_client_name, 25)}
            </Text>

            <Text style={styles.colDesc}>{truncate(item.comments, 50)}</Text>

            <Text style={styles.colDate}>
              {item.date_entered
                ? dayjs(item.date_entered).format("YYYY-MM-DD")
                : "—"}
            </Text>
            <Text style={styles.colDue}>
              {item.due_date ? dayjs(item.due_date).format("YYYY-MM-DD") : "—"}
            </Text>
            <Text
              style={[
                styles.colStatus,
                { color: item.complete ? "green" : "red" },
              ]}
            >
              {item.complete ? "Complete" : "Pending"}
            </Text>
          </View>
        ))}

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
