import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts, fontSize, spacing } from '../theme';
import { ordersService } from '../services/orders.service';

interface RazorpayCheckoutModalProps {
  visible: boolean;
  amount: number; // in INR rupees
  orderId?: string | number;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  onSuccess: (paymentId: string, orderId?: string, signature?: string) => void;
  onCancel: () => void;
  onFailure: (errorDescription: string) => void;
}

const RAZORPAY_KEY =
  process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_T1oxnYBnlYBotP';

export default function RazorpayCheckoutModal({
  visible,
  amount,
  orderId,
  userName = 'Customer',
  userEmail = 'customer@example.com',
  userPhone = '9999999999',
  onSuccess,
  onCancel,
  onFailure,
}: RazorpayCheckoutModalProps) {
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [paymentHtml, setPaymentHtml] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);

  const buildRazorpayHtml = (order: any) => {
    const cleanPhone = (userPhone || '').replace(/\D/g, '').slice(-10) || '9999999999';
    const options = {
      description: orderId ? `Order #${orderId}` : 'AuraMart Healthcare Order',
      currency: 'INR',
      key: RAZORPAY_KEY,
      amount: order.amount,
      name: 'AuraMart',
      order_id: order.id,
      prefill: {
        email: userEmail || 'customer@example.com',
        contact: cleanPhone,
        name: userName || 'Customer',
      },
      theme: { color: colors.primary },
    };

    const optionsJson = JSON.stringify(options).replace(/</g, '\\u003c');
    return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />`
      + `<script src="https://checkout.razorpay.com/v1/checkout.js"></script></head><body style="margin:0;background:#ffffff;">`
      + `<script>var options=${optionsJson};`
      + `options.handler=function(r){window.ReactNativeWebView.postMessage(JSON.stringify({status:'success',razorpay_payment_id:r.razorpay_payment_id,razorpay_order_id:r.razorpay_order_id,razorpay_signature:r.razorpay_signature}));};`
      + `options.modal={ondismiss:function(){window.ReactNativeWebView.postMessage(JSON.stringify({status:'dismissed'}));}};`
      + `var rzp=new Razorpay(options);`
      + `rzp.on('payment.failed',function(r){window.ReactNativeWebView.postMessage(JSON.stringify({status:'failed',error:r.error&&r.error.description||'Payment failed'}));});`
      + `rzp.open();</script></body></html>`;
  };

  useEffect(() => {
    if (!visible) {
      setPaymentHtml(null);
      setInitError(null);
      setLoadingOrder(false);
      return;
    }

    let isMounted = true;
    const initPayment = async () => {
      try {
        setLoadingOrder(true);
        setInitError(null);
        // Create native Razorpay order identical to patient_matters
        const order = await ordersService.createRazorpayOrder(amount, {
          receipt: `rcpt_${Date.now()}`,
          notes: {
            app: 'AuraMart',
            customer_name: userName,
            customer_email: userEmail,
          },
        });

        if (isMounted) {
          const html = buildRazorpayHtml(order);
          setPaymentHtml(html);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('Failed to initiate Razorpay order:', err);
          setInitError(err?.message || 'Could not initiate Razorpay checkout');
        }
      } finally {
        if (isMounted) {
          setLoadingOrder(false);
        }
      }
    };

    initPayment();

    return () => {
      isMounted = false;
    };
  }, [visible, amount, userName, userEmail, userPhone]);

  const handleWebViewMessage = (event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.status === 'success') {
        onSuccess(msg.razorpay_payment_id, msg.razorpay_order_id, msg.razorpay_signature);
      } else if (msg.status === 'failed') {
        onFailure(msg.error || 'Payment was not completed. Please try again.');
      } else if (msg.status === 'dismissed') {
        onCancel();
      }
    } catch (e) {
      console.error('WebView message parse failed', e);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onCancel}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Header Bar identical to patient_matters */}
        <View style={styles.headerBar}>
          <View style={styles.headerTitleRow}>
            <MaterialCommunityIcons name="shield-check" size={20} color={colors.primary} />
            <Text style={styles.headerTitle}>Complete Payment</Text>
          </View>
          <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        {loadingOrder ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Initializing Razorpay Secure Checkout...</Text>
          </View>
        ) : initError ? (
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons name="alert-circle-outline" size={48} color={colors.error} />
            <Text style={styles.errorTitle}>Checkout Initialization Error</Text>
            <Text style={styles.errorDescription}>{initError}</Text>
            <TouchableOpacity onPress={onCancel} style={styles.retryBtn}>
              <Text style={styles.retryBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        ) : paymentHtml ? (
          <WebView
            originWhitelist={['*']}
            source={{ html: paymentHtml, baseUrl: 'https://aurasutra.com' }}
            javaScriptEnabled
            domStorageEnabled
            onMessage={handleWebViewMessage}
            startInLoadingState
            renderLoading={() => (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            )}
          />
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerTitle: {
    fontSize: fontSize.md,
    fontFamily: fonts.headingBold,
    color: colors.textPrimary,
  },
  cancelBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  cancelText: {
    fontSize: fontSize.sm,
    fontFamily: fonts.bodyMedium,
    color: colors.textSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.sm,
    fontFamily: fonts.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: '#FFFFFF',
  },
  errorTitle: {
    fontSize: fontSize.md,
    fontFamily: fonts.headingBold,
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  errorDescription: {
    fontSize: fontSize.sm,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  retryBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontFamily: fonts.bodyBold,
    fontSize: fontSize.sm,
  },
});
