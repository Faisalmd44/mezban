/**
 * useAdminAlerts — React hook that bridges AdminNotificationService to
 * component state. Returns the pending order count and list, and
 * exposes a `resolveOrder` function that accepts/rejects an order and
 * stops all alerts for it.
 */

import { useState, useEffect, useCallback } from "react";
import {
  subscribePending,
  handleOrderResolved,
  stopAlert,
  type OrderSummary,
} from "@/src/services/AdminNotificationService";
import { api } from "@/src/api";

export type { OrderSummary };

export function useAdminAlerts() {
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingOrders, setPendingOrders] = useState<OrderSummary[]>([]);

  useEffect(() => {
    const unsub = subscribePending((count, orders) => {
      setPendingCount(count);
      setPendingOrders(orders);
    });
    return unsub;
  }, []);

  const resolveOrder = useCallback(
    async (orderId: string, accept: boolean) => {
      try {
        const newStatus = accept ? "preparing" : "cancelled";
        await api.adminUpdateStatus(orderId, newStatus);
        await handleOrderResolved(orderId);
      } catch (e) {
        // Even if the API call fails, stop the local alert so the admin
        // isn't stuck with a ringing phone.
        await stopAlert(orderId);
        throw e;
      }
    },
    []
  );

  return { pendingCount, pendingOrders, resolveOrder };
}
