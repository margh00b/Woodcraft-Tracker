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
} from "@mantine/core";
import Link from "next/link";
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
} from "react-icons/fa";
import { FaGears } from "react-icons/fa6";
import { MdFactory, MdSupervisorAccount } from "react-icons/md";
import { GoTools } from "react-icons/go";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";

export type SidebarLink = {
  iconName: string;
  label: string;
  path?: string;
  links?: SidebarLink[];
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
};

function MainLink({ item }: { item: SidebarLink }) {
  const pathname = usePathname();
  const Icon = iconMap[item.iconName] || FaHome;
  const hasLinks = Array.isArray(item.links);

  // Determine active state
  const isActive = item.path ? pathname === item.path : false;

  // FIX: Ensure this is strictly boolean by using '?? false'
  const isChildActive = hasLinks
    ? item.links?.some((link) => pathname === link.path) ?? false
    : false;

  // State for collapse
  const [opened, setOpened] = useState(isChildActive);

  // Auto-open if a child is active (on mount or path change)
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
    <Link
      href={item.path || "#"}
      style={{ textDecoration: "none", display: "block" }}
    >
      {linkContent}
    </Link>
  );
}

export default function Sidebar({ links }: SidebarProps) {
  const theme = useMantineTheme();

  return (
    <Box
      style={{
        width: rem(220),
        height: "100vh",
        overflowY: "auto",
        background: "linear-gradient(0deg, #7b2de2ff 20%, #4A00E0 80%)",
        borderRight: `1px solid ${theme.colors.gray[3]}`,
        display: "flex",
        flexDirection: "column",
        padding: theme.spacing.md,
      }}
    >
      {/* Logo */}
      <Group justify="space-between" mb="lg">
        <Text fz="lg" fw={700} style={{ color: "white" }}>
          WCKC Tracker
        </Text>
      </Group>

      {/* Links */}
      <Stack gap="xs" style={{ flexGrow: 1 }}>
        {links.map((link) => (
          <MainLink key={link.label} item={link} />
        ))}
      </Stack>

      {/* Clerk Auth Buttons (bottom) */}
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
                  background:
                    "linear-gradient(135deg, #f0edff 0%, #e4dbff 100%)",
                  border: "1px solid #d3c9ff",
                  cursor: "pointer",
                  transition: "0.2s ease",
                  "&:hover": {
                    opacity: 0.9,
                  },
                },
                userButtonOuterIdentifier: {
                  color: "#4A00E0",
                  fontWeight: 600,
                  fontSize: "14px",
                },
                avatarBox: {
                  border: "2px solid #6C63FF",
                },
              },
            }}
          />
        </SignedIn>
      </Box>
    </Box>
  );
}
