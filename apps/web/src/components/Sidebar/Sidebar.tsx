"use client";

import { usePathname } from "next/navigation";
import {
  Stack,
  Group,
  Text,
  rem,
  Box,
  Collapse,
  UnstyledButton,
  Center,
  Tooltip,
  Menu,
  ActionIcon,
  Code,
  ScrollArea,
} from "@mantine/core";
import { useState, useEffect } from "react";
import { useMediaQuery } from "@mantine/hooks";
import { SignedIn, UserButton } from "@clerk/nextjs";
import {
  TbLayoutDashboard,
  TbInbox,
  TbCurrencyDollar,
  TbTools,
  TbShoppingCart,
  TbTruckDelivery,
  TbCalendarEvent,
  TbMapPin,
  TbFileDescription,
  TbBuildingWarehouse,
  TbTool,
  TbClockHour4,
  TbChecklist,
  TbBuildingFactory2,
  TbPackage,
  TbFileInvoice,
  TbChartBar,
  TbBox,
  TbListCheck,
  TbUsers,
  TbUserCog,
  TbChevronRight,
  TbChevronLeft,
  TbMenu2,
  TbArchive,
  TbAlertTriangle,
  TbActivity,
} from "react-icons/tb";
import { useNavigationGuard } from "@/providers/NavigationGuardProvider";
import TopNavigationBar from "../Shared/TopNavigationBar/TopNavigationBar";
import Link from "next/link";
import { colors, linearGradients } from "@/theme";
import { usePermissions } from "@/hooks/usePermissions";

export type UserRole =
  | "admin"
  | "designer"
  | "scheduler"
  | "installation"
  | "service"
  | "plant"
  | "reception"
  | "manager"
  | "inspection";

export type SidebarLink = {
  iconName: string;
  label: string;
  path?: string;
  links?: SidebarLink[];
  permission?: boolean;
  allowedRoles?: UserRole[];
};

type SidebarProps = {
  links: SidebarLink[];
  autoCollapsePatterns?: string[];
};

const iconMap: Record<string, any> = {
  LayoutDashboard: TbLayoutDashboard,
  Inbox: TbInbox,
  CircleDollarSign: TbCurrencyDollar,
  Hammer: TbTools,
  ShoppingCart: TbShoppingCart,
  Truck: TbTruckDelivery,
  CalendarDays: TbCalendarEvent,
  MapPin: TbMapPin,
  FilePenLine: TbFileDescription,
  Warehouse: TbBuildingWarehouse,
  Wrench: TbTool,
  Timer: TbClockHour4,
  ClipboardCheck: TbChecklist,
  Factory: TbBuildingFactory2,
  Package: TbPackage,
  ReceiptText: TbFileInvoice,
  FileChartColumn: TbChartBar,
  Box: TbBox,
  ListTodo: TbListCheck,
  Users: TbUsers,
  UserCog: TbUserCog,
  Archive: TbArchive,
  FileWarning: TbAlertTriangle,
  Activity: TbActivity,
};

