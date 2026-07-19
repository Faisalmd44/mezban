import { useMemo } from "react";
import { View, ActivityIndicator, StyleSheet, Text, Pressable, Platform } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";

import { COLORS, SPACING, RADIUS } from "@/src/theme";

export type RazorpaySuccessPayload = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type Props = {
  keyId: string;
  razorpayOrderId: string;
  amount: number; // in paise
  currency?: string;
  name: string; // brand shown in checkout
  description?: string;
  prefill: { name: string; contact: string; email?: string };
  onSuccess: (payload: RazorpaySuccessPayload) => void;
  onFailure: (msg: string) => void;
  onDismiss: () => void;
};

// Small HTML page loaded inside the WebView which drives Razorpay Checkout
// and posts the result back to React Native via window.ReactNativeWebView.
const buildCheckoutHtml = (opts: {
  keyId: string;
  razorpayOrderId: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  prefillName: string;
  prefillContact: string;
  prefillEmail: string;
}) => `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Mezbaan Payment</title>
    <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
    <style>
      html, body { margin: 0; padding: 0; background: #000; color: #fff; font-family: -apple-system, Roboto, sans-serif; }
      .center { display: flex; align-items: center; justify-content: center; height: 100vh; flex-direction: column; gap: 12px; }
      .btn { background: #D4AF37; color: #000; padding: 12px 24px; border-radius: 999px; border: 0; font-weight: 700; }
    </style>
  </head>
  <body>
    <div class="center">
      <p>Loading secure payment…</p>
      <button id="retry" class="btn" style="display:none" onclick="startCheckout()">Retry Payment</button>
    </div>
    <script>
      function post(msg) {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify(msg));
        }
      }
      function startCheckout() {
        document.getElementById('retry').style.display = 'none';
        var options = {
          key: ${JSON.stringify(opts.keyId)},
          amount: ${opts.amount},
          currency: ${JSON.stringify(opts.currency)},
          order_id: ${JSON.stringify(opts.razorpayOrderId)},
          name: ${JSON.stringify(opts.name)},
          description: ${JSON.stringify(opts.description)},
          prefill: {
            name: ${JSON.stringify(opts.prefillName)},
            contact: ${JSON.stringify(opts.prefillContact)},
            email: ${JSON.stringify(opts.prefillEmail)}
          },
          theme: { color: '#D4AF37' },
          handler: function (response) {
            post({ type: 'success', payload: response });
          },
          modal: {
            ondismiss: function () {
              post({ type: 'dismiss' });
              document.getElementById('retry').style.display = 'inline-block';
            }
          }
        };
        try {
          var rzp = new Razorpay(options);
          rzp.on('payment.failed', function (r) {
            post({ type: 'failure', payload: r && r.error ? r.error : { description: 'Payment failed' } });
            document.getElementById('retry').style.display = 'inline-block';
          });
          rzp.open();
        } catch (e) {
          post({ type: 'failure', payload: { description: String(e) } });
        }
      }
      // Wait for checkout.js to attach, then open.
      var tries = 0;
      var iv = setInterval(function () {
        tries++;
        if (typeof Razorpay !== 'undefined') {
          clearInterval(iv);
          startCheckout();
        } else if (tries > 40) {
          clearInterval(iv);
          post({ type: 'failure', payload: { description: 'Unable to load Razorpay Checkout. Check your internet connection.' } });
        }
      }, 100);
    </script>
  </body>
</html>`;

export default function RazorpayWebView(props: Props) {
  const html = useMemo(
    () =>
      buildCheckoutHtml({
        keyId: props.keyId,
        razorpayOrderId: props.razorpayOrderId,
        amount: props.amount,
        currency: props.currency || "INR",
        name: props.name,
        description: props.description || "Order Payment",
        prefillName: props.prefill.name || "",
        prefillContact: props.prefill.contact || "",
        prefillEmail: props.prefill.email || "",
      }),
    [
      props.keyId,
      props.razorpayOrderId,
      props.amount,
      props.currency,
      props.name,
      props.description,
      props.prefill.name,
      props.prefill.contact,
      props.prefill.email,
    ],
  );

  const onMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data?.type === "success" && data.payload) {
        props.onSuccess({
          razorpay_order_id: data.payload.razorpay_order_id,
          razorpay_payment_id: data.payload.razorpay_payment_id,
          razorpay_signature: data.payload.razorpay_signature,
        });
      } else if (data?.type === "failure") {
        props.onFailure(data?.payload?.description || "Payment failed");
      } else if (data?.type === "dismiss") {
        props.onDismiss();
      }
    } catch {
      // ignore malformed messages
    }
  };

  return (
    <View style={styles.wrap} testID="razorpay-webview-wrap">
      <View style={styles.headerRow}>
        <Pressable testID="razorpay-close" onPress={props.onDismiss} style={styles.closeBtn} hitSlop={12}>
          <Ionicons name="close" size={22} color={COLORS.textPrimary} />
        </Pressable>
        <Text style={styles.headerText}>Secure Payment</Text>
        <View style={styles.closeBtn} />
      </View>
      <WebView
        testID="razorpay-webview"
        source={{ html, baseUrl: "https://checkout.razorpay.com" }}
        originWhitelist={["*"]}
        javaScriptEnabled
        domStorageEnabled
        onMessage={onMessage}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={COLORS.brand} />
            <Text style={styles.loaderText}>Loading secure checkout…</Text>
          </View>
        )}
        style={styles.webview}
        {...(Platform.OS === "web" ? { containerStyle: { flex: 1 } as any } : {})}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: "#000" },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, backgroundColor: "#fff" },
  headerText: { fontWeight: "800", color: COLORS.textPrimary },
  closeBtn: { width: 36, height: 36, borderRadius: RADIUS.pill, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.surfaceAlt },
  webview: { flex: 1, backgroundColor: "#000" },
  loader: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0, backgroundColor: "#000", alignItems: "center", justifyContent: "center" },
  loaderText: { color: "#fff", marginTop: 12 },
});
