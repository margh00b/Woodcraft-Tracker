"use client";

import { useSupabase } from "@/hooks/useSupabase";

export function usePermissions() {
  const { user, isLoading } = useSupabase();

  const role = user?.app_metadata?.role as string | undefined;
  const subRole = user?.app_metadata?.sub_role as string | undefined;

  const isAdmin = role === "admin";
  const isDesigner = role === "designer";
  const isScheduler = role === "scheduler";
  const isInstaller = role === "installation";
  const isService = role === "service";
  const isPlant = role === "plant";
  const isReception = role === "reception";
  const isManager = role === "manager";
  const isInspection = role === "inspection";

  const canEditSales = isAdmin || isDesigner || isScheduler || isReception;
  const canEditProduction = isAdmin || isScheduler;
  const canEditInstallation = isAdmin || isInstaller || isService;
  const canEditInspections = isAdmin || isInspection || isInstaller;
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
    isLoaded: !isLoading,
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
    canEditInspections,
    canEditServiceOrders,
    canEditClients,
    canEditPlant,
    canEditInstallers,
    canEditPurchasing,
    canEditInvoices,
    canEditReports,
    canDelete,
    subRole,
    is: (checkRole: string) => role === checkRole,
    isSub: (checkSubRole: string) => subRole === checkSubRole,
    hasAnyRole: (roles: string[]) => roles.includes(role || ""),
    hasAnySubRole: (subRoles: string[]) => subRoles.includes(subRole || ""),
  };
}
