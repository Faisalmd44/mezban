/**
 * AdminNotificationService — production-ready new-order alert system.
 *
 * Responsibilities:
 *  - Register and refresh the FCM push token; report it to the backend.
 *  - Receive FCM "new_order" pushes and trigger a high-priority local
 *    notification with a looping ringtone + continuous vibration.
 *  - Schedule reminder notifications at 30 s and 60 s if the order is
 *    still in "received" status.
 *  - Stop all ringtone / vibration / reminders the instant the order is
 *    accepted (advanced past "received") or rejected.
 *  - Poll the backend for pending orders every 12 s while the admin app
 *    is in the foreground, so orders are never missed even if push
 *    delivery is delayed.
 *  - Maintain a pending-order count for badge display.
 *  - Deep-link to the specific order detail screen when the notification
 *    or reminder is tapped.
 */

import { Platform, AppState, AppStateStatus } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// @ts-ignore — installed via @react-native-firebase/messaging
import messaging from "@react-native-firebase/messaging";
// @ts-ignore — installed via @notifee/react-native
import notifee, {
  AndroidImportance,
  AndroidVisibility,
  AndroidCategory,
  AndroidStyle,
  TriggerType,
  TimestampTrigger,
  EventType,
  type Event,
} from "@notifee/react-native";

import { api } from "@src/api";

const TAG = "[AdminNotify]";
const NOTIF_CHANNEL_ID = "mezban_new_orders";
const NOTIF_CHANNEL_NAME = "New Order Alerts";
const TOKEN_KEY = "mez_fcm_token";
const POLL_INTERVAL_MS = 12_000;
const REMINDER_1_MS = 30_000;
const REMINDER_2_MS = 60_000;

export type OrderSummary = {
  id: string;
  order_no: string;
  user_name: string;
  user_phone: string;
  total: number;
  status: string;
  items: Array<{ name: string; quantity: number }>;
};

type Listener = (count: number, orders: OrderSummary[]) => void;

let initialized = false;
let appStateSubscription: { remove: () => void } | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let foregroundMessageUnsub: (() => void) | null = null;
let notifeeEventUnsub: (() => void) | null = null;

// Navigation callback — set by the root layout so the service can
// deep-link to the order detail screen without importing expo-router
// directly (which would break the background-message handler).
let navigateToOrder: ((orderId: string) => void) | null = null;

export function setOrderNavigator(fn: (orderId: string) => void) {
  navigateToOrder = fn;
}

// Callback for handling Accept/Reject from the notification itself.
let onActionPress: ((orderId: string, accept: boolean) => Promise<void>) | null = null;

export function setActionHandler(fn: (orderId: string, accept: boolean) => Promise<void>) {
  onActionPress = fn;
}

const listeners = new Set<Listener>();
let pendingOrders: OrderSummary[] = [];
let activeAlertOrderIds = new Set<string>();

function log(...args: any[]) {
  console.log(TAG, ...args);
}

function notifyListeners() {
  const count = pendingOrders.length;
  for (const fn of listeners) {
    try {
      fn(count, [...pendingOrders]);
    } catch (e) {
      // listener error should not crash the service
    }
  }
}

export function getPendingCount(): number {
  return pendingOrders.length;
}

export function subscribePending(fn: Listener): () => void {
  listeners.add(fn);
  fn(pendingOrders.length, [...pendingOrders]);
  return () => {
    listeners.delete(fn);
  };
}

async function ensureChannel() {
  if (Platform.OS !== "android") return;
  await notifee.createChannel({
    id: NOTIF_CHANNEL_ID,
    name: NOTIF_CHANNEL_NAME,
    description: "High-priority alerts when a new order arrives.",
    importance: AndroidImportance.HIGH,
    visibility: AndroidVisibility.PUBLIC,
    badge: true,
    vibration: true,
    bypassDnd: true,
  });
  log("Notification channel ensured");
}

