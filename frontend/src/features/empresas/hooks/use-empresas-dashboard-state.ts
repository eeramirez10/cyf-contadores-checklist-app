"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import {
  normalizeChecklist,
  normalizeClient,
  normalizeClientActivity,
  normalizeGroup,
  normalizeTemplate,
  normalizeUser,
} from "@/features/empresas/services/empresas-mappers";
import type {
  DbActivityAreaRow,
  DbChecklistRow,
  DbClientActivityRow,
  DbClientRow,
  DbGroupRow,
  DbProfileRow,
  DbTemplateRow,
} from "@/features/empresas/types/empresas-db";
import {
  compareMonthDesc,
  currentMonthKey,
  entryKey,
  paginateItems,
} from "@/features/empresas/utils/empresas-helpers";
import { backendFetch } from "@/lib/backend-auth";
import { calculateProgress } from "@/lib/progress";
import { useAuth } from "@/features/auth/components/auth-provider";
import type {
  ActivityArea,
  ActivityTemplate,
  ChecklistEntry,
  Client,
  ClientActivity,
  Group,
  User,
} from "@/lib/types";

type ClientTableSortKey =
  | "client"
  | "owner"
  | "group"
  | "checks"
  | "ventas"
  | "produccion"
  | "progress"
  | "lastCompletedAt";

type SortDirection = "asc" | "desc";

type DashboardCatalog = {
  profiles: DbProfileRow[];
  groups: DbGroupRow[];
  areas: DbActivityAreaRow[];
  templates: DbTemplateRow[];
  clients: DbClientRow[];
  activities: DbClientActivityRow[];
  entries: DbChecklistRow[];
};

type CompanyContactDraft = {
  name: string;
  position: string;
  email: string;
  phone: string;
  whatsappPhone: string;
  notes: string;
  isPrimary: boolean;
};

type PostalCodeOption = { state: string; city: string };

const emptyCompanyContact = (): CompanyContactDraft => ({
  name: "",
  position: "",
  email: "",
  phone: "",
  whatsappPhone: "",
  notes: "",
  isPrimary: false,
});

