"use client";

import { usePathname } from "next/navigation";
import {
  Stack,
  Group,
  Code,
  Text,
  rem,
  useMantineTheme,
  Box,
  px,
} from "@mantine/core";
import Link from "next/link";
import {
  FaHome,
  FaUsers,
  FaShippingFast,
  FaTools,
  FaShoppingBag,
} from "react-icons/fa";
import { FaGears } from "react-icons/fa6";
import { MdFactory } from "react-icons/md";
import { GoTools } from "react-icons/go";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";

type SidebarLink = {
  iconName: string;
  label: string;
  path: string;
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
};

type MainLinkProps = SidebarLink & {
  active: boolean;
};

function MainLink({ iconName, label, path, active }: MainLinkProps) {
  const Icon = iconMap[iconName] || FaHome;

  return (
    <Link href={path} style={{ textDecoration: "none" }}>
      <Group
        p="xs"
        style={{
          borderRadius: 6,
          backgroundColor: active ? "rgba(255, 255, 255, 0.1)" : "transparent",
          color: active ? "#fff" : "rgba(255, 255, 255, 0.7)",
          cursor: "pointer",
          transition: "all 0.3s",
        }}
        onMouseEnter={(e) => {
          if (!active)
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
          if (!active) e.currentTarget.style.color = "#fff";
        }}
        onMouseLeave={(e) => {
          if (!active) e.currentTarget.style.background = "transparent";
          if (!active) e.currentTarget.style.color = "rgba(255, 255, 255, 0.7)";
        }}
      >
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

        <Text size="sm" fw={active ? 600 : 400}>
          {label}
        </Text>
      </Group>
    </Link>
  );
}

export default function Sidebar({ links }: SidebarProps) {
  const pathname = usePathname();
  const theme = useMantineTheme();

  return (
    <Box
      style={{
        width: rem(200),
        height: "100vh",
        overflowY: "auto",
        background: "linear-gradient(180deg, #7b2ff7, #2b86c5)",
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
      <Stack style={{ flexGrow: 1 }}>
        {links.map((link) => (
          <MainLink
            key={link.label}
            {...link}
            active={pathname === link.path}
          />
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
                  // THIS is the real clickable button ✔
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