async function startAlert(order: OrderSummary) {
  if (Platform.OS !== "android") return;

  activeAlertOrderIds.add(order.id);

  await notifee.displayNotification({
    id: `order_${order.id}`,
    title: `New Order — #${order.order_no}`,
    body: `${order.user_name} • ₹${order.total.toFixed(0)}\n${order.items
      .map((i) => `${i.quantity}x ${i.name}`)
      .join(", ")}`,
    android: {
      channelId: NOTIF_CHANNEL_ID,
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PUBLIC,
      category: AndroidCategory.CALL,
      ongoing: true,
      smallIcon: "ic_notification",
      pressVisibility: AndroidVisibility.PUBLIC,
      sound: "new_order_alarm",
      vibrationPattern: {
        type: "repeat",
        sequence: [0, 1000, 500],
      },
      fullScreenActionId: "mezban_accept_order",
      pressAction: {
        id: "open_order",
        launchActivity: "default",
      },
      showProgress: true,
      progress: {
        max: 2,
        current: 0,
        indeterminate: true,
      },
      style: {
        type: AndroidStyle.BIGTEXT,
        bigText: `${order.user_name} • ${order.user_phone}\n${order.items
          .map((i) => `${i.quantity}x ${i.name}`)
          .join(", ")}\nTotal: ₹${order.total.toFixed(0)}`,
      },
      actions: [
        {
          title: "Accept",
          pressAction: { id: "accept_order" },
        },
        {
          title: "Reject",
          pressAction: { id: "reject_order" },
        },
      ],
    },
  });

  log("Alert started for order", order.id);
}

export async function stopAlert(orderId?: string) {
  if (Platform.OS !== "android") return;

  if (orderId) {
    activeAlertOrderIds.delete(orderId);
    await notifee.cancelNotification(`order_${orderId}`);
    await notifee.cancelTriggerNotifications(`reminder_1_${orderId}`);
    await notifee.cancelTriggerNotifications(`reminder_2_${orderId}`);
    log("Alert stopped for order", orderId);
  } else {
    activeAlertOrderIds.clear();
    await notifee.cancelAllNotifications();
    log("All alerts stopped");
  }
}

async function scheduleReminders(order: OrderSummary) {
  if (Platform.OS !== "android") return;

  const baseBody = `Order #${order.order_no} from ${order.user_name} is still pending!`;

  const trigger1: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: Date.now() + REMINDER_1_MS,
  };
  await notifee.createTriggerNotification(
    {
      id: `reminder_1_${order.id}`,
      title: `Reminder — Order #${order.order_no}`,
      body: baseBody,
      android: {
        channelId: NOTIF_CHANNEL_ID,
        importance: AndroidImportance.HIGH,
        visibility: AndroidVisibility.PUBLIC,
        sound: "new_order_alarm",
        vibrationPattern: {
          type: "repeat",
          sequence: [0, 800, 400],
        },
        pressAction: { id: "open_order", launchActivity: "default" },
      },
    },
    trigger1
  );

  const trigger2: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: Date.now() + REMINDER_2_MS,
  };
  await notifee.createTriggerNotification(
    {
      id: `reminder_2_${order.id}`,
      title: `Urgent — Order #${order.order_no}`,
      body: `${baseBody} Please accept or reject now!`,
      android: {
        channelId: NOTIF_CHANNEL_ID,
        importance: AndroidImportance.HIGH,
        visibility: AndroidVisibility.PUBLIC,
        sound: "new_order_alarm",
        vibrationPattern: {
          type: "repeat",
          sequence: [0, 1000, 300],
        },
        pressAction: { id: "open_order", launchActivity: "default" },
      },
    },
    trigger2
  );

  log("Reminders scheduled for order", order.id);
}

async function handleNewOrder(order: OrderSummary) {
  if (activeAlertOrderIds.has(order.id)) return;

  const exists = pendingOrders.some((o) => o.id === order.id);
  if (!exists) {
    pendingOrders = [order, ...pendingOrders];
    notifyListeners();
  }

  await startAlert(order);
  await scheduleReminders(order);
}

export async function handleOrderResolved(orderId: string) {
  await stopAlert(orderId);
  pendingOrders = pendingOrders.filter((o) => o.id !== orderId);
  notifyListeners();
}

