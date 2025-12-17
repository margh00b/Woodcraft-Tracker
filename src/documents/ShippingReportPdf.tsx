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
};

const ITEMS_PER_PAGE = 45;

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
    marginBottom: 2,
  },
  dateGroupText: { fontSize: 10, fontWeight: "bold", paddingHorizontal: 5 },

  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    paddingVertical: 4,
    marginBottom: 2,
    backgroundColor: "#f8f9fa",
  },
  headerText: { fontSize: 8, fontWeight: "bold" },

  tableRow: {
    flexDirection: "row",
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e0e0e0",
    alignItems: "center",
  },

  colJob: { width: "10%" },
  colCust: { width: "15%" },
  colAddr: { width: "20%" },
  colBox: { width: "5%", textAlign: "center" },
  colDoor: { width: "15%" },
  colSpec: { width: "10%" },
  colColor: { width: "10%" },
  colCheck: { width: "3%", textAlign: "center" },

  checkbox: {
    width: 8,
    height: 8,
    borderWidth: 1,
    borderColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  checkMark: { fontSize: 6, fontWeight: "bold", paddingBottom: 1 },

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
  <View style={styles.tableHeader}>
    <Text style={[styles.headerText, styles.colJob]}>Job #</Text>
    <Text style={[styles.headerText, styles.colCust]}>Customer</Text>
    <Text style={[styles.headerText, styles.colAddr]}>Address</Text>
    <Text style={[styles.headerText, styles.colBox]}>Box</Text>
    <Text style={[styles.headerText, styles.colDoor]}>Door Style</Text>
    <Text style={[styles.headerText, styles.colSpec]}>Species</Text>
    <Text style={[styles.headerText, styles.colColor]}>Color</Text>
    <Text style={[styles.headerText, styles.colCheck]}>D</Text>
    <Text style={[styles.headerText, styles.colCheck]}>P</Text>
    <Text style={[styles.headerText, styles.colCheck]}>F/C</Text>
    <Text style={[styles.headerText, styles.colCheck]}>P/S</Text>
    <Text style={[styles.headerText, styles.colCheck]}>A</Text>
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
  const grouped = data.reduce((acc, job) => {
    const ps = safeGet(job.production_schedule);
    const dateKey = ps?.ship_schedule || "No Date";

    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(job);
    return acc;
  }, {} as Record<string, ShippingReportJob[]>);

  const sortedDates = Object.keys(grouped).sort((a, b) => {
    if (a === "No Date") return 1;
    if (b === "No Date") return -1;
    return new Date(a).getTime() - new Date(b).getTime();
  });

  const pages: React.ReactNode[][] = [];
  let currentPage: React.ReactNode[] = [];
  let currentCount = 0;

  const startNewPage = () => {
    if (currentPage.length > 0) pages.push(currentPage);
    currentPage = [];
    currentCount = 0;
  };

  sortedDates.forEach((dateKey) => {
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

    if (currentCount > ITEMS_PER_PAGE - 5) {
      startNewPage();
    }

    currentPage.push(
      <View key={`date-header-${dateKey}`} style={styles.dateGroupHeader}>
        <Text style={styles.dateGroupText}>Ship Date:</Text>
        <Text style={styles.dateGroupText}>{formattedDate}</Text>
        <Text style={styles.dateGroupText}>{dayName}</Text>
      </View>
    );
    currentCount += 1;

    currentPage.push(<ColumnHeaders key={`col-header-start-${dateKey}`} />);
    currentCount += 1;

    jobs.forEach((job) => {
      if (currentCount >= ITEMS_PER_PAGE) {
        startNewPage();
        currentPage.push(<ColumnHeaders key={`col-header-cont-${job.id}`} />);
        currentCount += 1;
      }

      const so = safeGet(job.sales_orders);
      const cab = safeGet(so?.cabinet);
      const ps = safeGet(job.production_schedule);

      const jobNum = job.job_number || "—";
      const clientName = so?.shipping_client_name || "Unknown";
      const address =
        [so?.shipping_street, so?.shipping_city].filter(Boolean).join(", ") ||
        "—";

      const box = cab?.box || "0";
      const door = safeGet(cab?.door_styles)?.name || "—";
      const species = safeGet(cab?.species)?.Species || "—";
      const color = safeGet(cab?.colors)?.Name || "—";

      currentPage.push(
        <View style={styles.tableRow} key={job.id} wrap={false}>
          <Text style={[styles.colJob, { fontSize: 8 }]}>{jobNum}</Text>
          <Text style={[styles.colCust, { fontSize: 8 }]}>
            {clientName.substring(0, 20)}
          </Text>
          <Text style={[styles.colAddr, { fontSize: 8 }]}>
            {address.substring(0, 25)}
          </Text>

          <View style={styles.colBox}>
            <Text style={{ fontWeight: "bold" }}>{box}</Text>
          </View>
          <View style={[styles.colDoor, { fontSize: 8 }]}>
            <Text>{door.substring(0, 15)}</Text>
          </View>

          <Text style={[styles.colSpec, { fontSize: 8 }]}>
            {species.substring(0, 10)}
          </Text>
          <Text style={[styles.colColor, { fontSize: 8 }]}>
            {color.substring(0, 10)}
          </Text>

          <View style={styles.colCheck}>
            <Checkbox checked={!!ps?.doors_completed_actual} />
          </View>
          <View style={styles.colCheck}>
            <Checkbox checked={!!ps?.cut_finish_completed_actual} />
          </View>
          <View style={styles.colCheck}>
            <Checkbox checked={!!ps?.custom_finish_completed_actual} />
          </View>
          <View style={styles.colCheck}>
            <Checkbox checked={!!ps?.paint_completed_actual} />
          </View>
          <View style={styles.colCheck}>
            <Checkbox checked={!!ps?.assembly_completed_actual} />
          </View>
        </View>
      );
      currentCount += 1;
    });

    if (currentCount >= ITEMS_PER_PAGE) {
      startNewPage();
    }

    currentPage.push(
      <View key={`total-${dateKey}`} style={styles.totalRow} wrap={false}>
        <Text style={styles.totalText}>Total Boxes: {boxTotal}</Text>
      </View>
    );
    currentCount += 1;
  });

  if (currentPage.length > 0) pages.push(currentPage);

  if (pages.length === 0) {
    return (
      <Document>
        <Page size="A4" orientation="landscape" style={styles.page}>
          <Text>No data found for this date range.</Text>
        </Page>
      </Document>
    );
  }

  return (
    <Document>
      {pages.map((pageContent, index) => (
        <Page key={index} size="A4" orientation="landscape" style={styles.page}>
          <View style={styles.headerContainer} fixed>
            <Text style={styles.reportTitle}>Orders Shipping by Date</Text>
            <View>
              <Text style={styles.metaInfo}>
                Printed: {dayjs().format("DD-MMM-YY")}
              </Text>
              <Text style={styles.metaInfo}>
                Page {index + 1} of {pages.length}
              </Text>
              <Text style={styles.metaInfo}>
                Range: {startDate ? dayjs(startDate).format("DD-MMM") : "?"} -{" "}
                {endDate ? dayjs(endDate).format("DD-MMM") : "?"}
              </Text>
            </View>
          </View>

          <View>{pageContent}</View>

          <Text style={styles.footer} fixed>
            Page {index + 1} of {pages.length}
          </Text>
        </Page>
      ))}
    </Document>
  );
};
