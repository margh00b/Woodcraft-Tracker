"use client";

import { usePathname } from "next/navigation";
import {
  Stack,
  Group,
  Text,
  rem,
  useMantineTheme,
  Box,
  Collapse,
  UnstyledButton,
  Center,
} from "@mantine/core";
import { useState, useEffect } from "react";
import {
  FaHome,
  FaUsers,
  FaShippingFast,
  FaTools,
  FaShoppingBag,
  FaFileInvoice,
  FaChevronRight,
  FaCalendarAlt,
  FaClipboardCheck,
  FaTruckLoading,
  FaBoxOpen,
} from "react-icons/fa";
import { FaGears } from "react-icons/fa6";
import { MdFactory, MdFeedback, MdSupervisorAccount } from "react-icons/md";
import { GoTools } from "react-icons/go";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { GrSchedules } from "react-icons/gr";

import { useNavigationGuard } from "@/providers/NavigationGuardProvider";
import TopNavigationBar from "../Shared/TopNavigationBar/TopNavigationBar";
import Link from "next/link";
import { colors, linearGradients } from "@/theme";

export type SidebarLink = {
  iconName: string;
  label: string;
  path?: string;
  links?: SidebarLink[];
  permission?: boolean;
};

type SidebarProps = {
  links: SidebarLink[];
};

const iconMap: Record<string, any> = {
  FaHome,
  FaUsers,
  FaGears,
  FaShippingFast,
  FaTools,
  MdFactory,
  GoTools,
  FaShoppingBag,
  FaFileInvoice,
  FaCalendarAlt,
  FaClipboardCheck,
  FaTruckLoading,
  MdSupervisorAccount,
  GrSchedules,
  FaBoxOpen,
  MdFeedback,
};

function MainLink({ item }: { item: SidebarLink }) {
  const pathname = usePathname();
  const Icon = iconMap[item.iconName] || FaHome;
  const hasLinks = Array.isArray(item.links);
  const { navigatePush } = useNavigationGuard();

  const isActive = item.path ? pathname === item.path : false;
  const isChildActive = hasLinks
    ? item.links?.some((link) => pathname === link.path) ?? false
    : false;

  const [opened, setOpened] = useState(isChildActive);

  useEffect(() => {
    if (isChildActive) {
      setOpened(true);
    }
  }, [isChildActive]);

  const linkContent = (
    <Group
      justify="space-between"
      p="xs"
      style={{
        borderRadius: 6,
        backgroundColor:
          isActive || (hasLinks && isChildActive)
            ? "rgba(255, 255, 255, 0.1)"
            : "transparent",
        color:
          isActive || (hasLinks && isChildActive)
            ? "#fff"
            : "rgba(255, 255, 255, 0.7)",
        cursor: "pointer",
        transition: "all 0.3s",
      }}
      onMouseEnter={(e) => {
        if (!isActive && !isChildActive) {
          e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
          e.currentTarget.style.color = "#fff";
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive && !isChildActive) {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "rgba(255, 255, 255, 0.7)";
        }
      }}
    >
      <Group gap="xs">
        <Box
          style={{
            width: rem(18),
            height: rem(18),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon style={{ width: rem(18), height: rem(18) }} />
        </Box>
        <Text size="sm" fw={isActive || isChildActive ? 600 : 400}>
          {item.label}
        </Text>
      </Group>
      {hasLinks && (
        <FaChevronRight
          size={12}
          style={{
            transform: opened ? "rotate(90deg)" : "none",
            transition: "transform 200ms ease",
          }}
        />
      )}
    </Group>
  );

  if (hasLinks) {
    return (
      <>
        <UnstyledButton
          onClick={() => setOpened((o) => !o)}
          style={{ width: "100%", display: "block" }}
        >
          {linkContent}
        </UnstyledButton>
        <Collapse in={opened}>
          <Stack
            gap={2}
            mt={2}
            pl={10}
            style={{
              borderLeft: "1px solid rgba(255,255,255,0.1)",
              marginLeft: rem(14),
            }}
          >
            {item.links?.map((link) => (
              <MainLink key={link.label} item={link} />
            ))}
          </Stack>
        </Collapse>
      </>
    );
  }

  return (
    <UnstyledButton
      component={Link}
      href={item.path || "#"}
      onClick={(e: React.MouseEvent) => {
        if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) {
          return;
        }
        e.preventDefault();
        if (item.path) {
          navigatePush(item.path);
        }
      }}
      style={{ width: "100%", display: "block" }}
    >
      {linkContent}
    </UnstyledButton>
  );
}

export default function Sidebar({ links }: SidebarProps) {
  const theme = useMantineTheme();

  return (
    <Box
      style={{
        width: rem(220),
        minWidth: rem(220),
        height: "100vh",
        overflowY: "auto",
        scrollbarWidth: "none",
        background: linearGradients.primaryVertical,
        borderRight: `1px solid ${theme.colors.gray[3]}`,
        display: "flex",
        flexDirection: "column",
        padding: theme.spacing.md,
        paddingTop: 0,
      }}
    >
      <Center>
        <TopNavigationBar />
      </Center>
      {}
      <Group justify="space-between" mb="lg">
        <Text fz="lg" fw={700} style={{ color: "white" }}>
          WCKC Tracker
        </Text>
      </Group>

      {}
      <Stack gap="xs" style={{ flexGrow: 1 }}>
        {links.map(
          (link) =>
            !link.permission && <MainLink key={link.label} item={link} />
        )}
      </Stack>

      {}
      <Box mt="auto" pt="lg">
        <SignedOut>
          <SignInButton
            mode="modal"
            appearance={{
              elements: {
                button: {
                  background: "#1a73e8",
                  color: "#fff",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "1px solid #1669c1",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 150ms ease",
                  "&:hover": {
                    background: "#1669c1",
                  },
                },
              },
            }}
          />
        </SignedOut>
        <SignedIn>
          <UserButton
            showName={true}
            appearance={{
              elements: {
                rootBox: {
                  width: "100%",
                },
                userButtonTrigger: {
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%",
                  gap: "8px",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  background: linearGradients.lightViolet,
                  border: "1px solid #d3c9ff",
                  cursor: "pointer",
                  transition: "0.2s ease",
                  "&:hover": {
                    opacity: 0.9,
                  },
                },
                userButtonOuterIdentifier: {
                  color: colors.violet.primary,
                  fontWeight: 600,
                  fontSize: "14px",
                },
                avatarBox: {
                  border: `2px solid ${colors.violet.light}`,
                },
              },
            }}
          />
        </SignedIn>
      </Box>
    </Box>
  );
}
