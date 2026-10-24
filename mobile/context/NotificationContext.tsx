import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert as RNAlert,
  AlertButton as RNAlertButton,
  Platform,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts, fontSize, spacing, radius, shadows } from '../theme';

export type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'confirm';

export interface AppAlertButton {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface AppAlertOptions {
  title: string;
  message?: string;
  buttons?: AppAlertButton[];
  type?: NotificationType;
}

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
}

interface AlertModalState extends AppAlertOptions {
  visible: boolean;
}

interface NotificationContextType {
  showToast: (
    title: string,
    message?: string,
    type?: 'success' | 'error' | 'warning' | 'info',
    duration?: number
  ) => void;
  showAlert: (
    title: string,
    message?: string,
    buttons?: AppAlertButton[],
    type?: NotificationType
  ) => void;
  showConfirm: (
    title: string,
    message: string,
    onConfirm: () => void,
    confirmText?: string,
    cancelText?: string,
    isDestructive?: boolean
  ) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

// Global dispatchers for calls outside React components
let globalShowAlertFn: ((title: string, message?: string, buttons?: AppAlertButton[], type?: NotificationType) => void) | null = null;
let globalShowToastFn: ((title: string, message?: string, type?: 'success' | 'error' | 'warning' | 'info', duration?: number) => void) | null = null;
let globalShowConfirmFn: ((title: string, message: string, onConfirm: () => void, confirmText?: string, cancelText?: string, isDestructive?: boolean) => void) | null = null;

export const showAppAlert = (title: string, message?: string, buttons?: AppAlertButton[], type?: NotificationType) => {
  if (globalShowAlertFn) {
    globalShowAlertFn(title, message, buttons, type);
  } else {
    RNAlert.alert(title, message, buttons as any);
  }
};

export const showAppToast = (title: string, message?: string, type?: 'success' | 'error' | 'warning' | 'info', duration?: number) => {
  if (globalShowToastFn) {
    globalShowToastFn(title, message, type, duration);
  }
};

export const showAppConfirm = (
  title: string,
  message: string,
  onConfirm: () => void,
  confirmText?: string,
  cancelText?: string,
  isDestructive?: boolean
) => {
  if (globalShowConfirmFn) {
    globalShowConfirmFn(title, message, onConfirm, confirmText, cancelText, isDestructive);
  }
};

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [alertState, setAlertState] = useState<AlertModalState>({
    visible: false,
    title: '',
    message: '',
    buttons: [],
    type: 'info',
  });