async function registerToken() {
  if (Platform.OS !== "android") return;

  try {
    const settings = await notifee.requestPermission();
    log("Notifee permission:", settings.authorizationStatus);

    const token = await messaging().getToken();
    const stored = await AsyncStorage.getItem(TOKEN_KEY);
    if (token !== stored) {
      await AsyncStorage.setItem(TOKEN_KEY, token);
      await api.registerFCMToken(token).catch((e: any) => {
        log("Failed to register FCM token:", e?.message);
      });
      log("FCM token registered with backend");
    }

    messaging().onTokenRefresh(async (newToken) => {
      await AsyncStorage.setItem(TOKEN_KEY, newToken);
      await api.registerFCMToken(newToken).catch(() => {});
      log("FCM token refreshed");
    });
  } catch (e: any) {
    log("FCM token registration failed:", e?.message);
  }
}

function setupForegroundListener() {
  if (foregroundMessageUnsub) foregroundMessageUnsub();

  foregroundMessageUnsub = messaging().onMessage(async (remoteMessage) => {
    const data = remoteMessage.data || {};
    log("Foreground FCM message:", data);

    if (data.type === "new_order" && data.order_id) {
      const order: OrderSummary = {
        id: data.order_id,
        order_no: data.order_no || "Unknown",
        user_name: data.user_name || "Customer",
        user_phone: data.user_phone || "",
        total: parseFloat(data.total || "0"),
        status: data.status || "received",
        items: data.items ? JSON.parse(data.items) : [],
      };
      await handleNewOrder(order);
    } else if (data.type === "order_status" && data.order_id) {
      await handleOrderResolved(data.order_id);
    }
  });
}

messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  const data = remoteMessage.data || {};
  log("Background FCM message:", data);

  if (data.type === "new_order" && data.order_id) {
    await notifee.displayNotification({
      id: `order_${data.order_id}`,
      title: `New Order — #${data.order_no || "Unknown"}`,
      body: `${data.user_name || "Customer"} • ₹${parseFloat(data.total || "0").toFixed(0)}`,
      android: {
        channelId: NOTIF_CHANNEL_ID,
        importance: AndroidImportance.HIGH,
        visibility: AndroidVisibility.PUBLIC,
        category: AndroidCategory.CALL,
        ongoing: true,
        sound: "new_order_alarm",
        vibrationPattern: {
          type: "repeat",
          sequence: [0, 1000, 500],
        },
        pressAction: { id: "open_order", launchActivity: "default" },
        actions: [
          { title: "Accept", pressAction: { id: "accept_order" } },
          { title: "Reject", pressAction: { id: "reject_order" } },
        ],
      },
    });
  } else if (data.type === "order_status" && data.order_id) {
    await notifee.cancelNotification(`order_${data.order_id}`);
    await notifee.cancelTriggerNotifications(`reminder_1_${data.order_id}`);
    await notifee.cancelTriggerNotifications(`reminder_2_${data.order_id}`);
  }
});

async function pollPendingOrders() {
  try {
    const orders = await api.adminPendingOrders();
    const newPending: OrderSummary[] = (orders || []).map((o: any) => ({
      id: o.id,
      order_no: o.order_no,
      user_name: o.user_name,
      user_phone: o.user_phone,
      total: o.total,
      status: o.status,
      items: o.items || [],
    }));

    for (const o of newPending) {
      if (o.status === "received" && !activeAlertOrderIds.has(o.id)) {
        log("Polling detected new pending order:", o.id);
        await handleNewOrder(o);
      }
    }

    const newIds = new Set(newPending.map((o) => o.id));
    for (const oldId of activeAlertOrderIds) {
      if (!newIds.has(oldId)) {
        await handleOrderResolved(oldId);
      }
    }

    pendingOrders = newPending;
    notifyListeners();
  } catch (e: any) {
    log("Poll failed:", e?.message);
  }
}

