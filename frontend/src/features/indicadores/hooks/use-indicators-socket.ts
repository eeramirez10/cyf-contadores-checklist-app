"use client";

import { useEffect, useEffectEvent } from "react";
import { io } from "socket.io-client";
import { getBackendAccessToken } from "@/lib/backend-auth";
import { env } from "@/lib/env";

export function useIndicatorsSocket(
  clientId: string | undefined,
  month: string,
  onUpdated: () => void,
) {
  const handleUpdated = useEffectEvent(onUpdated);
  useEffect(() => {
    const token = getBackendAccessToken();
    if (!clientId || !token) return;

    const socket = io(`${new URL(env.apiUrl).origin}/indicators`, {
      auth: { token },
      transports: ["websocket"],
    });
    socket.on("connect", () => socket.emit("indicators:subscribe", { clientId }));
    socket.on("indicators:updated", (event: { clientId: string; month: string }) => {
      if (event.clientId === clientId && event.month === month) handleUpdated();
    });
    return () => {
      socket.disconnect();
    };
  }, [clientId, month]);
}