  const showToast = useCallback(
    (
      title: string,
      message?: string,
      type: 'success' | 'error' | 'warning' | 'info' = 'success',
      duration = 3200
    ) => {
      const id = Math.random().toString(36).substring(7);
      setToasts((prev) => [...prev, { id, title, message, type }]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    },
    []
  );

  const showAlert = useCallback(
    (
      title: string,
      message?: string,
      buttons?: AppAlertButton[],
      type?: NotificationType
    ) => {
      let inferredType: NotificationType = type || 'info';
      const lower = (title + ' ' + (message || '')).toLowerCase();

      if (!type) {
        if (
          lower.includes('error') ||
          lower.includes('failed') ||
          lower.includes('unable') ||
          lower.includes('missing') ||
          lower.includes('required') ||
          lower.includes('invalid')
        ) {
          inferredType = 'error';
        } else if (
          lower.includes('success') ||
          lower.includes('added to cart') ||
          lower.includes('saved') ||
          lower.includes('updated') ||
          lower.includes('confirmed') ||
          lower.includes('thank')
        ) {
          inferredType = 'success';
        } else if (
          lower.includes('warning') ||
          lower.includes('cancel') ||
          lower.includes('remove') ||
          lower.includes('sign out') ||
          lower.includes('delete')
        ) {
          inferredType = 'warning';
        }
      }

      const finalButtons: AppAlertButton[] =
        buttons && buttons.length > 0
          ? buttons
          : [{ text: 'OK', style: 'default' }];

      setAlertState({
        visible: true,
        title,
        message,
        buttons: finalButtons,
        type: inferredType,
      });
    },
    []
  );

  const showConfirm = useCallback(
    (
      title: string,
      message: string,
      onConfirm: () => void,
      confirmText = 'Confirm',
      cancelText = 'Cancel',
      isDestructive = false
    ) => {
      setAlertState({
        visible: true,
        title,
        message,
        type: isDestructive ? 'warning' : 'confirm',
        buttons: [
          { text: cancelText, style: 'cancel' },
          {
            text: confirmText,
            style: isDestructive ? 'destructive' : 'default',
            onPress: onConfirm,
          },
        ],
      });
    },
    []
  );

  useEffect(() => {
    globalShowAlertFn = showAlert;
    globalShowToastFn = showToast;
    globalShowConfirmFn = showConfirm;

    // Monkey-patch RNAlert.alert so EVERY existing alert in the app uses our custom modal
    const originalAlert = RNAlert.alert;
    RNAlert.alert = (title: string, message?: string, buttons?: RNAlertButton[]) => {
      showAlert(title, message, buttons as AppAlertButton[]);
    };

    return () => {
      RNAlert.alert = originalAlert;
      globalShowAlertFn = null;
      globalShowToastFn = null;
      globalShowConfirmFn = null;
    };
  }, [showAlert, showToast, showConfirm]);

  const handleButtonPress = (btn: AppAlertButton) => {
    setAlertState((prev) => ({ ...prev, visible: false }));
    if (btn.onPress) {
      setTimeout(() => {
        btn.onPress?.();
      }, 80);
    }
  };

  const renderIcon = () => {
    switch (alertState.type) {
      case 'success':
        return (
          <View style={[styles.iconCircle, { backgroundColor: colors.primarySoft }]}>
            <MaterialCommunityIcons name="check-circle" size={26} color={colors.primary} />
          </View>
        );
      case 'error':
        return (
          <View style={[styles.iconCircle, { backgroundColor: colors.errorSoft }]}>
            <MaterialCommunityIcons name="alert-circle" size={26} color={colors.error} />
          </View>
        );
      case 'warning':
        return (
          <View style={[styles.iconCircle, { backgroundColor: colors.warningSoft }]}>
            <MaterialCommunityIcons name="alert" size={26} color={colors.warning} />
          </View>
        );
      default:
        return (
          <View style={[styles.iconCircle, { backgroundColor: colors.primarySoft }]}>
            <MaterialCommunityIcons name="information" size={26} color={colors.primary} />
          </View>
        );
    }
  };

  return (
    <NotificationContext.Provider value={{ showToast, showAlert, showConfirm }}>
      {children}

      {/* Floating Pill Toasts at Top */}
      <SafeAreaView edges={['top']} style={styles.toastSafeArea} pointerEvents="box-none">
        <View style={styles.toastContainer} pointerEvents="box-none">
          {toasts.map((toast) => (
            <View key={toast.id} style={styles.toastCard}>
              <View style={styles.toastIconCol}>
                {toast.type === 'success' && (
                  <MaterialCommunityIcons name="check-circle" size={20} color={colors.primary} />
                )}
                {toast.type === 'error' && (
                  <MaterialCommunityIcons name="alert-circle" size={20} color={colors.error} />
                )}
                {toast.type === 'warning' && (
                  <MaterialCommunityIcons name="alert" size={20} color={colors.warning} />
                )}
                {toast.type === 'info' && (
                  <MaterialCommunityIcons name="information" size={20} color={colors.info} />
                )}
              </View>
              <View style={styles.toastContentCol}>
                <Text style={styles.toastTitle}>{toast.title}</Text>
                {toast.message ? <Text style={styles.toastMessage}>{toast.message}</Text> : null}
              </View>
              <TouchableOpacity
                onPress={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                style={styles.toastCloseBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialCommunityIcons name="close" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </SafeAreaView>

      {/* Centered Themed Modal Alert & Confirmation */}
      <Modal
        visible={alertState.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setAlertState((prev) => ({ ...prev, visible: false }))}
      >
        <TouchableWithoutFeedback onPress={() => setAlertState((prev) => ({ ...prev, visible: false }))}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.modalCard}>
                {/* Header Row */}
                <View style={styles.modalHeader}>
                  <View style={styles.modalHeaderLeft}>
                    {renderIcon()}
                    <Text style={styles.modalTitle} numberOfLines={2}>
                      {alertState.title}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setAlertState((prev) => ({ ...prev, visible: false }))}
                    style={styles.closeBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <MaterialCommunityIcons name="close" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Message Body */}
                {alertState.message ? (
                  <View style={styles.modalBody}>
                    <Text style={styles.modalMessage}>{alertState.message}</Text>
                  </View>
                ) : null}

                {/* Buttons Row */}
                <View style={styles.actionsRow}>
                  {alertState.buttons?.map((btn, index) => {
                    const isCancel = btn.style === 'cancel';
                    const isDestructive = btn.style === 'destructive';
                    return (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.actionButton,
                          isCancel && styles.actionButtonCancel,
                          isDestructive && styles.actionButtonDestructive,
                          !isCancel && !isDestructive && styles.actionButtonPrimary,
                        ]}
                        onPress={() => handleButtonPress(btn)}
                        activeOpacity={0.88}
                      >
                        <Text
                          style={[
                            styles.actionButtonText,
                            isCancel && styles.actionButtonTextCancel,
                            isDestructive && styles.actionButtonTextDestructive,
                            !isCancel && !isDestructive && styles.actionButtonTextPrimary,
                          ]}
                        >
                          {btn.text || 'OK'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  // Toast Pill Styles
  toastSafeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 99999,
  },
  toastContainer: {
    paddingTop: Platform.OS === 'android' ? 12 : 8,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.md,
  },
  toastIconCol: {
    marginRight: spacing.sm,
  },
  toastContentCol: {
    flex: 1,
  },
  toastTitle: {
    fontSize: fontSize.sm,
    fontFamily: fonts.headingBold,
    color: colors.textPrimary,
  },
  toastMessage: {
    fontSize: fontSize.xs,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  toastCloseBtn: {
    marginLeft: spacing.xs,
    padding: 4,
  },

  // Modal Structure
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 30, 24, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(23, 107, 80, 0.08)',
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: fontSize.md + 1,
    fontFamily: fonts.headingBold,
    color: colors.textPrimary,
    flex: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalMessage: {
    fontSize: fontSize.sm,
    fontFamily: fonts.body,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  actionButton: {
    flex: 1,
    height: 46,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  actionButtonPrimary: {
    backgroundColor: colors.primary,
  },
  actionButtonCancel: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionButtonDestructive: {
    backgroundColor: colors.error,
  },
  actionButtonText: {
    fontSize: fontSize.sm,
    fontFamily: fonts.headingBold,
  },
  actionButtonTextPrimary: {
    color: colors.textInverse,
  },
  actionButtonTextCancel: {
    color: colors.textPrimary,
  },
  actionButtonTextDestructive: {
    color: colors.textInverse,
  },
});
