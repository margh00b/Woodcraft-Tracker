"use client";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/core/styles/baseline.css";
import "@mantine/core/styles/default-css-variables.css";
import "@mantine/core/styles/global.css";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/tiptap/styles.css";
import "./globals.css";
import { MantineProvider, mantineHtmlProps } from "@mantine/core";

import { ClerkProvider } from "@clerk/nextjs";
import { Notifications } from "@mantine/notifications";
import localFont from "next/font/local";
import QueryProvider from "@/components/providers/QueryProvider";
import ClerkTokenProvider from "@/providers/ClerkTokenProvider";
import SupabaseProvider from "@/providers/SupabaseProvider";
import Sidebar, { SidebarLink } from "@/components/Sidebar/Sidebar";
import { usePathname } from "next/navigation";
import NavigationGuardProvider from "@/providers/NavigationGuardProvider";
import TopNavigationBar from "@/components/Shared/TopNavigationBar/TopNavigationBar";

const Quicksand = localFont({
  src: "../../public/Fonts/Quicksand/Quicksand-Regular.ttf",
});

const dashboardLinks: SidebarLink[] = [
  {
    iconName: "MdSupervisorAccount",
    label: "Overview",
    path: "/dashboard",
  },
  { iconName: "FaHome", label: "Sales", path: "/dashboard/sales" },
  { iconName: "FaGears", label: "Production", path: "/dashboard/production" },
  {
    iconName: "FaShoppingBag",
    label: "Purchasing",
    path: "/dashboard/purchasing",
  },
  {
    iconName: "FaShippingFast",
    label: "Installation",
    path: "/dashboard/installation",
  },
  {
    iconName: "FaTools",
    label: "Service Orders",
    path: "/dashboard/serviceorders",
  },
  {
    iconName: "FaClipboardCheck",
    label: "Inspections",
    path: "/dashboard/inspections",
  },
  {
    iconName: "MdFactory",
    label: "Plant",
    links: [
      {
        iconName: "GrSchedules",
        label: "Master Table",
        path: "/dashboard/plant/master",
      },
      {
        iconName: "FaCalendarAlt",
        label: "Wrap Schedule",
        path: "/dashboard/plant/wrap",
      },
      {
        iconName: "FaCalendarAlt",
        label: "Ship Schedule",
        path: "/dashboard/plant/ship",
      },
      {
        iconName: "FaClipboardCheck",
        label: "Prod Actuals",
        path: "/dashboard/plant/actuals",
      },
    ],
  },

  { iconName: "FaFileInvoice", label: "Invoices", path: "/dashboard/invoices" },
  {
    iconName: "FaClipboardCheck",
    label: "Reports",
    links: [
      {
        iconName: "FaTruckLoading",
        label: "Shipping",
        path: "/dashboard/reports/shippingreport",
      },
      {
        iconName: "FaBoxOpen",
        label: "Box Count",
        path: "/dashboard/reports/boxcountreport",
      },
    ],
  },

  { iconName: "FaUsers", label: "Clients", path: "/dashboard/clients" },
  { iconName: "GoTools", label: "Installers", path: "/dashboard/installers" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const showSidebar = pathname.startsWith("/dashboard");
  return (
    <ClerkProvider>
      <html lang="en" {...mantineHtmlProps}>
        <head></head>

        <body className={`${Quicksand.className} `}>
          <ClerkTokenProvider>
            <SupabaseProvider>
              <QueryProvider>
                <MantineProvider>
                  <Notifications />
                  <NavigationGuardProvider>
                    <div
                      style={{
                        display: "flex",
                        minHeight: "100vh",
                      }}
                    >
                      {showSidebar && <Sidebar links={dashboardLinks} />}
                      <div
                        style={{
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        {/* Page Content */}
                        <div style={{ flex: 1, position: "relative" }}>
                          {children}
                        </div>
                      </div>
                    </div>
                  </NavigationGuardProvider>
                </MantineProvider>
              </QueryProvider>
            </SupabaseProvider>
          </ClerkTokenProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
