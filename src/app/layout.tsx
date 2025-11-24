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
import Sidebar from "@/components/Sidebar/Sidebar";
import { usePathname } from "next/navigation";
const Quicksand = localFont({
  src: "../../public/Fonts/Quicksand/Quicksand-Regular.ttf",
});
const dashboardLinks: {
  iconName: string;
  label: string;
  path: string;
}[] = [
  { iconName: "FaHome", label: "Sales", path: "/dashboard" },
  { iconName: "FaGears", label: "Production", path: "/dashboard/production" },
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

  { iconName: "FaUsers", label: "Clients", path: "/dashboard/clients" },
  {
    iconName: "MdFactory",
    label: "Plant",
    path: "/dashboard/production/actuals/37",
  },
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
                      {children}
                    </div>
                  </div>
                </MantineProvider>
              </QueryProvider>
            </SupabaseProvider>
          </ClerkTokenProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
