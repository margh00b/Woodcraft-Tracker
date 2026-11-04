"use client";
import "./globals.css";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/tiptap/styles.css";
import "@mantine/dropzone/styles.css";

import {
  ColorSchemeScript,
  MantineProvider,
  mantineHtmlProps,
} from "@mantine/core";
import { DatesProvider } from "@mantine/dates";

import { Notifications } from "@mantine/notifications";
import localFont from "next/font/local";
import QueryProvider from "@/components/providers/QueryProvider";
import SupabaseProvider from "@/providers/SupabaseProvider";
import Sidebar, { ALL_ROLES, SidebarLink } from "@/components/Sidebar/Sidebar";
import { usePathname } from "next/navigation";
import NavigationGuardProvider from "@/providers/NavigationGuardProvider";

const Quicksand = localFont({
  src: "../../public/Fonts/Quicksand/Quicksand-Regular.ttf",
});
const dashboardLinks: SidebarLink[] = [
  {
    iconName: "ReceiptText",
    label: "App Reports",
    allowedRoles: ["admin", "installation", "service", "designer", "safety"],
    links: [
      {
        iconName: "ClipboardCheck",
        label: "Install Reports",
        path: "/dashboard/install-reports",
        allowedRoles: ["admin", "installation", "service", "designer"],
      },
      {
        iconName: "MapPin",
        label: "Markout Reports",
        path: "/dashboard/markout-reports",
        allowedRoles: ["admin", "installation", "service", "designer"],
      },
      {
        iconName: "AlertTriangle",
        label: "FLHA Reports",
        path: "/dashboard/flha-reports",
        allowedRoles: ["admin", "safety"],
      },
    ],
  },
  {
    iconName: "LayoutDashboard",
    label: "Overview",
    path: "/dashboard",
    allowedRoles: ALL_ROLES.filter((role) => !["safety"].includes(role)),
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
    allowedRoles: ["designer", "admin", "manager", "reception"],
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
        allowedRoles: ["admin", "installation", "service", "reception"],
      },
      {
        iconName: "MapPin",
        label: "Site Visits",
        path: "/dashboard/installation/site-visits",
        allowedRoles: ["admin", "installation", "service", "reception"],
      },
      {
        iconName: "FilePenLine",
        label: "Site Changes",
        path: "/dashboard/installation/site-changes",
        allowedRoles: ["admin", "installation", "service", "reception"],
      },
      {
        iconName: "Warehouse",
        label: "Warehouse",
        path: "/dashboard/installation/warehouse",
        allowedRoles: ["admin", "installation", "service", "reception"],
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
        allowedRoles: ["admin", "plant", "service", "installation"],
      },
      {
        iconName: "Truck",
        label: "Shipping",
        path: "/dashboard/plant/ship",
        allowedRoles: ["admin", "plant", "service", "installation"],
      },
      {
        iconName: "Wrench",
        label: "Service Orders",
        path: "/dashboard/plant/service-orders",
        allowedRoles: ["admin", "plant", "service", "installation"],
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
        allowedRoles: ["admin", "reception"],
      },
      {
        iconName: "FileWarning",
        label: "Not Invoiced",
        path: "/dashboard/invoices/notinvoiced",
        allowedRoles: ["admin", "reception"],
      },
      {
        iconName: "Wrench",
        label: "Service Orders",
        path: "/dashboard/invoices/chargeableservice",
        allowedRoles: ["admin", "reception"],
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
    allowedRoles: ALL_ROLES.filter((role) => !["safety"].includes(role)),
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
  {
    iconName: "UserCog",
    label: "User Management",
    path: "/admin/users",
    allowedRoles: ["admin"],
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
    <html lang="en" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript />
      </head>

      <body className={`${Quicksand.className} `}>
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
      </body>
    </html>
  );
}