function startPolling() {
  if (pollTimer) return;
  pollTimer = setInterval(pollPendingOrders, POLL_INTERVAL_MS);
  pollPendingOrders();
  log("Polling started (every", POLL_INTERVAL_MS, "ms)");
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
    log("Polling stopped");
  }
}

function onAppStateChange(state: AppStateStatus) {
  if (state === "active") {
    startPolling();
  } else {
    stopPolling();
  }
}

export async function initAdminNotifications() {
  if (initialized) return;
  initialized = true;

  if (Platform.OS !== "android") {
    log("Notifications only supported on Android");
    return;
  }

  await ensureChannel();
  await registerToken();
  setupForegroundListener();

  startPolling();

  appStateSubscription = AppState.addEventListener("change", onAppStateChange) as any;

  // Handle notification opens (FCM side) — navigate to order detail.
  messaging()
    .getInitialNotification()
    .then((remoteMessage) => {
      if (remoteMessage?.data?.order_id) {
        log("App opened from notification, order:", remoteMessage.data.order_id);
        navigateToOrder?.(remoteMessage.data.order_id as string);
      }
    });

  messaging().onNotificationOpenedApp((remoteMessage) => {
    if (remoteMessage?.data?.order_id) {
      log("Notification opened app, order:", remoteMessage.data.order_id);
      navigateToOrder?.(remoteMessage.data.order_id as string);
    }
  });

  // Handle Notifee events: ACTION_PRESS for Accept/Reject buttons,
  // PRESS / DISMISS for navigation and cleanup.
  notifeeEventUnsub = notifee.onForegroundEvent(async ({ type, detail }) => {
    log("Notifee event:", type, detail?.pressAction?.id);

    // Extract order id from notification id (format: "order_<id>").
    const notifId = detail?.notification?.id || "";
    const orderId = notifId.startsWith("order_") ? notifId.slice(6) : "";

    if (type === EventType.ACTION_PRESS) {
      const actionId = detail?.pressAction?.id;

      if (actionId === "accept_order" && orderId) {
        await stopAlert(orderId);
        if (onActionPress) {
          await onActionPress(orderId, true).catch((e) => log("Accept action failed:", e?.message));
        }
        navigateToOrder?.(orderId);
      } else if (actionId === "reject_order" && orderId) {
        await stopAlert(orderId);
        if (onActionPress) {
          await onActionPress(orderId, false).catch((e) => log("Reject action failed:", e?.message));
        }
      } else if (actionId === "open_order" && orderId) {
        navigateToOrder?.(orderId);
      }
    } else if (type === EventType.PRESS) {
      if (orderId) navigateToOrder?.(orderId);
    } else if (type === EventType.DISMISSED) {
      if (orderId) {
        activeAlertOrderIds.delete(orderId);
      }
    }
  });

  // Also handle events when the app is in background/killed so that
  // Accept/Reject from the notification still processes the order.
  notifee.onBackgroundEvent(async ({ type, detail }) => {
    const notifId = detail?.notification?.id || "";
    const orderId = notifId.startsWith("order_") ? notifId.slice(6) : "";

    if (type === EventType.ACTION_PRESS) {
      const actionId = detail?.pressAction?.id;
      if (actionId === "accept_order" && orderId) {
        if (onActionPress) {
          await onActionPress(orderId, true).catch((e) => log("BG accept failed:", e?.message));
        }
        await stopAlert(orderId);
      } else if (actionId === "reject_order" && orderId) {
        if (onActionPress) {
          await onActionPress(orderId, false).catch((e) => log("BG reject failed:", e?.message));
        }
        await stopAlert(orderId);
      }
    }
  });

  log("Admin notification service initialized");
}

export function cleanupAdminNotifications() {
  if (appStateSubscription) {
    appStateSubscription.remove();
    appStateSubscription = null;
  }
  if (foregroundMessageUnsub) {
    foregroundMessageUnsub();
    foregroundMessageUnsub = null;
  }
  if (notifeeEventUnsub) {
    notifeeEventUnsub();
    notifeeEventUnsub = null;
  }
  stopPolling();
  initialized = false;
  log("Admin notification service cleaned up");
}
