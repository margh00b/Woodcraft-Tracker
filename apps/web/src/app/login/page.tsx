"use client";

import { useState, Suspense } from "react";
import {
  Alert,
  Button,
  Container,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
  Paper,
  Group,
  Box,
  ThemeIcon,
  Divider,
  SimpleGrid,
  rem,
} from "@mantine/core";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  FaArrowRight,
  FaBoxOpen,
  FaCalendarCheck,
  FaShieldAlt,
  FaUser,
  FaLock,
  FaTools,
} from "react-icons/fa";
function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const normalizedUsername = username.trim().toLowerCase();

      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: `${normalizedUsername}@auth.woodcraftkc.com`,
        password,
      });

      if (loginError) {
        setError("Invalid username or password.");
        return;
      }

      const requestedDestination = searchParams.get("next");
      const destination =
        requestedDestination?.startsWith("/") &&
        !requestedDestination.startsWith("//") &&
        !requestedDestination.startsWith("/\\")
          ? requestedDestination
          : "/dashboard";

      router.replace(destination);
      router.refresh();
    } catch {
      setError("Unable to sign in. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Box
      mih="100vh"
      style={{
        background:
          "radial-gradient(ellipse at 12% 10%, rgba(167,139,250,0.28), transparent 38%), radial-gradient(ellipse at 90% 85%, rgba(124,58,237,0.20), transparent 40%), linear-gradient(135deg, #F8F7FF 0%, #F0EBFF 48%, #E9E7FF 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: rem(24),
        overflow: "hidden",
        position: "relative",
      }}
    >
      <Box
        aria-hidden="true"
        pos="absolute"
        top="-180px"
        right="-130px"
        w={450}
        h={450}
        style={{
          borderRadius: "50%",
          background:
            "linear-gradient(135deg, rgba(139,92,246,0.22), rgba(76,29,149,0.04))",
          filter: "blur(2px)",
          pointerEvents: "none",
        }}
      />

      <Box
        aria-hidden="true"
        pos="absolute"
        bottom="-240px"
        left="-120px"
        w={520}
        h={520}
        style={{
          borderRadius: "50%",
          background:
            "linear-gradient(135deg, rgba(196,181,253,0.30), rgba(124,58,237,0.12))",
          filter: "blur(3px)",
          pointerEvents: "none",
        }}
      />

      <Container
        size={1180}
        w="100%"
        p={0}
        style={{ position: "relative", zIndex: 1 }}
      >
        <Paper
          radius={rem(28)}
          shadow="0 30px 100px rgba(76, 29, 149, 0.15)"
          withBorder
          style={{
            overflow: "hidden",
            borderColor: "rgba(255,255,255,0.9)",
            background: "rgba(255,255,255,0.72)",
            backdropFilter: "blur(24px)",
          }}
        >
          <SimpleGrid
            cols={{ base: 1, md: 2 }}
            spacing={0}
            style={{ minHeight: rem(690) }}
          >
            <Box
              p={{ base: "xl", sm: 48 }}
              style={{
                background:
                  "linear-gradient(145deg, #FFFFFF 0%, #F4F0FF 52%, #E8DEFF 100%)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <Box
                aria-hidden="true"
                pos="absolute"
                bottom="-100px"
                right="-100px"
                w={300}
                h={300}
                style={{
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle, rgba(139,92,246,0.18), transparent 70%)",
                  pointerEvents: "none",
                }}
              />

              <Box style={{ position: "relative", zIndex: 1 }}>
                <Group gap="sm" align="center" mb={64}>
                  <ThemeIcon
                    size={54}
                    radius="xl"
                    variant="gradient"
                    gradient={{ from: "#8B5CF6", to: "#4C1D95", deg: 135 }}
                    style={{
                      boxShadow: "0 10px 28px rgba(109,40,217,0.26)",
                    }}
                  >
                    <FaTools size={25} />
                  </ThemeIcon>

                  <Box>
                    <Text
                      fw={900}
                      size="lg"
                      c="#21134B"
                      style={{ letterSpacing: "0.11em", lineHeight: 1.2 }}
                    >
                      WOODCRAFT
                    </Text>
                    <Text
                      size="xs"
                      fw={700}
                      c="#7C5BC7"
                      style={{ letterSpacing: "0.34em" }}
                    >
                      CORE
                    </Text>
                  </Box>
                </Group>

                <Text
                  size="xs"
                  fw={800}
                  c="#7C3AED"
                  tt="uppercase"
                  style={{ letterSpacing: "0.2em" }}
                  mb="md"
                >
                  Your workspace, reimagined
                </Text>

                <Title
                  order={1}
                  c="#21134B"
                  style={{
                    fontSize: "clamp(2.5rem, 4vw, 3.7rem)",
                    lineHeight: 1.08,
                    letterSpacing: "-0.055em",
                    fontWeight: 850,
                  }}
                >
                  Build better.
                  <br />
                  <Text
                    component="span"
                    inherit
                    variant="gradient"
                    gradient={{ from: "#A78BFA", to: "#5B21B6", deg: 110 }}
                  >
                    Manage smarter.
                  </Text>
                </Title>

                <Text c="#71658F" size="md" mt="xl" maw={390} lh={1.8}>
                  Everything your team needs to keep jobs moving, service orders
                  organized, and projects on track.
                </Text>

                <Stack gap="md" mt={40}>
                  {[
                    {
                      icon: FaCalendarCheck,
                      title: "Stay on schedule",
                      description: "Keep jobs and service dates organized.",
                    },
                    {
                      icon: FaBoxOpen,
                      title: "Know what comes next",
                      description: "Manage orders, parts, and job progress.",
                    },
                    {
                      icon: FaShieldAlt,
                      title: "One connected workspace",
                      description: "Give your team a clearer view of the work.",
                    },
                  ].map((item) => (
                    <Group
                      key={item.title}
                      gap="md"
                      wrap="nowrap"
                      align="center"
                    >
                      <ThemeIcon
                        size={44}
                        radius="lg"
                        variant="white"
                        color="violet"
                        style={{
                          border: "1px solid #E8DEFF",
                          boxShadow: "0 5px 16px rgba(76,29,149,0.05)",
                          flexShrink: 0,
                        }}
                      >
                        <item.icon size={17} />
                      </ThemeIcon>

                      <Box>
                        <Text fw={700} c="#302052" size="sm">
                          {item.title}
                        </Text>
                        <Text size="xs" c="#817496" mt={3}>
                          {item.description}
                        </Text>
                      </Box>
                    </Group>
                  ))}
                </Stack>
              </Box>

              <Box
                mt={48}
                p="lg"
                style={{
                  position: "relative",
                  zIndex: 1,
                  border: "1px solid rgba(167,139,250,0.25)",
                  borderRadius: rem(18),
                  background: "rgba(255,255,255,0.60)",
                }}
              >
                <Text c="#4C3479" fw={600} size="sm" lh={1.7}>
                  “Great things happen when people and process work together.”
                </Text>
                <Text
                  c="#9275D2"
                  size="xs"
                  mt="sm"
                  style={{ letterSpacing: "0.08em" }}
                >
                  MADE FOR THE WAY YOUR TEAM WORKS
                </Text>
              </Box>
            </Box>

            <Box
              p={{ base: "xl", sm: 48, lg: 64 }}
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                background: "rgba(255,255,255,0.82)",
              }}
            >
              <Box maw={420} w="100%" mx="auto">
                <Box ta="center" mb={36}>
                  <ThemeIcon
                    size={68}
                    radius={22}
                    variant="gradient"
                    gradient={{ from: "#A78BFA", to: "#5B21B6", deg: 135 }}
                    mx="auto"
                    mb="xl"
                    style={{
                      boxShadow: "0 14px 30px rgba(109,40,217,0.23)",
                    }}
                  >
                    <FaTools size={28} />
                  </ThemeIcon>

                  <Title
                    order={2}
                    c="#21134B"
                    style={{
                      fontSize: rem(34),
                      letterSpacing: "-0.045em",
                      fontWeight: 850,
                    }}
                  >
                    Welcome back
                  </Title>

                  <Text c="#8A7DA3" mt="sm" size="sm">
                    Sign in to your Woodcraft CORE account
                  </Text>
                </Box>

                <form onSubmit={handleLogin}>
                  <Stack gap="lg">
                    {error && (
                      <Alert color="red" radius="md" title="Sign-in failed">
                        {error}
                      </Alert>
                    )}

                    <TextInput
                      label="Username"
                      placeholder="Enter your username"
                      leftSection={<FaUser size={14} />}
                      autoComplete="username"
                      value={username}
                      onChange={(event) =>
                        setUsername(event.currentTarget.value)
                      }
                      required
                      size="lg"
                      radius="md"
                      styles={{
                        label: {
                          color: "#39265D",
                          fontWeight: 700,
                          marginBottom: 8,
                        },
                        input: {
                          borderColor: "#E5DDF5",
                          background: "#FCFBFF",
                          fontSize: rem(14),
                          "&:focus": {
                            borderColor: "#8B5CF6",
                          },
                        },
                      }}
                    />

                    <PasswordInput
                      label="Password"
                      placeholder="Enter your password"
                      leftSection={<FaLock size={14} />}
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) =>
                        setPassword(event.currentTarget.value)
                      }
                      required
                      size="lg"
                      radius="md"
                      styles={{
                        label: {
                          color: "#39265D",
                          fontWeight: 700,
                          marginBottom: 8,
                        },
                        input: {
                          borderColor: "#E5DDF5",
                          background: "#FCFBFF",
                          fontSize: rem(14),
                        },
                        innerInput: {
                          fontSize: rem(14),
                        },
                      }}
                    />

                    <Button
                      type="submit"
                      fullWidth
                      size="lg"
                      radius="md"
                      loading={isLoading}
                      rightSection={!isLoading && <FaArrowRight size={14} />}
                      mt="xs"
                      style={{
                        background:
                          "linear-gradient(110deg, #8B5CF6 0%, #6D28D9 55%, #4C1D95 100%)",
                        boxShadow: "0 10px 24px rgba(109,40,217,0.24)",
                        border: 0,
                        fontWeight: 750,
                        transition:
                          "transform 150ms ease, box-shadow 150ms ease",
                      }}
                    >
                      Sign in
                    </Button>
                  </Stack>
                </form>

                <Divider
                  my={30}
                  color="#EEE7FA"
                  label={
                    <Text size="xs" c="#9B8CB4" fw={600}>
                      SECURE ACCESS
                    </Text>
                  }
                  labelPosition="center"
                />

                <Group justify="center" gap="xs" mb={32}>
                  <FaShieldAlt size={14} color="#8B5CF6" />
                  <Text size="xs" c="#8A7DA3">
                    Your workspace is protected by secure authentication.
                  </Text>
                </Group>

                <Paper
                  p="md"
                  radius="lg"
                  withBorder
                  style={{
                    borderColor: "#E8DEFF",
                    background:
                      "linear-gradient(135deg, rgba(245,241,255,0.9), rgba(255,255,255,0.9))",
                  }}
                >
                  <Group gap="sm" wrap="nowrap" align="flex-start">
                    <ThemeIcon
                      variant="light"
                      color="violet"
                      size={38}
                      radius="md"
                    >
                      <FaCalendarCheck size={16} />
                    </ThemeIcon>
                    <Box>
                      <Text fw={700} c="#39265D" size="sm">
                        Your work, all in one place
                      </Text>
                      <Text c="#8A7DA3" size="xs" mt={4} lh={1.6}>
                        Sign in to pick up where your team left off.
                      </Text>
                    </Box>
                  </Group>
                </Paper>

                <Text ta="center" size="xs" c="#A69AB8" mt={32}>
                  Woodcraft Kitchen Cabinets
                </Text>
              </Box>
            </Box>
          </SimpleGrid>
        </Paper>

        <Text
          ta="center"
          size="xs"
          c="#897DA2"
          mt="xl"
          style={{ letterSpacing: "0.03em" }}
        >
          WOODCRAFT KITCHEN CABINETS · INTERNAL WORKSPACE
        </Text>
      </Container>
    </Box>
  );
}
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <Container size={420} my="15vh">
          <Title order={2} ta="center">
            Woodcraft Tracker
          </Title>
          <Text c="dimmed" size="sm" ta="center" mt="xs">
            Loading sign-in...
          </Text>
        </Container>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