export function useEmpresasDashboardState() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const {
    user: backendUser,
    status: backendAuthStatus,
    signOut: signOutFromBackend,
  } = useAuth();
  const authLoading = backendAuthStatus === "loading";
  const session = backendUser;

  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [templates, setTemplates] = useState<ActivityTemplate[]>([]);
  const [areas, setAreas] = useState<ActivityArea[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientActivities, setClientActivities] = useState<ClientActivity[]>(
    [],
  );
  const [entries, setEntries] = useState<ChecklistEntry[]>([]);
  const [dataLoading, setDataLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");

  const [selectedLeaderId, setSelectedLeaderId] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const [newClientName, setNewClientName] = useState<string>("");
  const [newClientMemberId, setNewClientMemberId] = useState<string>("");
  const [newClientDetails, setNewClientDetails] = useState({
    legalName: "",
    rfc: "",
    taxRegime: "",
    ekeyReference: "",
    street: "",
    exteriorNumber: "",
    interiorNumber: "",
    colony: "",
    postalCode: "",
    city: "",
    state: "",
  });
  const [newClientContacts, setNewClientContacts] = useState<
    CompanyContactDraft[]
  >([{ ...emptyCompanyContact(), isPrimary: true }]);
  const [postalCodeOptions, setPostalCodeOptions] = useState<
    PostalCodeOption[]
  >([]);
  const [postalLookupLoading, setPostalLookupLoading] = useState(false);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [newTemplateName, setNewTemplateName] = useState<string>("");
  const [newTemplateAreaId, setNewTemplateAreaId] = useState<string>("");
  const [newAreaName, setNewAreaName] = useState<string>("");
  const [newTemplateWeight, setNewTemplateWeight] = useState<number>(10);
  const [memberSearchQuery, setMemberSearchQuery] = useState<string>("");
  const [memberPage, setMemberPage] = useState<number>(1);
  const [memberClientSearchQuery, setMemberClientSearchQuery] =
    useState<string>("");
  const [memberClientPage, setMemberClientPage] = useState<number>(1);
  const [clientsSearchQuery, setClientsSearchQuery] = useState<string>("");
  const [clientsMemberFilter, setClientsMemberFilter] = useState<string>(
    () => searchParams.get("memberId") ?? "ALL",
  );
  const [clientsPage, setClientsPage] = useState<number>(1);
  const [clientsSortKey, setClientsSortKey] =
    useState<ClientTableSortKey>("client");
  const [clientsSortDirection, setClientsSortDirection] =
    useState<SortDirection>("asc");
  const [checklistModalClientId, setChecklistModalClientId] = useState<
    string | null
  >(null);

  const currentUser = users.find((item) => item.id === backendUser?.id) ?? null;

  const usersById = useMemo(
    () => new Map(users.map((user) => [user.id, user])),
    [users],
  );
  const groupsById = useMemo(
    () => new Map(groups.map((group) => [group.id, group])),
    [groups],
  );
  const monthFromQuery = searchParams.get("month");
  const memberIdFromQuery = searchParams.get("memberId");
  const clientIdFromQuery = searchParams.get("clientId");
  const month = useMemo(() => {
    if (monthFromQuery && /^\d{4}-\d{2}$/.test(monthFromQuery)) {
      return monthFromQuery;
    }
    return currentMonthKey();
  }, [monthFromQuery]);
  const setMonth = useCallback(
    (nextMonth: string) => {
      const normalized = /^\d{4}-\d{2}$/.test(nextMonth)
        ? nextMonth
        : currentMonthKey();
      const next = new URLSearchParams(searchParams.toString());
      next.set("month", normalized);
      const queryString = next.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  const loadData = useCallback(async () => {
    if (backendAuthStatus !== "authenticated") {
      return;
    }
    setDataLoading(true);
    setMessage("");
    try {
      const catalog =
        await backendFetch<DashboardCatalog>("/catalog/dashboard");
      setUsers(catalog.profiles.map(normalizeUser));
      setGroups(catalog.groups.map(normalizeGroup));
      setAreas(
        catalog.areas.map((area) => ({
          id: area.id,
          name: area.name,
          isActive: area.is_active,
        })),
      );
      setTemplates(catalog.templates.map(normalizeTemplate));
      setClients(catalog.clients.map(normalizeClient));
      setClientActivities(catalog.activities.map(normalizeClientActivity));
      setEntries(catalog.entries.map(normalizeChecklist));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar los datos.",
      );
    } finally {
      setDataLoading(false);
    }
  }, [backendAuthStatus]);

  useEffect(() => {
    if (backendAuthStatus !== "authenticated") {
      return;
    }
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [backendAuthStatus, loadData]);

  useEffect(() => {
    if (backendAuthStatus === "anonymous") {
      router.replace("/login");
    }
  }, [backendAuthStatus, router]);

  const leaders = useMemo(
    () =>
      users
        .filter((user) => user.role === "LEADER")
        .sort((a, b) => a.name.localeCompare(b.name)),
    [users],
  );
  const members = useMemo(
    () =>
      users
        .filter((user) => user.role === "MEMBER")
        .sort((a, b) => a.name.localeCompare(b.name)),
    [users],
  );

  const leadersVisibleToCurrent = useMemo(() => {
    if (!currentUser) {
      return [];
    }
    if (currentUser.role === "ADMIN") {
      return leaders;
    }
    if (currentUser.role === "LEADER") {
      return leaders.filter((leader) => leader.id === currentUser.id);
    }
    return [];
  }, [currentUser, leaders]);

  const membersVisibleToCurrent = useMemo(() => {
    if (!currentUser) {
      return [];
    }
    if (currentUser.role === "ADMIN") {
      return members;
    }
    if (currentUser.role === "LEADER") {
      return members.filter((member) => member.leaderId === currentUser.id);
    }
    return members.filter((member) => member.id === currentUser.id);
  }, [currentUser, members]);

  const memberIdsVisible = useMemo(
    () => new Set(membersVisibleToCurrent.map((member) => member.id)),
    [membersVisibleToCurrent],
  );

  const clientsVisibleToCurrent = useMemo(() => {
    return clients.filter(
      (client) => client.isActive && memberIdsVisible.has(client.memberId),
    );
  }, [clients, memberIdsVisible]);

  const clientsByMember = useMemo(() => {
    const map = new Map<string, Client[]>();
    for (const client of clientsVisibleToCurrent) {
      const current = map.get(client.memberId) ?? [];
      current.push(client);
      map.set(client.memberId, current);
    }
    for (const value of map.values()) {
      value.sort((a, b) => a.name.localeCompare(b.name));
    }
    return map;
  }, [clientsVisibleToCurrent]);

  const memberIdFromQueryClient = useMemo(() => {
    if (!clientIdFromQuery) {
      return null;
    }
    const queryClient = clientsVisibleToCurrent.find(
      (client) => client.id === clientIdFromQuery,
    );
    return queryClient?.memberId ?? null;
  }, [clientIdFromQuery, clientsVisibleToCurrent]);

  const leaderIdFromQueryClient = useMemo(() => {
    if (!memberIdFromQueryClient) {
      return null;
    }
    return usersById.get(memberIdFromQueryClient)?.leaderId ?? null;
  }, [memberIdFromQueryClient, usersById]);

  const leaderIdFromQueryMember = useMemo(() => {
    if (!memberIdFromQuery) {
      return null;
    }
    if (
      !membersVisibleToCurrent.some((member) => member.id === memberIdFromQuery)
    ) {
      return null;
    }
    return usersById.get(memberIdFromQuery)?.leaderId ?? null;
  }, [memberIdFromQuery, membersVisibleToCurrent, usersById]);

  const selectedLeaderValue =
    currentUser?.role === "LEADER"
      ? currentUser.id
      : leadersVisibleToCurrent.some((leader) => leader.id === selectedLeaderId)
        ? selectedLeaderId
        : leaderIdFromQueryClient &&
            leadersVisibleToCurrent.some(
              (leader) => leader.id === leaderIdFromQueryClient,
            )
          ? leaderIdFromQueryClient
          : leaderIdFromQueryMember &&
              leadersVisibleToCurrent.some(
                (leader) => leader.id === leaderIdFromQueryMember,
              )
            ? leaderIdFromQueryMember
            : (leadersVisibleToCurrent[0]?.id ?? null);

  const membersUnderSelectedLeader = useMemo(() => {
    if (!selectedLeaderValue) {
      return [];
    }
    return membersVisibleToCurrent.filter(
      (member) => member.leaderId === selectedLeaderValue,
    );
  }, [membersVisibleToCurrent, selectedLeaderValue]);

  const selectedMemberValue =
    currentUser?.role === "MEMBER"
      ? currentUser.id
      : membersVisibleToCurrent.some((member) => member.id === selectedMemberId)
        ? selectedMemberId
        : memberIdFromQuery &&
            membersVisibleToCurrent.some(
              (member) => member.id === memberIdFromQuery,
            )
          ? memberIdFromQuery
          : memberIdFromQueryClient &&
              membersVisibleToCurrent.some(
                (member) => member.id === memberIdFromQueryClient,
              )
            ? memberIdFromQueryClient
            : (membersUnderSelectedLeader[0]?.id ??
              membersVisibleToCurrent[0]?.id ??
              null);

  const selectedMemberClients = useMemo(() => {
    if (!selectedMemberValue) {
      return [];
    }
    return clientsByMember.get(selectedMemberValue) ?? [];
  }, [clientsByMember, selectedMemberValue]);

  const selectedClientValue = useMemo(() => {
    if (
      selectedClientId &&
      clientsVisibleToCurrent.some((client) => client.id === selectedClientId)
    ) {
      return selectedClientId;
    }
    if (
      clientIdFromQuery &&
      clientsVisibleToCurrent.some((client) => client.id === clientIdFromQuery)
    ) {
      return clientIdFromQuery;
    }
    if (selectedMemberClients.length) {
      return selectedMemberClients[0].id;
    }
    if (currentUser?.role === "MEMBER" && clientsVisibleToCurrent.length) {
      return clientsVisibleToCurrent[0].id;
    }
    return clientsVisibleToCurrent[0]?.id ?? null;
  }, [
    clientIdFromQuery,
    clientsVisibleToCurrent,
    currentUser?.role,
    selectedClientId,
    selectedMemberClients,
  ]);

  const selectedClient = useMemo(
    () =>
      clientsVisibleToCurrent.find(
        (client) => client.id === selectedClientValue,
      ) ?? null,
    [clientsVisibleToCurrent, selectedClientValue],
  );

  const checklistModalClient = useMemo(
    () =>
      checklistModalClientId
        ? (clientsVisibleToCurrent.find(
            (client) => client.id === checklistModalClientId,
          ) ?? null)
        : null,
    [checklistModalClientId, clientsVisibleToCurrent],
  );

  const selectedClientActivities = useMemo(() => {
    if (!selectedClient) {
      return [];
    }
    return clientActivities
      .filter(
        (activity) =>
          activity.clientId === selectedClient.id && activity.isActive,
      )
      .sort((left, right) => left.displayOrder - right.displayOrder);
  }, [clientActivities, selectedClient]);

  const checklistModalClientActivities = useMemo(() => {
    if (!checklistModalClient) {
      return [];
    }
    return clientActivities
      .filter(
        (activity) =>
          activity.clientId === checklistModalClient.id && activity.isActive,
      )
      .sort((left, right) => left.displayOrder - right.displayOrder);
  }, [checklistModalClient, clientActivities]);

  const currentMonthEntryMap = useMemo(() => {
    const map = new Map<string, ChecklistEntry>();
    for (const entry of entries) {
      if (entry.month === month) {
        map.set(entryKey(month, entry.clientId, entry.templateId), entry);
      }
    }
    return map;
  }, [entries, month]);

  const availableMonths = useMemo(() => {
    const values = new Set(entries.map((entry) => entry.month));
    values.add(month);
    return Array.from(values).sort(compareMonthDesc);
  }, [entries, month]);

  const clientIdsVisible = useMemo(
    () => clientsVisibleToCurrent.map((client) => client.id),
    [clientsVisibleToCurrent],
  );

  const globalVisibleProgress = calculateProgress({
    entries,
    activities: clientActivities,
    clientIds: clientIdsVisible,
    month,
  });

  const progressByMember = useMemo(() => {
    const map = new Map<string, number>();
    for (const member of membersVisibleToCurrent) {
      const memberClientIds = (clientsByMember.get(member.id) ?? []).map(
        (client) => client.id,
      );
      map.set(
        member.id,
        calculateProgress({
          entries,
          activities: clientActivities,
          clientIds: memberClientIds,
          month,
        }),
      );
    }
    return map;
  }, [
    clientActivities,
    clientsByMember,
    entries,
    membersVisibleToCurrent,
    month,
  ]);

  const progressByLeader = useMemo(() => {
    const map = new Map<string, number>();
    for (const leader of leadersVisibleToCurrent) {
      const memberIds = membersVisibleToCurrent
        .filter((member) => member.leaderId === leader.id)
        .map((member) => member.id);
      const memberClientIds = clientsVisibleToCurrent
        .filter((client) => memberIds.includes(client.memberId))
        .map((client) => client.id);
      map.set(
        leader.id,
        calculateProgress({
          entries,
          activities: clientActivities,
          clientIds: memberClientIds,
          month,
        }),
      );
    }
    return map;
  }, [
    clientActivities,
    clientsVisibleToCurrent,
    entries,
    leadersVisibleToCurrent,
    membersVisibleToCurrent,
    month,
  ]);

  const progressByClient = useMemo(() => {
    const map = new Map<string, number>();
    for (const client of clientsVisibleToCurrent) {
      map.set(
        client.id,
        calculateProgress({
          entries,
          activities: clientActivities,
          clientIds: [client.id],
          month,
        }),
      );
    }
    return map;
  }, [clientActivities, clientsVisibleToCurrent, entries, month]);

  const progressByClientVentas = useMemo(() => {
    const map = new Map<string, number>();
    for (const client of clientsVisibleToCurrent) {
      map.set(
        client.id,
        calculateProgress({
          entries,
          activities: clientActivities,
          clientIds: [client.id],
          month,
          area: "VENTAS",
        }),
      );
    }
    return map;
  }, [clientActivities, clientsVisibleToCurrent, entries, month]);

  const progressByClientProduccion = useMemo(() => {
    const map = new Map<string, number>();
    for (const client of clientsVisibleToCurrent) {
      map.set(
        client.id,
        calculateProgress({
          entries,
          activities: clientActivities,
          clientIds: [client.id],
          month,
          area: "PRODUCCION",
        }),
      );
    }
    return map;
  }, [clientActivities, clientsVisibleToCurrent, entries, month]);

  const checklistStatsByClient = useMemo(() => {
    const map = new Map<
      string,
      {
        completedCount: number;
        totalCount: number;
        lastCompletedAt: string | null;
      }
    >();

    for (const client of clientsVisibleToCurrent) {
      map.set(client.id, {
        completedCount: 0,
        totalCount: 0,
        lastCompletedAt: null,
      });
    }

    for (const activity of clientActivities) {
      if (!activity.isActive) {
        continue;
      }
      const current = map.get(activity.clientId);
      if (!current) {
        continue;
      }
      current.totalCount += 1;
      const currentEntry = currentMonthEntryMap.get(
        entryKey(month, activity.clientId, activity.templateId),
      );
      if (!currentEntry?.completed) {
        continue;
      }
      current.completedCount += 1;
      if (
        currentEntry.completedAt &&
        (!current.lastCompletedAt ||
          currentEntry.completedAt > current.lastCompletedAt)
      ) {
        current.lastCompletedAt = currentEntry.completedAt;
      }
    }

    return map;
  }, [clientActivities, clientsVisibleToCurrent, currentMonthEntryMap, month]);

  const globalVisibleVentas = calculateProgress({
    entries,
    activities: clientActivities,
    clientIds: clientIdsVisible,
    month,
    area: "VENTAS",
  });

  const globalVisibleProduccion = calculateProgress({
    entries,
    activities: clientActivities,
    clientIds: clientIdsVisible,
    month,
    area: "PRODUCCION",
  });

  const selectedLeaderProgress = selectedLeaderValue
    ? (progressByLeader.get(selectedLeaderValue) ?? 0)
    : 0;
  const selectedMemberProgress = selectedMemberValue
    ? (progressByMember.get(selectedMemberValue) ?? 0)
    : 0;
  const selectedClientProgress = selectedClientValue
    ? (progressByClient.get(selectedClientValue) ?? 0)
    : 0;
  const selectedClientVentas = selectedClientValue
    ? (progressByClientVentas.get(selectedClientValue) ?? 0)
    : 0;
  const selectedClientProduccion = selectedClientValue
    ? (progressByClientProduccion.get(selectedClientValue) ?? 0)
    : 0;
  const checklistModalClientProgress = checklistModalClient
    ? (progressByClient.get(checklistModalClient.id) ?? 0)
    : 0;
  const checklistModalClientVentas = checklistModalClient
    ? (progressByClientVentas.get(checklistModalClient.id) ?? 0)
    : 0;
  const checklistModalClientProduccion = checklistModalClient
    ? (progressByClientProduccion.get(checklistModalClient.id) ?? 0)
    : 0;

  const canUncheck = currentUser?.role === "ADMIN";

  const memberDirectoryRows = useMemo(() => {
    const query = memberSearchQuery.trim().toLowerCase();
    const rows = membersVisibleToCurrent
      .map((member) => {
        const leaderName = member.leaderId
          ? (usersById.get(member.leaderId)?.name ?? "Sin lider de grupo")
          : "Sin lider de grupo";
        const groupName = member.groupId
          ? (groupsById.get(member.groupId)?.name ?? "Sin grupo")
          : "Sin grupo";
        const memberClients = clientsByMember.get(member.id) ?? [];
        return {
          id: member.id,
          name: member.name,
          leaderName,
          groupName,
          clientsCount: memberClients.length,
          progress: progressByMember.get(member.id) ?? 0,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    if (!query) {
      return rows;
    }

    return rows.filter((row) => {
      return (
        row.name.toLowerCase().includes(query) ||
        row.leaderName.toLowerCase().includes(query) ||
        row.groupName.toLowerCase().includes(query)
      );
    });
  }, [
    clientsByMember,
    groupsById,
    memberSearchQuery,
    membersVisibleToCurrent,
    progressByMember,
    usersById,
  ]);

  const memberPageSize = 8;
  const memberTotalPages = Math.max(
    1,
    Math.ceil(memberDirectoryRows.length / memberPageSize),
  );
  const memberCurrentPage = Math.min(memberPage, memberTotalPages);
  const visibleMemberRows = useMemo(() => {
    return paginateItems(
      memberDirectoryRows,
      memberCurrentPage,
      memberPageSize,
    );
  }, [memberCurrentPage, memberDirectoryRows]);

  const clientsBySelectedMemberFiltered = useMemo(() => {
    const query = memberClientSearchQuery.trim().toLowerCase();
    const base =
      currentUser?.role === "MEMBER"
        ? clientsVisibleToCurrent
        : selectedMemberClients;
    if (!query) {
      return base;
    }
    return base.filter((client) => client.name.toLowerCase().includes(query));
  }, [
    currentUser?.role,
    clientsVisibleToCurrent,
    memberClientSearchQuery,
    selectedMemberClients,
  ]);

  const memberClientPageSize = 10;
  const memberClientTotalPages = Math.max(
    1,
    Math.ceil(clientsBySelectedMemberFiltered.length / memberClientPageSize),
  );
  const memberClientCurrentPage = Math.min(
    memberClientPage,
    memberClientTotalPages,
  );
  const visibleMemberClients = useMemo(() => {
    return paginateItems(
      clientsBySelectedMemberFiltered,
      memberClientCurrentPage,
      memberClientPageSize,
    );
  }, [clientsBySelectedMemberFiltered, memberClientCurrentPage]);

  const clientsTableRows = useMemo(() => {
    const query = clientsSearchQuery.trim().toLowerCase();
    const scopedByMember =
      clientsMemberFilter === "ALL"
        ? clientsVisibleToCurrent
        : clientsVisibleToCurrent.filter(
            (client) => client.memberId === clientsMemberFilter,
          );

    const filtered = scopedByMember.filter((client) => {
      if (!query) {
        return true;
      }
      const ownerName = usersById.get(client.memberId)?.name ?? "";
      return (
        client.name.toLowerCase().includes(query) ||
        ownerName.toLowerCase().includes(query)
      );
    });

    const rows = filtered.map((client) => {
      const member = usersById.get(client.memberId);
      const stats = checklistStatsByClient.get(client.id);
      return {
        client,
        ownerName: member?.name ?? "Sin contador",
        groupName: member?.groupId
          ? (groupsById.get(member.groupId)?.name ?? "Sin grupo")
          : "Sin grupo",
        progress: progressByClient.get(client.id) ?? 0,
        ventas: progressByClientVentas.get(client.id) ?? 0,
        produccion: progressByClientProduccion.get(client.id) ?? 0,
        completedCount: stats?.completedCount ?? 0,
        totalCount: stats?.totalCount ?? 0,
        lastCompletedAt: stats?.lastCompletedAt ?? null,
      };
    });

    const directionFactor = clientsSortDirection === "asc" ? 1 : -1;

    rows.sort((left, right) => {
      if (clientsSortKey === "client") {
        return (
          left.client.name.localeCompare(right.client.name) * directionFactor
        );
      }
      if (clientsSortKey === "owner") {
        return left.ownerName.localeCompare(right.ownerName) * directionFactor;
      }
      if (clientsSortKey === "group") {
        return left.groupName.localeCompare(right.groupName) * directionFactor;
      }
      if (clientsSortKey === "checks") {
        const leftRatio =
          left.totalCount > 0 ? left.completedCount / left.totalCount : 0;
        const rightRatio =
          right.totalCount > 0 ? right.completedCount / right.totalCount : 0;
        if (leftRatio === rightRatio) {
          return (left.completedCount - right.completedCount) * directionFactor;
        }
        return (leftRatio - rightRatio) * directionFactor;
      }
      if (clientsSortKey === "ventas") {
        return (left.ventas - right.ventas) * directionFactor;
      }
      if (clientsSortKey === "produccion") {
        return (left.produccion - right.produccion) * directionFactor;
      }
      if (clientsSortKey === "progress") {
        return (left.progress - right.progress) * directionFactor;
      }

      const leftHasDate = Boolean(left.lastCompletedAt);
      const rightHasDate = Boolean(right.lastCompletedAt);
      if (!leftHasDate && !rightHasDate) {
        return (
          left.client.name.localeCompare(right.client.name) * directionFactor
        );
      }
      if (!leftHasDate) {
        return 1;
      }
      if (!rightHasDate) {
        return -1;
      }
      const leftTime = Date.parse(left.lastCompletedAt as string);
      const rightTime = Date.parse(right.lastCompletedAt as string);
      if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) {
        return (
          left.client.name.localeCompare(right.client.name) * directionFactor
        );
      }
      return (leftTime - rightTime) * directionFactor;
    });

    return rows;
  }, [
    checklistStatsByClient,
    clientsMemberFilter,
    clientsSortDirection,
    clientsSortKey,
    clientsSearchQuery,
    clientsVisibleToCurrent,
    groupsById,
    progressByClient,
    progressByClientProduccion,
    progressByClientVentas,
    usersById,
  ]);

  const clientsPageSize = 12;
  const clientsTotalPages = Math.max(
    1,
    Math.ceil(clientsTableRows.length / clientsPageSize),
  );
  const clientsCurrentPage = Math.min(clientsPage, clientsTotalPages);
  const visibleClientRows = useMemo(() => {
    return paginateItems(clientsTableRows, clientsCurrentPage, clientsPageSize);
  }, [clientsCurrentPage, clientsTableRows]);

  const toggleClientsSort = (key: ClientTableSortKey) => {
    setClientsPage(1);
    if (clientsSortKey === key) {
      setClientsSortDirection((current) =>
        current === "asc" ? "desc" : "asc",
      );
      return;
    }
    setClientsSortKey(key);
    setClientsSortDirection("asc");
  };

  const sortMarkerForClients = (key: ClientTableSortKey): string => {
    if (clientsSortKey !== key) {
      return "↕";
    }
    return clientsSortDirection === "asc" ? "↑" : "↓";
  };

  const openChecklistModal = useCallback(
    (clientId: string) => {
      const client = clientsVisibleToCurrent.find(
        (item) => item.id === clientId,
      );
      if (!client) {
        return;
      }
      setSelectedClientId(client.id);
      setChecklistModalClientId(client.id);
    },
    [clientsVisibleToCurrent],
  );

  const closeChecklistModal = useCallback(() => {
    setChecklistModalClientId(null);
  }, []);

  const goToMemberClients = useCallback(
    (memberId: string) => {
      const next = new URLSearchParams();
      next.set("month", month);
      next.set("memberId", memberId);
      router.push(`/empresas?${next.toString()}`);
    },
    [month, router],
  );

  const goToClientChecklist = useCallback(
    (clientId: string) => {
      const next = new URLSearchParams();
      next.set("month", month);
      next.set("clientId", clientId);
      router.push(`/empresas?${next.toString()}`);
    },
    [month, router],
  );

  useEffect(() => {
    if (!checklistModalClientId) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setChecklistModalClientId(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [checklistModalClientId]);

  const assignableMembers = useMemo(() => {
    if (!currentUser) {
      return [];
    }
    if (currentUser.role === "ADMIN") {
      return members;
    }
    if (currentUser.role === "LEADER") {
      return members.filter((member) => member.leaderId === currentUser.id);
    }
    return members.filter((member) => member.id === currentUser.id);
  }, [currentUser, members]);

  const assignableMemberValue = assignableMembers.some(
    (member) => member.id === newClientMemberId,
  )
    ? newClientMemberId
    : (assignableMembers[0]?.id ?? "");

  const signOut = async () => {
    await signOutFromBackend();
    setSelectedLeaderId(null);
    setSelectedMemberId(null);
    setSelectedClientId(null);
  };

  const toggleChecklist = async (clientId: string, templateId: string) => {
    const key = entryKey(month, clientId, templateId);
    const previous = currentMonthEntryMap.get(key);
    if (previous?.completed && !canUncheck) {
      setMessage("Solo Administrador puede quitar checks ya marcados.");
      return;
    }
    const nextCompleted = !previous?.completed;
    try {
      const data = await backendFetch<DbChecklistRow>(
        `/checklist/${clientId}/${templateId}?month=${month}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ completed: nextCompleted }),
        },
      );
      const normalized = normalizeChecklist(data);
      setEntries((current) => {
        const index = current.findIndex(
          (entry) =>
            entry.month === normalized.month &&
            entry.clientId === normalized.clientId &&
            entry.templateId === normalized.templateId,
        );
        if (index < 0) {
          return [...current, normalized];
        }
        const cloned = [...current];
        cloned[index] = normalized;
        return cloned;
      });
      setMessage(nextCompleted ? "Check registrado." : "Check retirado.");
    } catch (error) {
      setMessage(
        `No se pudo actualizar check: ${
          error instanceof Error ? error.message : "Error desconocido"
        }`,
      );
    }
  };

  const onCreateTemplate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = newTemplateName.trim();
    if (!trimmedName) {
      toast.warning("Escribe nombre para actividad estandar.");
      return false;
    }
    if (!newTemplateAreaId) {
      toast.warning("Crea o selecciona un area antes de agregar actividades.");
      return false;
    }
    if (newTemplateWeight <= 0 || newTemplateWeight > 100) {
      toast.warning("El peso debe estar entre 1 y 100.");
      return false;
    }
    try {
      const data = await backendFetch<DbTemplateRow>("/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          areaId: newTemplateAreaId,
          defaultWeight: newTemplateWeight,
        }),
      });
      setTemplates((current) => [...current, normalizeTemplate(data)]);
      setNewTemplateName("");
      setNewTemplateAreaId("");
      setNewTemplateWeight(10);
      toast.success("Actividad estandar creada.");
      return true;
    } catch (error) {
      toast.error(
        `No se pudo crear actividad estandar: ${
          error instanceof Error ? error.message : "Error desconocido"
        }`,
      );
      return false;
    }
  };

  const onCreateArea = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = newAreaName.trim();
    if (!name) {
      toast.warning("Escribe el nombre del area.");
      return;
    }
    try {
      const area = await backendFetch<ActivityArea>("/templates/areas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      setAreas((current) =>
        [...current, area].sort((left, right) =>
          left.name.localeCompare(right.name),
        ),
      );
      setNewTemplateAreaId(area.id);
      setNewAreaName("");
      toast.success("Area creada. Ya puedes agregar actividades.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo crear el area.",
      );
    }
  };

  const toggleTemplateActive = async (template: ActivityTemplate) => {
    try {
      const updated = await backendFetch<DbTemplateRow>(
        `/templates/${template.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: !template.isActive }),
        },
      );
      const normalized = normalizeTemplate(updated);
      setTemplates((current) =>
        current.map((item) => (item.id === normalized.id ? normalized : item)),
      );
    } catch (error) {
      toast.error(
        `No se pudo cambiar estado de plantilla: ${
          error instanceof Error ? error.message : "Error desconocido"
        }`,
      );
    }
  };

  const updateTemplateWeight = async (
    template: ActivityTemplate,
    nextWeight: number,
  ) => {
    if (!Number.isFinite(nextWeight) || nextWeight <= 0 || nextWeight > 100) {
      return;
    }
    try {
      const updated = await backendFetch<DbTemplateRow>(
        `/templates/${template.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ defaultWeight: nextWeight }),
        },
      );
      const normalized = normalizeTemplate(updated);
      setTemplates((current) =>
        current.map((item) => (item.id === normalized.id ? normalized : item)),
      );
    } catch (error) {
      toast.error(
        `No se pudo actualizar peso de plantilla: ${
          error instanceof Error ? error.message : "Error desconocido"
        }`,
      );
    }
  };

  const onCreateClient = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = newClientName.trim();
    if (!trimmedName) {
      toast.warning("Escribe nombre de la empresa.");
      return false;
    }
    if (!assignableMemberValue) {
      toast.warning("Selecciona contador.");
      return false;
    }
    if (!selectedTemplateIds.length) {
      toast.warning("Selecciona al menos una actividad estandar.");
      return false;
    }
    if (
      !newClientDetails.legalName.trim() ||
      !newClientDetails.rfc.trim() ||
      !newClientDetails.taxRegime
    ) {
      toast.warning("Completa razon social, RFC y regimen fiscal.");
      return false;
    }
    if (
      !newClientDetails.street.trim() ||
      !newClientDetails.exteriorNumber.trim() ||
      !newClientDetails.city ||
      !newClientDetails.state ||
      !/^\d{5}$/.test(newClientDetails.postalCode)
    ) {
      toast.warning(
        "Completa la direccion y un codigo postal de cinco digitos.",
      );
      return false;
    }
    if (
      !newClientContacts.length ||
      newClientContacts.some(
        (contact) =>
          !contact.name.trim() ||
          (!contact.email.trim() &&
            !contact.phone.trim() &&
            !contact.whatsappPhone.trim()),
      )
    ) {
      toast.warning(
        "Agrega al menos un contacto con nombre y medio de contacto.",
      );
      return;
    }

    try {
      const { clientId } = await backendFetch<{ clientId: string }>(
        "/companies",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: trimmedName,
            legalName: newClientDetails.legalName,
            rfc: newClientDetails.rfc,
            taxRegime: newClientDetails.taxRegime,
            ekeyReference: newClientDetails.ekeyReference || undefined,
            address: {
              street: newClientDetails.street,
              exteriorNumber: newClientDetails.exteriorNumber,
              interiorNumber: newClientDetails.interiorNumber || undefined,
              colony: newClientDetails.colony || undefined,
              postalCode: newClientDetails.postalCode,
              city: newClientDetails.city,
              state: newClientDetails.state,
              country: "Mexico",
            },
            contacts: newClientContacts,
            memberId: assignableMemberValue,
            templateIds: selectedTemplateIds,
          }),
        },
      );
      setSelectedTemplateIds([]);
      setNewClientName("");
      setNewClientDetails({
        legalName: "",
        rfc: "",
        taxRegime: "",
        ekeyReference: "",
        street: "",
        exteriorNumber: "",
        interiorNumber: "",
        colony: "",
        postalCode: "",
        city: "",
        state: "",
      });
      setNewClientContacts([{ ...emptyCompanyContact(), isPrimary: true }]);
      setPostalCodeOptions([]);
      setSelectedClientId(clientId);
      setSelectedMemberId(assignableMemberValue);
      const member = usersById.get(assignableMemberValue);
      if (member?.leaderId) {
        setSelectedLeaderId(member.leaderId);
      }
      await loadData();
      toast.success("Empresa creada con checklist base.");
      return true;
    } catch (error) {
      const selectedMemberName =
        usersById.get(assignableMemberValue)?.name ??
        assignableMemberValue ??
        "N/A";
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      if (errorMessage.toLowerCase().includes("sin permisos")) {
        toast.error(
          `Sin permisos para crear empresa con contador ${selectedMemberName}.`,
        );
      } else {
        toast.error(`No se pudo crear empresa: ${errorMessage}`);
      }
      return false;
    }
  };

  const lookupPostalCode = async () => {
    const postalCode = newClientDetails.postalCode.trim();
    if (!/^\d{5}$/.test(postalCode)) return;
    setPostalLookupLoading(true);
    try {
      const result = await backendFetch<{ options: PostalCodeOption[] }>(
        `/companies/postal-codes/${postalCode}`,
      );
      setPostalCodeOptions(result.options);
      const first = result.options[0];
      if (first) {
        setNewClientDetails((current) => ({
          ...current,
          state: first.state,
          city: first.city,
        }));
      }
    } catch (error) {
      setPostalCodeOptions([]);
      toast.warning(
        error instanceof Error
          ? error.message
          : "No se encontro el codigo postal.",
      );
    } finally {
      setPostalLookupLoading(false);
    }
  };

  return {
    session,
    authLoading,
    currentUser,
    dataLoading,
    message,
    setMessage,
    signOut,
    canUncheck,

    users,
    groups,
    usersById,
    groupsById,

    month,
    setMonth,
    availableMonths,

    globalVisibleProgress,
    globalVisibleVentas,
    globalVisibleProduccion,

    selectedLeaderValue,
    selectedLeaderProgress,
    setSelectedLeaderId,

    selectedMemberValue,
    selectedMemberProgress,
    setSelectedMemberId,

    selectedClient,
    selectedClientValue,
    selectedClientProgress,
    selectedClientVentas,
    selectedClientProduccion,
    setSelectedClientId,

    selectedClientActivities,
    checklistModalClient,
    checklistModalClientActivities,
    checklistModalClientProgress,
    checklistModalClientVentas,
    checklistModalClientProduccion,

    clientsVisibleToCurrent,
    membersVisibleToCurrent,
    memberDirectoryRows,

    memberSearchQuery,
    setMemberSearchQuery,
    memberPage,
    setMemberPage,
    memberCurrentPage,
    memberTotalPages,
    visibleMemberRows,

    memberClientSearchQuery,
    setMemberClientSearchQuery,
    memberClientPage,
    setMemberClientPage,
    memberClientCurrentPage,
    memberClientTotalPages,
    visibleMemberClients,

    clientsSearchQuery,
    setClientsSearchQuery,
    clientsMemberFilter,
    setClientsMemberFilter,
    clientsPage,
    setClientsPage,
    clientsCurrentPage,
    clientsTotalPages,
    visibleClientRows,
    clientsTableRows,
    toggleClientsSort,
    sortMarkerForClients,

    checklistStatsByClient,
    progressByClient,
    progressByClientVentas,
    progressByClientProduccion,

    openChecklistModal,
    closeChecklistModal,
    goToMemberClients,
    goToClientChecklist,

    currentMonthEntryMap,
    toggleChecklist,

    assignableMembers,
    assignableMemberValue,
    newClientName,
    setNewClientName,
    newClientMemberId,
    setNewClientMemberId,
    newClientDetails,
    setNewClientDetails,
    newClientContacts,
    setNewClientContacts,
    postalCodeOptions,
    postalLookupLoading,
    lookupPostalCode,
    selectedTemplateIds,
    setSelectedTemplateIds,
    onCreateClient,

    templates,
    areas,
    newTemplateName,
    setNewTemplateName,
    newTemplateAreaId,
    setNewTemplateAreaId,
    newAreaName,
    setNewAreaName,
    onCreateArea,
    newTemplateWeight,
    setNewTemplateWeight,
    onCreateTemplate,
    toggleTemplateActive,
    updateTemplateWeight,

    loadData,
  };
}

export type EmpresasDashboardState = ReturnType<
  typeof useEmpresasDashboardState
>;
