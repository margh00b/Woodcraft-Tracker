import React from "react";
import { Page, Text, View, Document, StyleSheet } from "@react-pdf/renderer";
import dayjs from "dayjs";

export type PastShippingJob = {
  id: string;
  job_number: string;
  sales_orders:
    | {
        shipping_client_name: string;
        shipping_street: string;
        shipping_city: string;
        delivery_type: string;
        cabinets: { box: string } | { box: string }[];
      }
    | {
        shipping_client_name: string;
        shipping_street: string;
        shipping_city: string;
        delivery_type: string;
        cabinets: { box: string } | { box: string }[];
      }[];
  production_schedule: { ship_schedule: string } | { ship_schedule: string }[];
  installation: {
    installation_date: string | null;
    inspection_date: string | null;
    installation_completed: string | null;
    inspection_completed: string | null;
    has_shipped: boolean;
    installers: {
      first_name: string | null;
      last_name: string | null;
      company_name: string | null;
    } | null;
  } | null;
  invoices:
    | {
        paid_at: string | null;
        invoice_number: string | null;
        date_entered: string | null;
      }[]
    | {
        paid_at: string | null;
        invoice_number: string | null;
        date_entered: string | null;
      }
    | null;
};

const BORDER_COLOR = "#e0e0e0";
const HEADER_BORDER_COLOR = "#000";