function MainLink({
  item,
  collapsed,
}: {
  item: SidebarLink;
  collapsed: boolean;
}) {
  const pathname = usePathname();
  const Icon = iconMap[item.iconName] || TbLayoutDashboard;
  const hasLinks = Array.isArray(item.links) && item.links.length > 0;
  const { navigatePush } = useNavigationGuard();

  const isChildActive = hasLinks
    ? item.links?.some(
        (link) => pathname === link.path || pathname.startsWith(link.path + "/")
      ) ?? false
    : false;

  const isActive = item.path
    ? pathname === item.path ||
      (!hasLinks &&
        item.path !== "/dashboard" &&
        pathname.startsWith(item.path))
    : false;

  const [opened, setOpened] = useState(isChildActive);

  useEffect(() => {
    if (isChildActive && !collapsed) setOpened(true);
  }, [isChildActive, collapsed]);

  const navItemStyle = {
    borderRadius: 6,
    backgroundColor:
      isActive || isChildActive ? "rgba(255, 255, 255, 0.15)" : "transparent",
    color: "#fff",
    cursor: "pointer",
    width: "100%",
    minHeight: rem(40),
    display: "flex",
    alignItems: "center",
    transition: "background 150ms ease",
  };

  const handleNavigation = (e: React.MouseEvent, path: string | undefined) => {
    if (!path) return;
    if (e.metaKey || e.ctrlKey || e.button === 1) return;
    e.preventDefault();
    navigatePush(path);
  };

  if (collapsed) {
    if (hasLinks) {
      return (
        <Menu
          position="right-start"
          offset={10}
          trigger="hover"
          openDelay={0}
          closeDelay={50}
          withinPortal
          transitionProps={{ transition: "fade", duration: 100 }}
        >
          <Menu.Target>
            <UnstyledButton p="xs" style={navItemStyle}>
              <Center style={{ width: "100%" }}>
                <Icon size={24} color="white" />
              </Center>
            </UnstyledButton>
          </Menu.Target>
          <Menu.Dropdown
            style={{
              background: linearGradients.primaryVertical,
              border: `1px solid ${colors.violet.light}`,
              boxShadow: "0 10px 20px rgba(0,0,0,0.2)",
              padding: "8px",
              borderRadius: "12px",
            }}
          >
            <Menu.Label
              style={{ color: "white", opacity: 0.7, fontWeight: 700 }}
            >
              {item.label}
            </Menu.Label>
            {item.links?.map((link) => {
              const SubIcon = iconMap[link.iconName] || TbLayoutDashboard;
              return (
                <Menu.Item
                  key={link.label}
                  className="sidebar-submenu-item"
                  leftSection={<SubIcon size={18} color="white" />}
                  component={(link.path ? Link : "button") as any}
                  href={link.path || undefined}
                  onClick={(e: React.MouseEvent) =>
                    handleNavigation(e, link.path)
                  }
                  data-active={pathname === link.path}
                >
                  {link.label}
                </Menu.Item>
              );
            })}
          </Menu.Dropdown>
        </Menu>
      );
    }

    return (
      <Tooltip
        label={item.label}
        position="right"
        withArrow
        openDelay={100}
        offset={10}
        transitionProps={{ duration: 150, transition: "slide-left" }}
        styles={{
          tooltip: {
            backgroundColor: colors.violet.primary,
            color: "white",
            fontWeight: 600,
            fontSize: rem(12),
            padding: "8px 12px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
          },
        }}
      >
        <UnstyledButton
          component={(item.path ? Link : "button") as any}
          href={item.path || undefined}
          p="xs"
          display="flex"
          style={{ ...navItemStyle, justifyContent: "center" }}
          onClick={(e: React.MouseEvent) => handleNavigation(e, item.path)}
        >
          <Icon size={26} color="white" />
        </UnstyledButton>
      </Tooltip>
    );
  }

  return (
    <>
      <UnstyledButton
        component={(!hasLinks && item.path ? Link : "button") as any}
        href={!hasLinks && item.path ? item.path : undefined}
        onClick={(e: React.MouseEvent) => {
          if (hasLinks) {
            setOpened((o) => !o);
          } else {
            handleNavigation(e, item.path);
          }
        }}
        p="xs"
        style={navItemStyle}
      >
        <Group justify="space-between" wrap="nowrap" style={{ width: "100%" }}>
          <Group gap="sm" wrap="nowrap">
            <Icon size={22} color="white" />
            <Text
              size="sm"
              fw={isActive || isChildActive ? 600 : 400}
              style={{ whiteSpace: "nowrap" }}
            >
              {item.label}
            </Text>
          </Group>
          {hasLinks && (
            <TbChevronRight
              size={18}
              color="white"
              style={{
                transform: opened ? "rotate(90deg)" : "none",
                transition: "transform 200ms ease",
                flexShrink: 0,
              }}
            />
          )}
        </Group>
      </UnstyledButton>
      {hasLinks && (
        <Collapse in={opened}>
          <Stack
            gap={2}
            mt={4}
            pl={20}
            style={{
              borderLeft: "1px solid rgba(255,255,255,0.1)",
              marginLeft: rem(12),
            }}
          >
            {item.links?.map((link) => (
              <MainLink key={link.label} item={link} collapsed={collapsed} />
            ))}
          </Stack>
        </Collapse>
      )}
    </>
  );
}

