"use client";

import { useEffect, useEffectEvent } from "react";
import { io } from "socket.io-client";
import { getBackendAccessToken } from "@/lib/backend-auth";
import { env } from "@/lib/env";

export function useIndicatorsSocket(
  clientIds: readonly string[],
  month: string | null,
  onUpdated: () => void,
) {
  const handleUpdated = useEffectEvent(onUpdated);
  const clientIdsKey = [...new Set(clientIds)].sort().join(",");

  useEffect(() => {
    const token = getBackendAccessToken();
    const subscribedClientIds = clientIdsKey ? clientIdsKey.split(",") : [];
    if (!subscribedClientIds.length || !token) return;

    const socket = io(`${new URL(env.apiUrl).origin}/indicators`, {
      auth: { token },
      transports: ["websocket"],
    });
    socket.on("connect", () => {
      subscribedClientIds.forEach((clientId) => {
        socket.emit("indicators:subscribe", { clientId });
      });
    });
    socket.on(
      "indicators:updated",
      (event: { clientId: string; month: string }) => {
        if (
          (month === null || event.month === month) &&
          subscribedClientIds.includes(event.clientId)
        ) {
          handleUpdated();
        }
      },
    );
    return () => {
      socket.disconnect();
    };
  }, [clientIdsKey, month]);
}
