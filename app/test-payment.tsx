import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing } from '@/constants/theme';
import { useAuth, useAlert } from '@/template';
import { testPaymentService } from '@/services/testPaymentService';

export default function TestPaymentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const [loading, setLoading] = useState(false);

  const handleTestPayment = async () => {
    if (!user?.id) {
      showAlert('Error', 'User not authenticated');
      return;
    }

    setLoading(true);
    try {
      const { url, error } = await testPaymentService.createTestCheckout(user.id);

      if (error) {
        showAlert('Error', error);
        return;
      }

      if (url) {
        await Linking.openURL(url);
      } else {
        showAlert('Error', 'No payment URL returned');
      }
    } catch (error) {
      console.error('Test payment error:', error);
      showAlert('Error', error instanceof Error ? error.message : 'Failed to create test payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, spacing.md) }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>🧪 Test Payment</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <MaterialIcons name="science" size={48} color={colors.primary} />
          </View>

          <Text style={styles.title}>Stripe Live Mode Test</Text>
          <Text style={styles.subtitle}>Verify your production payment integration</Text>

          <View style={styles.infoBox}>
            <MaterialIcons name="info" size={24} color={colors.primary} />
            <Text style={styles.infoText}>
              This will create a real ¥100 charge to verify your Stripe live mode is working correctly.
            </Text>
          </View>

          <View style={styles.checklistContainer}>
            <Text style={styles.checklistTitle}>What This Tests:</Text>
            
            <View style={styles.checklistItem}>
              <MaterialIcons name="check-circle" size={20} color={colors.success} />
              <Text style={styles.checklistText}>Stripe live mode API keys</Text>
            </View>

            <View style={styles.checklistItem}>
              <MaterialIcons name="check-circle" size={20} color={colors.success} />
              <Text style={styles.checklistText}>Checkout session creation</Text>
            </View>

            <View style={styles.checklistItem}>
              <MaterialIcons name="check-circle" size={20} color={colors.success} />
              <Text style={styles.checklistText}>Webhook processing</Text>
            </View>

            <View style={styles.checklistItem}>
              <MaterialIcons name="check-circle" size={20} color={colors.success} />
              <Text style={styles.checklistText}>Email receipt delivery</Text>
            </View>

            <View style={styles.checklistItem}>
              <MaterialIcons name="check-circle" size={20} color={colors.success} />
              <Text style={styles.checklistText}>Edge Function validation</Text>
            </View>
          </View>

          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Test Amount:</Text>
            <Text style={styles.priceValue}>¥100</Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.testButton,
              pressed && styles.testButtonPressed,
              loading && styles.testButtonDisabled,
            ]}
            onPress={handleTestPayment}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <>
                <MaterialIcons name="payment" size={24} color={colors.surface} />
                <Text style={styles.testButtonText}>Start ¥100 Test Payment</Text>
              </>
            )}
          </Pressable>

          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsTitle}>After Payment:</Text>
            <Text style={styles.instructionsText}>
              1. Check your email for receipt{'\n'}
              2. Verify Cloud Dashboard → Edge Functions logs{'\n'}
              3. Check Stripe Dashboard for ¥100 transaction{'\n'}
              4. If all looks good, proceed with real token purchase!
            </Text>
          </View>

          <View style={styles.warningBox}>
            <MaterialIcons name="warning" size={20} color={colors.warning} />
            <Text style={styles.warningText}>
              This is a real payment. ¥100 will be charged to your card.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary + '20',
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  content: {
    flex: 1,
  },
  card: {
    backgroundColor: colors.surface,
    margin: spacing.lg,
    padding: spacing.xl,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.primary + '20',
  },
  iconContainer: {
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: colors.primary + '10',
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  checklistContainer: {
    backgroundColor: colors.background,
    padding: spacing.lg,
    borderRadius: 12,
    marginBottom: spacing.xl,
  },
  checklistTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  checklistText: {
    fontSize: 14,
    color: colors.text,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  priceLabel: {
    fontSize: 18,
    color: colors.textLight,
  },
  priceValue: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.primary,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: 12,
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  testButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  testButtonDisabled: {
    opacity: 0.6,
  },
  testButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.surface,
  },
  instructionsContainer: {
    backgroundColor: colors.success + '10',
    padding: spacing.lg,
    borderRadius: 12,
    marginBottom: spacing.lg,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.success,
    marginBottom: spacing.sm,
  },
  instructionsText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 22,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning + '10',
    padding: spacing.md,
    borderRadius: 12,
    gap: spacing.sm,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: colors.warning,
    fontWeight: '500',
  },
});