const styles = StyleSheet.create({
  page: {
    padding: 20,
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
  colCust: { width: "11%" },
  colAddr: { width: "13%" },
  colBox: { width: "4%", alignItems: "center" },
  colDel: { width: "6%" },
  colInstDate: { width: "8%", alignItems: "center" },
  colInstComp: { width: "8%", alignItems: "center" },
  colInstName: { width: "10%" },
  colInspect: { width: "8%", alignItems: "center" },
  colInspectComp: { width: "8%", alignItems: "center" },
  colInv: { width: "6%", alignItems: "center" },
  colInvDate: { width: "6%", alignItems: "center" },
  colInvNum: { width: "6%", borderRightWidth: 0 }, 

  headerText: { fontSize: 7, fontWeight: "bold", textAlign: "center" },
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
    <View style={[styles.headerCellBase, styles.colJob]}>
      <Text style={styles.headerText}>Job #</Text>
    </View>
    <View style={[styles.headerCellBase, styles.colCust]}>
      <Text style={styles.headerText}>Client</Text>
    </View>
    <View style={[styles.headerCellBase, styles.colAddr]}>
      <Text style={styles.headerText}>Address</Text>
    </View>
    <View style={[styles.headerCellBase, styles.colBox]}>
      <Text style={styles.headerText}>Box</Text>
    </View>
    <View style={[styles.headerCellBase, styles.colDel]}>
      <Text style={styles.headerText}>Delivery</Text>
    </View>
    <View style={[styles.headerCellBase, styles.colInstDate]}>
      <Text style={styles.headerText}>Installation</Text>
    </View>
    <View style={[styles.headerCellBase, styles.colInstComp]}>
      <Text style={styles.headerText}>Installation Comp</Text>
    </View>
    <View style={[styles.headerCellBase, styles.colInstName]}>
      <Text style={styles.headerText}>Installer</Text>
    </View>
    <View style={[styles.headerCellBase, styles.colInspect]}>
      <Text style={styles.headerText}>Inspection</Text>
    </View>
    <View style={[styles.headerCellBase, styles.colInspectComp]}>
      <Text style={styles.headerText}>Inspection Comp</Text>
    </View>
    <View style={[styles.headerCellBase, styles.colInv]}>
      <Text style={styles.headerText}>Invoiced</Text>
    </View>
    <View style={[styles.headerCellBase, styles.colInvDate]}>
      <Text style={styles.headerText}>Inv Date</Text>
    </View>
    <View
      style={[styles.headerCellBase, styles.colInvNum, { borderRightWidth: 0 }]}
    >
      <Text style={styles.headerText}>Inv #</Text>
    </View>
  </View>
);

export type PastShippingReportPdfProps = {
  data: PastShippingJob[];
  startDate: Date | null;
  endDate: Date | null;
};

export const PastShippingReportPdf = ({
  data,
  startDate,
  endDate,
}: PastShippingReportPdfProps) => {
  const grouped = data.reduce((acc, job) => {
    const ps = safeGet(job.production_schedule);
    const dateKey = ps?.ship_schedule || "No Date";

    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(job);
    return acc;
  }, {} as Record<string, PastShippingJob[]>);

  const sortedDates = Object.keys(grouped).sort((a, b) => {
    if (a === "No Date") return 1;
    if (b === "No Date") return -1;
    return new Date(a).getTime() - new Date(b).getTime();
  });

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.headerContainer} fixed>
          <Text style={styles.reportTitle}>Past Shipping Report</Text>
          <View>
            <Text style={styles.metaInfo}>
              Printed: {dayjs().format("DD-MMM-YY")}
            </Text>
            <Text
              style={styles.metaInfo}
              render={({ pageNumber, totalPages }) =>
                `Page ${pageNumber} of ${totalPages}`
              }
            />
            <Text style={styles.metaInfo}>
              Range: {startDate ? dayjs(startDate).format("DD-MMM") : "?"} -{" "}
              {endDate ? dayjs(endDate).format("DD-MMM") : "?"}
            </Text>
          </View>
        </View>

        <View>
          {sortedDates.map((dateKey) => {
            const jobs = grouped[dateKey];
            const dateObj = dayjs(dateKey);
            const formattedDate =
              dateKey === "No Date"
                ? "Unscheduled"
                : dateObj.format("DD-MMM-YY");
            const dayName = dateKey === "No Date" ? "" : dateObj.format("dddd");

            const boxTotal = jobs.reduce((sum, job) => {
              const so = safeGet(job.sales_orders);
              const cab = safeGet(so?.cabinets);
              const box = parseInt(cab?.box || "0", 10);
              return isNaN(box) ? sum : sum + box;
            }, 0);

            return (
              <View key={dateKey} wrap={true}>
                <View style={styles.dateGroupHeader}>
                  <Text style={styles.dateGroupText}>Ship Date:</Text>
                  <Text style={styles.dateGroupText}>{formattedDate}</Text>
                  <Text style={styles.dateGroupText}>{dayName}</Text>
                </View>

                <ColumnHeaders />

                {jobs.map((job) => {
                  const so = safeGet(job.sales_orders);
                  const cab = safeGet(so?.cabinets);
                  const inst = job.installation;
                  const inv = safeGet(job.invoices);

                  const jobNum = job.job_number || "—";
                  const clientName = so?.shipping_client_name || "Unknown";
                  const address =
                    [so?.shipping_street, so?.shipping_city]
                      .filter(Boolean)
                      .join(", ") || "—";
                  const box = cab?.box || "0";
                  const delivery = so?.delivery_type || "—";

                  let installerName = "—";
                  if (inst?.installers) {
                    installerName =
                      inst.installers.first_name ||
                      inst.installers.last_name ||
                      inst.installers.company_name ||
                      "—";
                  }

                  const installDate = inst?.installation_date
                    ? dayjs(inst.installation_date).format("DD/MM/YY")
                    : "—";

                  const installCompDate = inst?.installation_completed
                    ? dayjs(inst.installation_completed).format("DD/MM/YY")
                    : "—";

                  const inspectDate = inst?.inspection_date
                    ? dayjs(inst.inspection_date).format("DD/MM/YY")
                    : "—";

                  const inspectCompDate = inst?.inspection_completed
                    ? dayjs(inst.inspection_completed).format("DD/MM/YY")
                    : "—";

                  const hasInvoice = !!inv;
                  const invDate = inv?.date_entered
                    ? dayjs(inv.date_entered).format("DD/MM/YY")
                    : "—";
                  const invNum = inv?.invoice_number || "—";

                  return (
                    <View style={styles.tableRow} key={job.id} wrap={false}>
                      <View style={[styles.cellBase, styles.colJob]}>
                        <Text style={styles.cellText}>{jobNum}</Text>
                      </View>
                      <View style={[styles.cellBase, styles.colCust]}>
                        <Text style={styles.cellText}>
                          {clientName.substring(0, 18)}
                        </Text>
                      </View>
                      <View style={[styles.cellBase, styles.colAddr]}>
                        <Text style={styles.cellTextSmall}>
                          {address.substring(0, 22)}
                        </Text>
                      </View>

                      <View style={[styles.cellBase, styles.colBox]}>
                        <Text style={[styles.cellText, { fontWeight: "bold" }]}>
                          {box}
                        </Text>
                      </View>

                      <View style={[styles.cellBase, styles.colDel]}>
                        <Text style={styles.cellTextSmall}>
                          {delivery.substring(0, 10)}
                        </Text>
                      </View>

                      <View style={[styles.cellBase, styles.colInstDate]}>
                        <Text style={styles.cellText}>{installDate}</Text>
                      </View>

                      <View style={[styles.cellBase, styles.colInstComp]}>
                        <Text style={styles.cellText}>{installCompDate}</Text>
                      </View>

                      <View style={[styles.cellBase, styles.colInstName]}>
                        <Text style={styles.cellTextSmall}>
                          {installerName.substring(0, 15)}
                        </Text>
                      </View>

                      <View style={[styles.cellBase, styles.colInspect]}>
                        <Text style={styles.cellText}>{inspectDate}</Text>
                      </View>

                      <View style={[styles.cellBase, styles.colInspectComp]}>
                        <Text style={styles.cellText}>{inspectCompDate}</Text>
                      </View>

                      <View style={[styles.cellBase, styles.colInv]}>
                        <Checkbox checked={hasInvoice} />
                      </View>

                      <View style={[styles.cellBase, styles.colInvDate]}>
                        <Text style={styles.cellText}>{invDate}</Text>
                      </View>

                      <View
                        style={[
                          styles.cellBase,
                          styles.colInvNum,
                          { borderRightWidth: 0 },
                        ]}
                      >
                        <Text style={styles.cellText}>
                          {invNum.substring(0, 10)}
                        </Text>
                      </View>
                    </View>
                  );
                })}

                <View style={styles.totalRow} wrap={false}>
                  <Text style={styles.totalText}>Total Boxes: {boxTotal}</Text>
                </View>
              </View>
            );
          })}
        </View>

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
