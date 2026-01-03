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
    installation: Tables<"installation">;
};

const ITEMS_PER_PAGE = 45;
const BORDER_COLOR = "#e0e0e0";
const HEADER_BORDER_COLOR = "#000";

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


    colPlace: { width: "6%", alignItems: "center" },
    colJob: { width: "8%" },
    colCust: { width: "14%" },
    colAddr: { width: "18%" },
    colBox: { width: "3%", alignItems: "center" },
    colDoor: { width: "15%" },
    colSpec: { width: "6%" },
    colColor: { width: "10%" },
    colCheck: { width: "4%", alignItems: "center" },


    headerText: { fontSize: 8, fontWeight: "bold", textAlign: "center" },
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
        <View style={[styles.headerCellBase, styles.colPlace]}>
            <Text style={styles.headerText}>Placement</Text>
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
        <View style={[styles.headerCellBase, styles.colCheck]}>
            <Text style={styles.headerText}>D</Text>
        </View>
        <View style={[styles.headerCellBase, styles.colCheck]}>
            <Text style={styles.headerText}>P</Text>
        </View>
        <View style={[styles.headerCellBase, styles.colCheck]}>
            <Text style={styles.headerText}>F/C</Text>
        </View>
        <View style={[styles.headerCellBase, styles.colCheck]}>
            <Text style={styles.headerText}>P/S</Text>
        </View>
        <View
            style={[styles.headerCellBase, styles.colCheck, { borderRightWidth: 0 }]}
        >
            <Text style={styles.headerText}>A</Text>
        </View>
    </View>
);

export const WrapSchedulePdf = ({
    data,
    startDate,
    endDate,
}: {
    data: ShippingReportJob[];
    startDate: Date | null;
    endDate: Date | null;
}) => {
    const grouped = data.reduce((acc, job) => {

        const install = safeGet(job.installation);
        const dateKey = install?.wrap_date || "No Date";

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
                <Text style={styles.dateGroupText}>Wrap Date:</Text>
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
                    <View style={[styles.cellBase, styles.colPlace]}>
                        <Checkbox checked={Boolean(ps?.placement_date)} />
                    </View>
                    <View style={[styles.cellBase, styles.colJob]}>
                        <Text style={styles.cellText}>{jobNum}</Text>
                    </View>
                    <View style={[styles.cellBase, styles.colCust]}>
                        <Text style={styles.cellText}>{clientName.substring(0, 20)}</Text>
                    </View>
                    <View style={[styles.cellBase, styles.colAddr]}>
                        <Text style={styles.cellTextSmall}>{address.substring(0, 25)}</Text>
                    </View>

                    <View style={[styles.cellBase, styles.colBox]}>
                        <Text style={[styles.cellText, { fontWeight: "bold" }]}>{box}</Text>
                    </View>
                    <View style={[styles.cellBase, styles.colDoor]}>
                        <Text style={styles.cellTextSmall}>{door.substring(0, 20)}</Text>
                    </View>

                    <View style={[styles.cellBase, styles.colSpec]}>
                        <Text style={styles.cellTextSmall}>{species.substring(0, 15)}</Text>
                    </View>
                    <View style={[styles.cellBase, styles.colColor]}>
                        <Text style={styles.cellTextSmall}>{color.substring(0, 15)}</Text>
                    </View>

                    <View style={[styles.cellBase, styles.colCheck]}>
                        <Checkbox checked={Boolean(ps?.doors_completed_actual)} />
                    </View>
                    <View style={[styles.cellBase, styles.colCheck]}>
                        <Checkbox checked={Boolean(ps?.cut_finish_completed_actual)} />
                    </View>
                    <View style={[styles.cellBase, styles.colCheck]}>
                        <Checkbox checked={Boolean(ps?.custom_finish_completed_actual)} />
                    </View>
                    <View style={[styles.cellBase, styles.colCheck]}>
                        <Checkbox checked={Boolean(ps?.paint_completed_actual)} />
                    </View>
                    <View
                        style={[styles.cellBase, styles.colCheck, { borderRightWidth: 0 }]}
                    >
                        <Checkbox checked={Boolean(ps?.assembly_completed_actual)} />
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
                        <Text style={styles.reportTitle}>Wrap Schedule Report</Text>
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
