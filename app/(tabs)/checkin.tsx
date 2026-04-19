import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Linking, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { CameraView, Camera } from 'expo-camera';
import { useAuth, useAlert } from '@/template';
import { useLanguage } from '@/hooks/useLanguage';
import { colors, spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { checkinService } from '@/services/checkinService';

export default function CheckInScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const { t } = useLanguage();

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    requestCameraPermission();
    loadCheckInHistory();
  }, [user]);

  const requestCameraPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const loadCheckInHistory = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    const { data } = await checkinService.getUserCheckIns(user.id);
    if (data) setHistory(data);
    
    setLoading(false);
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (processing || !user) return;

    setProcessing(true);

    const { success, className, error } = await checkinService.checkInWithQRCode(user.id, data);
    
    if (error) {
      showAlert(t('error'), error);
      setProcessing(false);
      setScanning(false);
      return;
    }

    if (success) {
      showAlert(
        t('success'), 
        `Successfully checked in to "${className}"! Enjoy your class 🎉`
      );
      await loadCheckInHistory();
      setScanning(false);
    }

    setProcessing(false);
  };

  const openSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.loadingText}>{t('loading')}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('checkin')}</Text>
      </View>

      {scanning ? (
        <View style={styles.scannerContainer}>
          {hasPermission === false ? (
            <View style={styles.permissionContainer}>
              <MaterialIcons name="camera-alt" size={64} color={colors.textLight} />
              <Text style={styles.permissionTitle}>Camera Permission Required</Text>
              <Text style={styles.permissionText}>
                Please enable camera access to scan QR codes for check-in
              </Text>
              <Pressable style={styles.settingsButton} onPress={openSettings}>
                <MaterialIcons name="settings" size={20} color={colors.surface} />
                <Text style={styles.settingsButtonText}>Open Settings</Text>
              </Pressable>
              <Pressable 
                style={styles.cancelButton}
                onPress={() => setScanning(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <CameraView
                style={styles.camera}
                facing="back"
                onBarcodeScanned={processing ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{
                  barcodeTypes: ['qr'],
                }}
              />
              
              <View style={styles.scannerOverlay}>
                <View style={styles.scannerFrame}>
                  <View style={[styles.corner, styles.cornerTopLeft]} />
                  <View style={[styles.corner, styles.cornerTopRight]} />
                  <View style={[styles.corner, styles.cornerBottomLeft]} />
                  <View style={[styles.corner, styles.cornerBottomRight]} />
                </View>
                
                <Text style={styles.scannerText}>
                  {processing ? 'Processing...' : 'Position QR code in the frame'}
                </Text>
                
                <Pressable 
                  style={styles.closeScannerButton}
                  onPress={() => setScanning(false)}
                  disabled={processing}
                >
                  <MaterialIcons name="close" size={24} color={colors.surface} />
                  <Text style={styles.closeScannerText}>Cancel</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Scan Button */}
          <Pressable 
            style={styles.scanCard}
            onPress={() => setScanning(true)}
          >
            <View style={styles.scanIconContainer}>
              <MaterialIcons name="qr-code-scanner" size={80} color={colors.primary} />
            </View>
            <Text style={styles.scanTitle}>Scan QR Code</Text>
            <Text style={styles.scanDescription}>
              Scan the QR code displayed by your instructor to check in to your class
            </Text>
            <View style={styles.scanButtonContainer}>
              <MaterialIcons name="camera-alt" size={20} color={colors.surface} />
              <Text style={styles.scanButtonText}>Open Scanner</Text>
            </View>
          </Pressable>

          {/* Instructions */}
          <View style={styles.instructionsCard}>
            <Text style={styles.instructionsTitle}>How to Check In</Text>
            <View style={styles.instructionItem}>
              <View style={styles.instructionNumber}>
                <Text style={styles.instructionNumberText}>1</Text>
              </View>
              <Text style={styles.instructionText}>
                Arrive at your booked class location
              </Text>
            </View>
            <View style={styles.instructionItem}>
              <View style={styles.instructionNumber}>
                <Text style={styles.instructionNumberText}>2</Text>
              </View>
              <Text style={styles.instructionText}>
                Tap "Open Scanner" to activate your camera
              </Text>
            </View>
            <View style={styles.instructionItem}>
              <View style={styles.instructionNumber}>
                <Text style={styles.instructionNumberText}>3</Text>
              </View>
              <Text style={styles.instructionText}>
                Scan the QR code shown by Lorenzo
              </Text>
            </View>
            <View style={styles.instructionItem}>
              <View style={styles.instructionNumber}>
                <Text style={styles.instructionNumberText}>4</Text>
              </View>
              <Text style={styles.instructionText}>
                You're checked in! Enjoy your class
              </Text>
            </View>
          </View>

          {/* Check-in History */}
          {history.length > 0 && (
            <View style={styles.historySection}>
              <Text style={styles.sectionTitle}>Check-in History</Text>
              {history.map((checkIn) => (
                <View key={checkIn.id} style={styles.historyCard}>
                  <View style={styles.historyIcon}>
                    <MaterialIcons name="check-circle" size={24} color={colors.success} />
                  </View>
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyTitle}>{checkIn.class.title}</Text>
                    <Text style={styles.historyDate}>
                      {formatDateTime(checkIn.created_at)}
                    </Text>
                    {checkIn.class.location && (
                      <View style={styles.historyDetail}>
                        <MaterialIcons name="place" size={14} color={colors.textLight} />
                        <Text style={styles.historyDetailText}>{checkIn.class.location}</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.historyBadge}>
                    <MaterialIcons name="qr-code" size={16} color={colors.primary} />
                  </View>
                </View>
              ))}
            </View>
          )}

          {history.length === 0 && (
            <View style={styles.emptyState}>
              <MaterialIcons name="history" size={64} color={colors.textLight} />
              <Text style={styles.emptyText}>No check-ins yet</Text>
              <Text style={styles.emptySubtext}>
                Your class attendance history will appear here
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.textLight,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary + '20',
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  scanCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  scanIconContainer: {
    width: 120,
    height: 120,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  scanTitle: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  scanDescription: {
    ...typography.body,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  scanButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    ...shadows.md,
  },
  scanButtonText: {
    ...typography.button,
    color: colors.surface,
  },
  instructionsCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  instructionsTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  instructionNumber: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionNumberText: {
    ...typography.caption,
    color: colors.surface,
    fontWeight: '700',
  },
  instructionText: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    lineHeight: 22,
  },
  historySection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  historyIcon: {
    marginRight: spacing.md,
  },
  historyInfo: {
    flex: 1,
  },
  historyTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  historyDate: {
    ...typography.caption,
    color: colors.textLight,
    marginBottom: spacing.xs,
  },
  historyDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  historyDetailText: {
    ...typography.caption,
    color: colors.textLight,
    fontSize: 12,
  },
  historyBadge: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyText: {
    ...typography.h3,
    color: colors.textLight,
    marginTop: spacing.lg,
  },
  emptySubtext: {
    ...typography.caption,
    color: colors.textLight,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  scannerContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerFrame: {
    width: 280,
    height: 280,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: colors.primary,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  scannerText: {
    ...typography.body,
    color: colors.surface,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.xl,
    textAlign: 'center',
  },
  closeScannerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    gap: spacing.sm,
    position: 'absolute',
    bottom: 40,
    ...shadows.lg,
  },
  closeScannerText: {
    ...typography.button,
    color: colors.surface,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  permissionTitle: {
    ...typography.h2,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  permissionText: {
    ...typography.body,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  settingsButtonText: {
    ...typography.button,
    color: colors.surface,
  },
  cancelButton: {
    paddingVertical: spacing.md,
  },
  cancelButtonText: {
    ...typography.button,
    color: colors.textLight,
  },
});
