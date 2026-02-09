"use client";
import "./globals.css";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/core/styles/baseline.css";
import "@mantine/core/styles/default-css-variables.css";
import "@mantine/core/styles/global.css";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/tiptap/styles.css";
import "@mantine/dropzone/styles.css";

import { MantineProvider, mantineHtmlProps } from "@mantine/core";
import { DatesProvider } from "@mantine/dates";

import { ClerkProvider } from "@clerk/nextjs";
import { Notifications } from "@mantine/notifications";
import localFont from "next/font/local";
import QueryProvider from "@/components/providers/QueryProvider";
import ClerkTokenProvider from "@/providers/ClerkTokenProvider";
import SupabaseProvider from "@/providers/SupabaseProvider";
import Sidebar, { SidebarLink } from "@/components/Sidebar/Sidebar";
import { usePathname } from "next/navigation";
import NavigationGuardProvider from "@/providers/NavigationGuardProvider";

const Quicksand = localFont({
  src: "../../public/Fonts/Quicksand/Quicksand-Regular.ttf",
});

const dashboardLinks: SidebarLink[] = [
  {
    iconName: "LayoutDashboard",
    label: "Overview",
    path: "/dashboard",
  },
  {
    iconName: "Inbox",
    label: "Inbox",
    path: "/dashboard/inbox",
    allowedRoles: ["admin", "installation"],
  },
  {
    iconName: "CircleDollarSign",
    label: "Sales",
    path: "/dashboard/sales",
    allowedRoles: ["designer", "admin", "manager"],
  },
  {
    iconName: "Hammer",
    label: "Production",
    path: "/dashboard/production",
    allowedRoles: ["admin", "scheduler", "reception"],
  },
  {
    iconName: "ShoppingCart",
    label: "Purchasing",
    path: "/dashboard/purchasing",
    allowedRoles: ["admin", "scheduler", "installation", "plant"],
  },

  {
    iconName: "Truck",
    label: "Installation",
    allowedRoles: ["admin", "installation", "service", "reception"],
    links: [
      {
        iconName: "CalendarDays",
        label: "Schedule",
        path: "/dashboard/installation",
      },
      {
        iconName: "MapPin",
        label: "Site Visits",
        path: "/dashboard/installation/site-visits",
      },
      {
        iconName: "FilePenLine",
        label: "Site Changes",
        path: "/dashboard/installation/site-changes",
      },
      {
        iconName: "Warehouse",
        label: "Warehouse",
        path: "/dashboard/installation/warehouse",
      },
    ],
  },
  {
    iconName: "Wrench",
    label: "Service Orders",
    path: "/dashboard/serviceorders",
    allowedRoles: ["admin", "installation", "service"],
  },
  {
    iconName: "Timer",
    label: "Backorders",
    path: "/dashboard/backorders",
    allowedRoles: ["admin", "scheduler", "service", "installation", "plant"],
  },
  {
    iconName: "ClipboardCheck",
    label: "Inspections",
    path: "/dashboard/inspections",
    allowedRoles: ["admin", "installation", "inspection"],
  },
  {
    iconName: "Factory",
    label: "Plant",
    allowedRoles: ["admin", "plant", "service", "installation"],
    links: [
      {
        iconName: "Package",
        label: "Production",
        path: "/dashboard/plant/production",
      },
      /* {
        iconName: "Package",
        label: "Wrapping",
        path: "/dashboard/plant/wrap",
      }, */
      {
        iconName: "Truck",
        label: "Shipping",
        path: "/dashboard/plant/ship",
      },
      {
        iconName: "Wrench",
        label: "Service Orders",
        path: "/dashboard/plant/service-orders",
      },
    ],
  },

  {
    iconName: "ReceiptText",
    label: "Invoices",
    allowedRoles: ["admin", "reception"],
    links: [
      {
        iconName: "ReceiptText",
        label: "All Invoices",
        path: "/dashboard/invoices/allinvoices",
      },
      {
        iconName: "FileWarning",
        label: "Not Invoiced",
        path: "/dashboard/invoices/notinvoiced",
      },
      {
        iconName: "Wrench",
        label: "Service Orders",
        path: "/dashboard/invoices/chargeableservice",
      },
    ],
  },
  {
    iconName: "Archive",
    label: "Dead Jobs",
    path: "/dashboard/deadjobs",
    allowedRoles: ["admin", "designer"],
  },
  {
    iconName: "FileChartColumn",
    label: "Reports",
    path: "/dashboard/reports",
  },

  {
    iconName: "Users",
    label: "Clients",
    path: "/dashboard/clients",
    allowedRoles: ["designer", "admin", "manager"],
  },
  {
    iconName: "UserCog",
    label: "Installers",
    path: "/dashboard/installers",
    allowedRoles: ["admin", "installation", "service"],
  },
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
                  <DatesProvider
                    settings={{ firstDayOfWeek: 0, weekendDays: [0, 6] }}
                  >
                    <Notifications />
                    <NavigationGuardProvider>
                      <div
                        style={{
                          display: "flex",
                          minHeight: "100vh",
                        }}
                      >
                        {showSidebar && (
                          <Sidebar
                            links={dashboardLinks}
                            autoCollapsePatterns={[
                              "/dashboard/installation",
                              "/dashboard/sales/newsale",
                            ]}
                          />
                        )}
                        <div
                          style={{
                            flex: 1,
                            minWidth: 0,
                          }}
                        >
                          <div style={{ flex: 1, position: "relative" }}>
                            {children}
                          </div>
                        </div>
                      </div>
                    </NavigationGuardProvider>
                  </DatesProvider>
                </MantineProvider>
              </QueryProvider>
            </SupabaseProvider>
          </ClerkTokenProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
