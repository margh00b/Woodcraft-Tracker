"use client";

import { useUser } from "@clerk/nextjs";

export function usePermissions() {
  const { user, isLoaded } = useUser();
  const role = user?.publicMetadata?.role as string | undefined;

  const isAdmin = role === "admin";
  const isDesigner = role === "designer";
  const isScheduler = role === "scheduler";
  const isInstaller = role === "installation";
  const isService = role === "service";
  const isPlant = role === "plant";
  const isReception = role === "reception";
  const isManager = role === "manager";
  const isInspection = role === "inspection";

  const canEditSales = isAdmin || isDesigner || isScheduler;
  const canEditProduction = isAdmin || isScheduler;
  const canEditInstallation = isAdmin || isInstaller || isService;
  const canEditServiceOrders = isAdmin || isInstaller || isService;
  const canEditClients =
    isAdmin ||
    isDesigner ||
    isScheduler ||
    isInstaller ||
    isService ||
    isReception;
  const canEditPlant = isAdmin || isInstaller || isService || isPlant;
  const canEditInstallers = isAdmin || isInstaller || isService;
  const canEditPurchasing = isAdmin || isScheduler;
  const canEditInvoices = isAdmin || isReception || isService;
  const canEditReports = true;
  const canDelete = isAdmin;

  return {
    isLoaded,
    role,
    isAdmin,
    isDesigner,
    isScheduler,
    isInstaller,
    isService,
    isPlant,
    isReception,
    isManager,
    isInspection,
    canEditSales,
    canEditProduction,
    canEditInstallation,
    canEditServiceOrders,
    canEditClients,
    canEditPlant,
    canEditInstallers,
    canEditPurchasing,
    canEditInvoices,
    canEditReports,
    canDelete,
    is: (checkRole: string) => role === checkRole,
  };
}
