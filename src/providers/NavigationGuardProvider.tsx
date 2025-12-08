"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { useRouter } from "next/navigation";
import { Modal, Button, Text, Group, Stack, ThemeIcon } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { FaExclamationTriangle } from "react-icons/fa";

interface NavigationGuardContextType {
  isDirty: boolean;
  setIsDirty: (value: boolean) => void;
  navigateBack: () => void;
  navigateForward: () => void;
  navigatePush: (path: string) => void;
}

const NavigationGuardContext = createContext<NavigationGuardContextType | null>(
  null
);

export const useNavigationGuard = () => {
  const context = useContext(NavigationGuardContext);
  if (!context)
    throw new Error(
      "useNavigationGuard must be used within NavigationGuardProvider"
    );
  return context;
};

export default function NavigationGuardProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isDirty, setIsDirty] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [opened, { open, close }] = useDisclosure(false);
  const router = useRouter();

  // Handle Browser Native Events (Refresh/Close Tab)
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isDirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    if (isDirty) window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // Generic Interceptor
  const executeOrConfirm = useCallback(
    (action: () => void) => {
      if (isDirty) {
        setPendingAction(() => action);
        open();
      } else {
        action();
      }
    },
    [isDirty, open]
  );

  // Navigation Actions
  const navigateBack = useCallback(
    () => executeOrConfirm(() => router.back()),
    [executeOrConfirm, router]
  );
  const navigateForward = useCallback(
    () => executeOrConfirm(() => router.forward()),
    [executeOrConfirm, router]
  );
  const navigatePush = useCallback(
    (path: string) => executeOrConfirm(() => router.push(path)),
    [executeOrConfirm, router]
  );

  const handleConfirmLeave = () => {
    setIsDirty(false); // Reset dirty state
    close();
    if (pendingAction) pendingAction();
  };

  return (
    <NavigationGuardContext.Provider
      value={{
        isDirty,
        setIsDirty,
        navigateBack,
        navigateForward,
        navigatePush,
      }}
    >
      {children}

      {/* Centralized Confirmation Modal */}
      <Modal
        opened={opened}
        onClose={close}
        title="Unsaved Changes"
        centered
        overlayProps={{ blur: 3, opacity: 0.55 }}
      >
        <Stack align="center" gap="md">
          <ThemeIcon size={60} radius="100%" color="orange" variant="light">
            <FaExclamationTriangle size={30} />
          </ThemeIcon>
          <Text ta="center" size="sm">
            You have unsaved changes. Are you sure you want to leave?
          </Text>
          <Group justify="center" w="100%" mt="sm">
            <Button variant="default" onClick={close} fullWidth>
              Keep Editing
            </Button>
            <Button
              color="red"
              variant="filled"
              onClick={handleConfirmLeave}
              fullWidth
            >
              Discard & Leave
            </Button>
          </Group>
        </Stack>
      </Modal>
    </NavigationGuardContext.Provider>
  );
}