export default function Sidebar({
  links,
  autoCollapsePatterns = [],
}: SidebarProps) {
  const isSmallScreen = useMediaQuery("(max-width: 1024px)");
  const [collapsed, setCollapsed] = useState(false);
  const { hasAnyRole } = usePermissions();
  const pathname = usePathname();

  useEffect(() => {
    if (isSmallScreen) {
      setCollapsed(true);
    } else {
      const shouldAutoCollapse = autoCollapsePatterns.some((pattern) =>
        pathname.startsWith(pattern)
      );
      setCollapsed(shouldAutoCollapse);
    }
  }, [isSmallScreen, pathname, autoCollapsePatterns]);

  const filterLinks = (items: SidebarLink[]): SidebarLink[] => {
    return items
      .filter((link) => {
        if (link.permission) return false;
        if (link.allowedRoles && !hasAnyRole(link.allowedRoles)) return false;
        return true;
      })
      .map((link) => {
        if (link.links) {
          const filteredChildren = filterLinks(link.links);
          if (!link.path && filteredChildren.length === 0) return null;
          return { ...link, links: filteredChildren };
        }
        return link;
      })
      .filter((link): link is SidebarLink => link !== null);
  };

  const visibleLinks = filterLinks(links);

  const width = collapsed ? rem(70) : rem(240);

  return (
    <Box
      component="nav"
      style={{
        width: width,
        minWidth: width,
        height: "100vh",
        background: linearGradients.primaryVertical,
        display: "flex",
        flexDirection: "column",
        transition: "width 250ms cubic-bezier(0.4, 0, 0.2, 1)",
        position: "sticky",
        top: 0,
        left: 0,
        zIndex: 100,
        overflow: "hidden",
      }}
    >
      <Box p="md">
        <Group
          justify={collapsed ? "center" : "space-between"}
          mb={collapsed ? 35 : "lg"}
          wrap="nowrap"
          style={{ transition: "margin-bottom 200ms ease" }}
        >
          {!collapsed && (
            <Text
              fz="lg"
              fw={800}
              style={{ color: "white", whiteSpace: "nowrap" }}
            >
              WCKC Tracker{" "}
              <Code
                style={{
                  fontSize: "8px",
                  color: "#fff",
                  backgroundColor: "#5700bbff",
                }}
              >
                v1.0.3
              </Code>
            </Text>
          )}
          <ActionIcon
            variant="subtle"
            color="white"
            onClick={() => setCollapsed(!collapsed)}
            size="lg"
            style={{ flexShrink: 0 }}
          >
            {collapsed ? (
              <TbMenu2 size={28} color="white" />
            ) : (
              <TbChevronLeft size={22} color="white" />
            )}
          </ActionIcon>
        </Group>

        <Box
          style={{
            height: rem(50),
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            transition: "all 250ms ease",
          }}
        >
          <TopNavigationBar />
        </Box>
      </Box>

      <ScrollArea
        type="hover"
        scrollbars="y"
        style={{ flexGrow: 1 }}
        styles={{
          scrollbar: {
            backgroundColor: "transparent",
            "&:hover": {
              backgroundColor: "transparent",
            },
            width: "15px",
          },
          thumb: {
            backgroundColor: colors.violet.light,
            borderRadius: "100vh",
            border: "2px solid transparent",
            backgroundClip: "content-box",
            opacity: 0.8,
            transition: "opacity 0.1s ease, background-color 0.1s ease",
            "&:hover": {
              backgroundColor: "#fff",
              opacity: 0.9,
            },
          },
          corner: {
            backgroundColor: "transparent",
          },
        }}
      >
        <Stack gap={2} px="md">
          {visibleLinks.map((link) => (
            <MainLink key={link.label} item={link} collapsed={collapsed} />
          ))}
        </Stack>
      </ScrollArea>

      <Box p="md" mt="auto">
        <SignedIn>
          <UserButton
            showName={!collapsed}
            appearance={{
              elements: {
                rootBox: { width: "100%" },
                userButtonTrigger: {
                  width: "100%",
                  justifyContent: "center",
                  background: linearGradients.lightViolet,
                  padding: collapsed ? "8px 0" : "8px 12px",
                  borderRadius: "8px",
                  transition: "padding 250ms ease",
                },
                userButtonOuterIdentifier: {
                  color: colors.violet.primary,
                  fontWeight: 700,
                  display: collapsed ? "none" : "block",
                },
              },
            }}
          />
        </SignedIn>
      </Box>
    </Box>
  );
}
