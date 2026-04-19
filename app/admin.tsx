import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useAuth, useAlert, getSupabaseClient } from '@/template';
import { colors, spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { adminService, StudentWithTokens, PrivateLessonRequest } from '@/services/adminService';
import { revenueService, DetailedRevenueAnalytics } from '@/services/revenueService';
import { Class } from '@/services/classService';
import { MusicProduct } from '@/services/musicService';
import { 
  exportStudents, 
  exportBoutiqueProducts, 
  exportMusicProducts, 
  exportBoutiqueOrders, 
  exportClasses, 
  exportCreditRequests,
  exportToCSV 
} from '@/services/csvExportService';
import { getProductAnalytics, ProductAnalytics } from '@/services/productAnalyticsService';

interface BoutiqueProduct {
  id: string;
  name: string;
  price: number;
  stock_quantity: number;
  is_active: boolean;
  category: string;
  image_url?: string;
  description?: string;
  sizes?: any;
  created_at?: string;
}

interface BoutiqueOrder {
  id: string;
  total_price: number;
  status: string;
  shipping_name: string;
  shipping_address: string;
  tracking_number?: string;
  notes?: string;
  payment_intent_id?: string;
  created_at: string;
  updated_at: string;
  user_profiles?: {
    email: string;
  };
}

type TabType = 'students' | 'requests' | 'classes' | 'music' | 'revenue' | 'boutique' | 'analytics';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    minHeight: 56,
  },
  backButton: {
    padding: spacing.xs,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    marginLeft: spacing.xs,
  },
  exportButton: {
    padding: spacing.xs,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutButton: {
    padding: spacing.xs,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.textLight,
    marginTop: spacing.md,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: 100,
  },
  statCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    marginBottom: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  statLabel: {
    ...typography.h3,
    color: colors.textLight,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    maxHeight: 48,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    minHeight: 48,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    ...typography.body,
    color: colors.textLight,
    fontSize: 12,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemCardSelected: {
    backgroundColor: colors.primary + '15',
    borderColor: colors.primary,
    borderWidth: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.primary,
    marginRight: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
    marginRight: spacing.md,
    backgroundColor: colors.background,
  },
  itemInfo: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
    lineHeight: 18,
    flexShrink: 1,
  },
  itemSubtitle: {
    fontSize: 13,
    color: colors.textLight,
    marginBottom: 3,
    lineHeight: 18,
  },
  itemPrice: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: '700',
    marginTop: 2,
  },
  toggleButton: {
    backgroundColor: colors.textLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    minWidth: 70,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleButtonActive: {
    backgroundColor: colors.success,
  },
  toggleButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  deleteButton: {
    backgroundColor: colors.error,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
  },
  editButton: {
    backgroundColor: colors.primary,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xl + 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.lg,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginLeft: spacing.sm,
    minWidth: 44,
    minHeight: 44,
  },
  approveButton: {
    backgroundColor: colors.success,
  },
  rejectButton: {
    backgroundColor: colors.error,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  miniStatCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  miniStatNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  miniStatLabel: {
    ...typography.caption,
    color: colors.textLight,
    textAlign: 'center',
  },
  criticalAlertCard: {
    borderColor: colors.error,
    borderWidth: 2,
    backgroundColor: colors.error + '10',
  },
  stockStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  rankText: {
    ...typography.caption,
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  categoryCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  categoryName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  categoryRevenue: {
    ...typography.body,
    fontWeight: '700',
    color: colors.primary,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  categoryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  categoryPercentage: {
    ...typography.caption,
    color: colors.textLight,
    fontWeight: '600',
  },
  categoryOrders: {
    ...typography.caption,
    color: colors.textLight,
  },
  trendCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  trendLabel: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  trendDate: {
    ...typography.caption,
    color: colors.textLight,
    width: 60,
  },
  trendBar: {
    flex: 1,
    height: 20,
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  trendBarFill: {
    height: '100%',
  },
  trendAmount: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '600',
    width: 80,
    textAlign: 'right',
  },
  batchToolbar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadows.lg,
  },
  batchToolbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  batchToolbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  batchCount: {
    ...typography.body,
    fontWeight: '600',
    color: colors.primary,
  },
  batchActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    minHeight: 40,
  },
  batchExportButton: {
    backgroundColor: colors.success,
  },
  batchVisibilityButton: {
    backgroundColor: colors.primary,
  },
  batchPriceButton: {
    backgroundColor: colors.warning,
  },
  batchDeleteButton: {
    backgroundColor: colors.error,
  },
  batchActionText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  selectAllBar: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  selectAllText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  cancelSelectButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  cancelSelectText: {
    ...typography.body,
    color: colors.textLight,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
    marginBottom: spacing.lg,
    minHeight: 48,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    minHeight: 44,
  },
  modalCancelButton: {
    backgroundColor: colors.textLight,
  },
  modalConfirmButton: {
    backgroundColor: colors.primary,
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { showAlert } = useAlert();
  const supabase = getSupabaseClient();

  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<TabType>('students');
  
  const [students, setStudents] = React.useState<StudentWithTokens[]>([]);
  const [requests, setRequests] = React.useState<PrivateLessonRequest[]>([]);
  const [classes, setClasses] = React.useState<Class[]>([]);
  const [musicProducts, setMusicProducts] = React.useState<MusicProduct[]>([]);
  const [boutiqueProducts, setBoutiqueProducts] = React.useState<BoutiqueProduct[]>([]);
  const [boutiqueOrders, setBoutiqueOrders] = React.useState<BoutiqueOrder[]>([]);
  const [revenue, setRevenue] = React.useState<DetailedRevenueAnalytics | null>(null);
  
  const [toggling, setToggling] = React.useState<string | null>(null);
  const [exporting, setExporting] = React.useState(false);
  const [analytics, setAnalytics] = React.useState<ProductAnalytics | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = React.useState(false);

  // Selection mode state
  const [selectionMode, setSelectionMode] = React.useState(false);
  const [selectedClasses, setSelectedClasses] = React.useState<Set<string>>(new Set());
  const [selectedMusic, setSelectedMusic] = React.useState<Set<string>>(new Set());
  const [selectedBoutique, setSelectedBoutique] = React.useState<Set<string>>(new Set());

  // Bulk price update modal
  const [priceModalVisible, setPriceModalVisible] = React.useState(false);
  const [newPrice, setNewPrice] = React.useState('');
  const [updatingPrices, setUpdatingPrices] = React.useState(false);

  React.useEffect(() => {
    checkAdminAccess();
  }, [user]);

  // Clear selection when switching tabs
  React.useEffect(() => {
    setSelectionMode(false);
    setSelectedClasses(new Set());
    setSelectedMusic(new Set());
    setSelectedBoutique(new Set());
  }, [activeTab]);

  const checkAdminAccess = async () => {
    if (!user) {
      router.replace('/landing');
      return;
    }

    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (!profile?.is_admin) {
        showAlert('Access denied', 'Admin only');
        router.replace('/(tabs)/dashboard');
        return;
      }

      await loadStats();
    } catch (error) {
      console.error('Admin access check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('*')
        .order('start_time', { ascending: false });
      
      if (classesError) throw classesError;
      setClasses(classesData || []);
      
      const { data: musicData, error: musicError } = await supabase
        .from('music_products')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (musicError) throw musicError;
      setMusicProducts(musicData || []);
      
      const { data: boutiqueData, error: boutiqueError } = await supabase
        .from('boutique_products')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (boutiqueError) throw boutiqueError;
      setBoutiqueProducts(boutiqueData || []);
      
      const { data: ordersData, error: ordersError } = await supabase
        .from('boutique_orders')
        .select(`
          *,
          user_profiles (email)
        `)
        .order('created_at', { ascending: false });
      
      if (ordersError) throw ordersError;
      setBoutiqueOrders(ordersData || []);
      
      const { data: studentsData, error: studentsError } = await supabase
        .from('user_profiles')
        .select(`
          id,
          username,
          email,
          tokens(total_tokens, used_tokens)
        `)
        .order('email', { ascending: true });
      
      if (studentsError) throw studentsError;
      setStudents(studentsData || []);
      
      const { data: requestsData, error: requestsError } = await supabase
        .from('private_lessons')
        .select(`
          id,
          user_id,
          requested_date,
          requested_time,
          num_participants,
          total_price,
          status,
          created_at,
          user_profiles(id, username, email)
        `)
        .order('created_at', { ascending: false });
      
      if (requestsError) throw requestsError;
      setRequests(requestsData || []);

      // Load analytics data
      if (activeTab === 'analytics') {
        setLoadingAnalytics(true);
        const analyticsData = await getProductAnalytics();
        setAnalytics(analyticsData);
        setLoadingAnalytics(false);
      }
      
    } catch (error: any) {
      console.error('Load data error:', error);
      showAlert('Error', error.message || 'Failed to load data');
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadStats();
  };

  const toggleSelection = (id: string) => {
    if (activeTab === 'classes') {
      const newSet = new Set(selectedClasses);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      setSelectedClasses(newSet);
      if (newSet.size === 0) setSelectionMode(false);
    } else if (activeTab === 'music') {
      const newSet = new Set(selectedMusic);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      setSelectedMusic(newSet);
      if (newSet.size === 0) setSelectionMode(false);
    } else if (activeTab === 'boutique') {
      const newSet = new Set(selectedBoutique);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      setSelectedBoutique(newSet);
      if (newSet.size === 0) setSelectionMode(false);
    }
  };

  const selectAll = () => {
    if (activeTab === 'classes') {
      setSelectedClasses(new Set(classes.map(c => c.id)));
    } else if (activeTab === 'music') {
      setSelectedMusic(new Set(musicProducts.map(m => m.id)));
    } else if (activeTab === 'boutique') {
      setSelectedBoutique(new Set(boutiqueProducts.map(b => b.id)));
    }
  };

  const deselectAll = () => {
    setSelectedClasses(new Set());
    setSelectedMusic(new Set());
    setSelectedBoutique(new Set());
    setSelectionMode(false);
  };

  const getSelectedItems = () => {
    if (activeTab === 'classes') return selectedClasses;
    if (activeTab === 'music') return selectedMusic;
    if (activeTab === 'boutique') return selectedBoutique;
    return new Set();
  };

  const getSelectedCount = () => getSelectedItems().size;

  const handleBatchDelete = async () => {
    const count = getSelectedCount();
    if (count === 0) return;

    Alert.alert(
      'Delete Items',
      `Delete ${count} selected items? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const ids = Array.from(getSelectedItems());
              let tableName = '';
              
              if (activeTab === 'classes') tableName = 'classes';
              else if (activeTab === 'music') tableName = 'music_products';
              else if (activeTab === 'boutique') tableName = 'boutique_products';
              
              const { error } = await supabase
                .from(tableName)
                .delete()
                .in('id', ids);
              
              if (error) throw error;
              
              showAlert('Success', `Deleted ${count} items successfully`);
              deselectAll();
              loadStats();
            } catch (error: any) {
              console.error('Batch delete error:', error);
              showAlert('Error', error.message || 'Failed to delete items');
            }
          }
        }
      ]
    );
  };

  const handleBatchToggleVisibility = async () => {
    const count = getSelectedCount();
    if (count === 0) return;

    try {
      const ids = Array.from(getSelectedItems());
      let tableName = '';
      let currentItems: any[] = [];
      
      if (activeTab === 'music') {
        tableName = 'music_products';
        currentItems = musicProducts.filter(m => ids.includes(m.id));
      } else if (activeTab === 'boutique') {
        tableName = 'boutique_products';
        currentItems = boutiqueProducts.filter(b => ids.includes(b.id));
      } else return;
      
      // If any are active, deactivate all; otherwise activate all
      const anyActive = currentItems.some(item => item.is_active);
      const newStatus = !anyActive;
      
      const { error } = await supabase
        .from(tableName)
        .update({ is_active: newStatus })
        .in('id', ids);
      
      if (error) throw error;
      
      showAlert('Success', `${newStatus ? 'Shown' : 'Hidden'} ${count} items`);
      deselectAll();
      loadStats();
    } catch (error: any) {
      console.error('Batch visibility error:', error);
      showAlert('Error', error.message || 'Failed to update visibility');
    }
  };

  const handleBatchExport = async () => {
    const selectedIds = Array.from(getSelectedItems());
    if (selectedIds.length === 0) return;

    setExporting(true);
    try {
      let result;
      
      if (activeTab === 'classes') {
        const selectedItems = classes.filter(c => selectedIds.includes(c.id));
        result = await exportClasses(selectedItems);
      } else if (activeTab === 'music') {
        const selectedItems = musicProducts.filter(m => selectedIds.includes(m.id));
        result = await exportMusicProducts(selectedItems);
      } else if (activeTab === 'boutique') {
        const selectedItems = boutiqueProducts.filter(b => selectedIds.includes(b.id));
        result = await exportBoutiqueProducts(selectedItems);
      }
      
      if (result?.success) {
        showAlert('Success', `Exported ${selectedIds.length} items to CSV`);
      } else {
        showAlert('Error', result?.error || 'Export failed');
      }
    } catch (error: any) {
      console.error('Batch export error:', error);
      showAlert('Error', error.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleBatchPriceUpdate = () => {
    if (activeTab === 'classes' || activeTab === 'music' || activeTab === 'boutique') {
      setPriceModalVisible(true);
      setNewPrice('');
    }
  };

  const confirmBatchPriceUpdate = async () => {
    const count = getSelectedCount();
    if (count === 0 || !newPrice.trim()) {
      showAlert('Error', 'Please enter a valid price');
      return;
    }

    const priceValue = parseInt(newPrice);
    if (isNaN(priceValue) || priceValue <= 0) {
      showAlert('Error', 'Please enter a valid positive number');
      return;
    }

    setUpdatingPrices(true);
    try {
      const ids = Array.from(getSelectedItems());
      let tableName = '';
      let priceColumn = '';
      
      if (activeTab === 'classes') {
        tableName = 'classes';
        priceColumn = 'fee_per_person';
      } else if (activeTab === 'music') {
        tableName = 'music_products';
        priceColumn = 'price';
      } else if (activeTab === 'boutique') {
        tableName = 'boutique_products';
        priceColumn = 'price';
      }
      
      const { error } = await supabase
        .from(tableName)
        .update({ [priceColumn]: priceValue })
        .in('id', ids);
      
      if (error) throw error;
      
      showAlert('Success', `Updated prices for ${count} items to ¥${priceValue}`);
      setPriceModalVisible(false);
      deselectAll();
      loadStats();
    } catch (error: any) {
      console.error('Batch price update error:', error);
      showAlert('Error', error.message || 'Failed to update prices');
    } finally {
      setUpdatingPrices(false);
    }
  };

  const toggleMusicProduct = async (id: string, currentStatus: boolean) => {
    setToggling(id);
    const { error } = await supabase
      .from('music_products')
      .update({ is_active: !currentStatus })
      .eq('id', id);
    
    setToggling(null);
    if (error) {
      showAlert('Error', error.message);
    } else {
      loadStats();
    }
  };

  const toggleBoutiqueProduct = async (id: string, currentStatus: boolean) => {
    setToggling(id);
    const { error } = await supabase
      .from('boutique_products')
      .update({ is_active: !currentStatus })
      .eq('id', id);
    
    setToggling(null);
    if (error) {
      showAlert('Error', error.message);
    } else {
      loadStats();
    }
  };

  const deleteClass = async (id: string, title: string) => {
    Alert.alert(
      'Delete Class',
      `Delete "${title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('classes').delete().eq('id', id);
            if (error) {
              showAlert('Error', error.message);
            } else {
              loadStats();
            }
          }
        }
      ]
    );
  };

  const deleteMusicProduct = async (id: string, title: string) => {
    Alert.alert(
      'Delete Music',
      `Delete "${title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('music_products').delete().eq('id', id);
            if (error) {
              showAlert('Error', error.message);
            } else {
              loadStats();
            }
          }
        }
      ]
    );
  };

  const deleteBoutiqueProduct = async (id: string, name: string) => {
    Alert.alert(
      'Delete Product',
      `Delete "${name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('boutique_products').delete().eq('id', id);
            if (error) {
              showAlert('Error', error.message);
            } else {
              loadStats();
            }
          }
        }
      ]
    );
  };

  const handleApproveRequest = async (requestId: string) => {
    await adminService.approvePrivateLessonRequest(requestId);
    loadStats();
  };

  const handleRejectRequest = async (requestId: string) => {
    await adminService.rejectPrivateLessonRequest(requestId);
    loadStats();
  };

  const handleLogout = async () => {
    const { error } = await logout();
    if (!error) router.replace('/landing');
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      let result;
      
      switch (activeTab) {
        case 'students':
          result = await exportStudents(students);
          break;
        case 'classes':
          result = await exportClasses(classes);
          break;
        case 'music':
          result = await exportMusicProducts(musicProducts);
          break;
        case 'boutique':
          result = await exportBoutiqueProducts(boutiqueProducts);
          break;
        case 'requests':
          result = await exportCreditRequests(requests);
          break;
        default:
          result = { success: false, error: 'No data to export' };
      }
      
      if (result.success) {
        showAlert('Success', 'CSV exported successfully!');
      } else {
        showAlert('Error', result.error || 'Export failed');
      }
    } catch (error: any) {
      console.error('Export error:', error);
      showAlert('Error', error.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const canUseSelectionMode = activeTab === 'classes' || activeTab === 'music' || activeTab === 'boutique';

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.6 }]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <View style={{ flexDirection: 'row', gap: 2 }}>
          {canUseSelectionMode && !selectionMode && (
            <Pressable
              onPress={() => setSelectionMode(true)}
              style={({ pressed }) => [
                styles.exportButton,
                pressed && { opacity: 0.6 }
              ]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialIcons name="checklist" size={24} color={colors.primary} />
            </Pressable>
          )}
          <Pressable
            onPress={() => router.push('/admin-analytics')}
            style={({ pressed }) => [
              styles.exportButton,
              pressed && { opacity: 0.6 }
            ]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons name="insights" size={24} color="#9C27B0" />
          </Pressable>
          <Pressable
            onPress={() => router.push('/admin-messaging')}
            style={({ pressed }) => [
              styles.exportButton,
              pressed && { opacity: 0.6 }
            ]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons name="email" size={24} color={colors.primary} />
          </Pressable>
          <Pressable
            onPress={handleExport}
            disabled={exporting || activeTab === 'revenue'}
            style={({ pressed }) => [
              styles.exportButton,
              (exporting || activeTab === 'revenue') && { opacity: 0.5 },
              pressed && { opacity: 0.6 }
            ]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {exporting ? (
              <ActivityIndicator size="small" color={colors.success} />
            ) : (
              <MaterialIcons name="file-download" size={24} color={colors.success} />
            )}
          </Pressable>
          <Pressable
            onPress={handleLogout}
            style={({ pressed }) => [styles.logoutButton, pressed && { opacity: 0.6 }]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons name="logout" size={24} color={colors.error} />
          </Pressable>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar}>
        <Pressable
          style={({ pressed }) => [
            styles.tab,
            activeTab === 'students' && styles.tabActive,
            pressed && { opacity: 0.7 }
          ]}
          onPress={() => setActiveTab('students')}
          hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
        >
          <MaterialIcons name="people" size={18} color={activeTab === 'students' ? colors.primary : colors.textLight} />
          <Text style={[styles.tabText, activeTab === 'students' && styles.tabTextActive]}>Students</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.tab,
            activeTab === 'requests' && styles.tabActive,
            pressed && { opacity: 0.7 }
          ]}
          onPress={() => setActiveTab('requests')}
          hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
        >
          <MaterialIcons name="assignment" size={18} color={activeTab === 'requests' ? colors.primary : colors.textLight} />
          <Text style={[styles.tabText, activeTab === 'requests' && styles.tabTextActive]}>Requests ({requests.filter(r => r.status === 'pending').length})</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.tab,
            activeTab === 'classes' && styles.tabActive,
            pressed && { opacity: 0.7 }
          ]}
          onPress={() => setActiveTab('classes')}
          hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
        >
          <MaterialIcons name="event" size={18} color={activeTab === 'classes' ? colors.primary : colors.textLight} />
          <Text style={[styles.tabText, activeTab === 'classes' && styles.tabTextActive]}>Classes ({classes.length})</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.tab,
            activeTab === 'music' && styles.tabActive,
            pressed && { opacity: 0.7 }
          ]}
          onPress={() => setActiveTab('music')}
          hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
        >
          <MaterialIcons name="music-note" size={18} color={activeTab === 'music' ? colors.primary : colors.textLight} />
          <Text style={[styles.tabText, activeTab === 'music' && styles.tabTextActive]}>Music ({musicProducts.length})</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.tab,
            activeTab === 'boutique' && styles.tabActive,
            pressed && { opacity: 0.7 }
          ]}
          onPress={() => setActiveTab('boutique')}
          hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
        >
          <MaterialIcons name="store" size={18} color={activeTab === 'boutique' ? colors.primary : colors.textLight} />
          <Text style={[styles.tabText, activeTab === 'boutique' && styles.tabTextActive]}>Boutique ({boutiqueProducts.length})</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.tab,
            activeTab === 'revenue' && styles.tabActive,
            pressed && { opacity: 0.7 }
          ]}
          onPress={() => setActiveTab('revenue')}
          hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
        >
          <MaterialIcons name="bar-chart" size={18} color={activeTab === 'revenue' ? colors.primary : colors.textLight} />
          <Text style={[styles.tabText, activeTab === 'revenue' && styles.tabTextActive]}>Revenue</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.tab,
            activeTab === 'analytics' && styles.tabActive,
            pressed && { opacity: 0.7 }
          ]}
          onPress={() => setActiveTab('analytics')}
          hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
        >
          <MaterialIcons name="trending-up" size={18} color={activeTab === 'analytics' ? colors.primary : colors.textLight} />
          <Text style={[styles.tabText, activeTab === 'analytics' && styles.tabTextActive]}>Analytics</Text>
        </Pressable>
      </ScrollView>

      {selectionMode && canUseSelectionMode && (
        <View style={styles.selectAllBar}>
          <Pressable
            onPress={() => {
              if (getSelectedCount() === (activeTab === 'classes' ? classes.length : activeTab === 'music' ? musicProducts.length : boutiqueProducts.length)) {
                deselectAll();
              } else {
                selectAll();
              }
            }}
            style={styles.selectAllButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <View style={[
              styles.checkbox,
              getSelectedCount() > 0 && styles.checkboxSelected
            ]}>
              {getSelectedCount() > 0 && (
                <MaterialIcons name="check" size={16} color="#fff" />
              )}
            </View>
            <Text style={styles.selectAllText}>
              {getSelectedCount() === (activeTab === 'classes' ? classes.length : activeTab === 'music' ? musicProducts.length : boutiqueProducts.length)
                ? 'Deselect All'
                : 'Select All'}
            </Text>
          </Pressable>
          <Pressable
            onPress={deselectAll}
            style={styles.cancelSelectButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.cancelSelectText}>Cancel</Text>
          </Pressable>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          selectionMode && getSelectedCount() > 0 && { paddingBottom: 180 }
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {activeTab === 'students' && students.map((student) => (
          <View key={student.id} style={styles.itemCard}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemTitle}>{student.username || student.email}</Text>
              <Text style={styles.itemSubtitle}>Tokens: {student.total_tokens || 0}</Text>
              <Text style={styles.itemSubtitle}>Bundles: {student.total_bundles || 0}</Text>
            </View>
          </View>
        ))}

        {activeTab === 'requests' && requests.map((request) => (
          <View key={request.id} style={styles.itemCard}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemTitle}>{request.user_profiles?.username || 'Student'}</Text>
              <Text style={styles.itemSubtitle}>{new Date(request.requested_date).toLocaleDateString()} - {request.num_participants} people</Text>
              <Text style={styles.itemPrice}>¥{request.total_price}</Text>
              <Text style={[styles.itemSubtitle, { color: request.status === 'pending' ? colors.warning : colors.success }]}>{request.status}</Text>
            </View>
            {request.status === 'pending' && (
              <View style={{ flexDirection: 'row' }}>
                <Pressable
                  style={({ pressed }) => [
                    styles.actionButton,
                    styles.approveButton,
                    pressed && { opacity: 0.7 }
                  ]}
                  onPress={() => handleApproveRequest(request.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MaterialIcons name="check" size={20} color="#fff" />
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.actionButton,
                    styles.rejectButton,
                    pressed && { opacity: 0.7 }
                  ]}
                  onPress={() => handleRejectRequest(request.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MaterialIcons name="close" size={20} color="#fff" />
                </Pressable>
              </View>
            )}
          </View>
        ))}

        {activeTab === 'classes' && (
          <>
            {classes.map((classItem) => (
              <Pressable
                key={classItem.id}
                style={[
                  styles.itemCard,
                  selectionMode && selectedClasses.has(classItem.id) && styles.itemCardSelected
                ]}
                onPress={() => selectionMode ? toggleSelection(classItem.id) : null}
                disabled={!selectionMode}
              >
                {selectionMode && (
                  <View style={[
                    styles.checkbox,
                    selectedClasses.has(classItem.id) && styles.checkboxSelected
                  ]}>
                    {selectedClasses.has(classItem.id) && (
                      <MaterialIcons name="check" size={16} color="#fff" />
                    )}
                  </View>
                )}
                {classItem.photo_urls && classItem.photo_urls.length > 0 && (
                  <Image
                    source={{ uri: classItem.photo_urls[0] }}
                    style={styles.productImage}
                    contentFit="cover"
                    transition={200}
                  />
                )}
                <View style={styles.itemInfo}>
                  <Text style={styles.itemTitle} numberOfLines={2} ellipsizeMode="tail">{classItem.title}</Text>
                  <Text style={styles.itemSubtitle} numberOfLines={1}>{classItem.class_type}</Text>
                  <Text style={styles.itemPrice}>¥{classItem.fee_per_person}/person</Text>
                </View>
                {!selectionMode && (
                  <View style={{ flexDirection: 'row' }}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.editButton,
                        pressed && { opacity: 0.7 }
                      ]}
                      onPress={() => router.push({ pathname: '/admin-add-class', params: { id: classItem.id } })}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <MaterialIcons name="edit" size={24} color="#fff" />
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [
                        styles.deleteButton,
                        pressed && { opacity: 0.7 }
                      ]}
                      onPress={() => deleteClass(classItem.id, classItem.title)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <MaterialIcons name="delete" size={24} color="#fff" />
                    </Pressable>
                  </View>
                )}
              </Pressable>
            ))}
            {!selectionMode && (
              <Pressable
                style={({ pressed }) => [styles.fab, pressed && { opacity: 0.8 }]}
                onPress={() => router.push('/admin-add-class')}
              >
                <MaterialIcons name="add" size={28} color="#fff" />
              </Pressable>
            )}
          </>
        )}

        {activeTab === 'music' && (
          <>
            {musicProducts.map((product) => (
              <Pressable
                key={product.id}
                style={[
                  styles.itemCard,
                  selectionMode && selectedMusic.has(product.id) && styles.itemCardSelected
                ]}
                onPress={() => selectionMode ? toggleSelection(product.id) : null}
                disabled={!selectionMode}
              >
                {selectionMode && (
                  <View style={[
                    styles.checkbox,
                    selectedMusic.has(product.id) && styles.checkboxSelected
                  ]}>
                    {selectedMusic.has(product.id) && (
                      <MaterialIcons name="check" size={16} color="#fff" />
                    )}
                  </View>
                )}
                {product.cover_image_url && (
                  <Image
                    source={{ uri: product.cover_image_url }}
                    style={styles.productImage}
                    contentFit="cover"
                    transition={200}
                  />
                )}
                <View style={styles.itemInfo}>
                  <Text style={styles.itemTitle} numberOfLines={2} ellipsizeMode="tail">{product.title}</Text>
                  <Text style={styles.itemSubtitle} numberOfLines={1}>{product.artist}</Text>
                  <Text style={styles.itemPrice}>¥{product.price}</Text>
                </View>
                {!selectionMode && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.toggleButton,
                        product.is_active && styles.toggleButtonActive,
                        pressed && { opacity: 0.7 }
                      ]}
                      onPress={() => toggleMusicProduct(product.id, product.is_active)}
                      disabled={toggling === product.id}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      {toggling === product.id ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.toggleButtonText}>
                          {product.is_active ? 'Visible' : 'Hidden'}
                        </Text>
                      )}
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [
                        styles.editButton,
                        pressed && { opacity: 0.7 }
                      ]}
                      onPress={() => router.push({ pathname: '/admin-add-music', params: { id: product.id } })}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <MaterialIcons name="edit" size={20} color="#fff" />
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [
                        styles.deleteButton,
                        pressed && { opacity: 0.7 }
                      ]}
                      onPress={() => deleteMusicProduct(product.id, product.title)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <MaterialIcons name="delete" size={20} color="#fff" />
                    </Pressable>
                  </View>
                )}
              </Pressable>
            ))}
            {!selectionMode && (
              <Pressable
                style={({ pressed }) => [styles.fab, pressed && { opacity: 0.8 }]}
                onPress={() => router.push('/admin-add-music')}
              >
                <MaterialIcons name="add" size={28} color="#fff" />
              </Pressable>
            )}
          </>
        )}

        {activeTab === 'boutique' && (
          <>
            {boutiqueProducts.map((product) => (
              <Pressable
                key={product.id}
                style={[
                  styles.itemCard,
                  selectionMode && selectedBoutique.has(product.id) && styles.itemCardSelected
                ]}
                onPress={() => selectionMode ? toggleSelection(product.id) : null}
                disabled={!selectionMode}
              >
                {selectionMode && (
                  <View style={[
                    styles.checkbox,
                    selectedBoutique.has(product.id) && styles.checkboxSelected
                  ]}>
                    {selectedBoutique.has(product.id) && (
                      <MaterialIcons name="check" size={16} color="#fff" />
                    )}
                  </View>
                )}
                {product.image_url && (
                  <Image
                    source={{ uri: product.image_url }}
                    style={styles.productImage}
                    contentFit="cover"
                    transition={200}
                  />
                )}
                <View style={styles.itemInfo}>
                  <Text style={styles.itemTitle} numberOfLines={2} ellipsizeMode="tail">{product.name}</Text>
                  <Text style={styles.itemSubtitle}>Stock: {product.stock_quantity}</Text>
                  <Text style={styles.itemPrice}>¥{product.price}</Text>
                </View>
                {!selectionMode && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.toggleButton,
                        product.is_active && styles.toggleButtonActive,
                        pressed && { opacity: 0.7 }
                      ]}
                      onPress={() => toggleBoutiqueProduct(product.id, product.is_active)}
                      disabled={toggling === product.id}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      {toggling === product.id ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.toggleButtonText}>
                          {product.is_active ? 'Visible' : 'Hidden'}
                        </Text>
                      )}
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [
                        styles.editButton,
                        pressed && { opacity: 0.7 }
                      ]}
                      onPress={() => router.push({ pathname: '/admin-add-boutique', params: { id: product.id } })}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <MaterialIcons name="edit" size={20} color="#fff" />
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [
                        styles.deleteButton,
                        pressed && { opacity: 0.7 }
                      ]}
                      onPress={() => deleteBoutiqueProduct(product.id, product.name)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <MaterialIcons name="delete" size={20} color="#fff" />
                    </Pressable>
                  </View>
                )}
              </Pressable>
            ))}
            {!selectionMode && (
              <Pressable
                style={({ pressed }) => [styles.fab, pressed && { opacity: 0.8 }]}
                onPress={() => router.push('/admin-add-boutique')}
              >
                <MaterialIcons name="add" size={28} color="#fff" />
              </Pressable>
            )}
          </>
        )}

        {activeTab === 'revenue' && revenue && (
          <View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>¥{revenue.totalRevenue.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Total Revenue</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{revenue.totalBookings}</Text>
              <Text style={styles.statLabel}>Total Bookings</Text>
            </View>
          </View>
        )}

        {activeTab === 'analytics' && (
          <View>
            {loadingAnalytics ? (
              <View style={[styles.statCard, styles.centered]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading analytics...</Text>
              </View>
            ) : analytics ? (
              <View>
                {/* Summary Stats */}
                <View style={styles.sectionHeader}>
                  <MaterialIcons name="assessment" size={24} color={colors.primary} />
                  <Text style={styles.sectionTitle}>Overview</Text>
                </View>
                <View style={styles.statsGrid}>
                  <View style={styles.miniStatCard}>
                    <Text style={styles.miniStatNumber}>¥{(analytics.summary.total_revenue / 100).toLocaleString()}</Text>
                    <Text style={styles.miniStatLabel}>Total Revenue</Text>
                  </View>
                  <View style={styles.miniStatCard}>
                    <Text style={styles.miniStatNumber}>{analytics.summary.total_orders}</Text>
                    <Text style={styles.miniStatLabel}>Total Orders</Text>
                  </View>
                </View>
                <View style={styles.statsGrid}>
                  <View style={styles.miniStatCard}>
                    <Text style={styles.miniStatNumber}>¥{(analytics.summary.boutique_revenue / 100).toLocaleString()}</Text>
                    <Text style={styles.miniStatLabel}>Boutique</Text>
                  </View>
                  <View style={styles.miniStatCard}>
                    <Text style={styles.miniStatNumber}>¥{(analytics.summary.music_revenue / 100).toLocaleString()}</Text>
                    <Text style={styles.miniStatLabel}>Music</Text>
                  </View>
                </View>

                {/* Stock Alerts */}
                {analytics.stockAlerts.length > 0 && (
                  <View>
                    <View style={styles.sectionHeader}>
                      <MaterialIcons name="warning" size={24} color={colors.error} />
                      <Text style={styles.sectionTitle}>Stock Alerts ({analytics.stockAlerts.length})</Text>
                    </View>
                    {analytics.stockAlerts.slice(0, 5).map((alert) => (
                      <View key={alert.id} style={[
                        styles.itemCard,
                        alert.stock_status === 'critical' && styles.criticalAlertCard
                      ]}>
                        {alert.image_url && (
                          <Image
                            source={{ uri: alert.image_url }}
                            style={styles.productImage}
                            contentFit="cover"
                            transition={200}
                          />
                        )}
                        <View style={styles.itemInfo}>
                          <Text style={styles.itemTitle}>{alert.product_name}</Text>
                          <View style={styles.stockStatusRow}>
                            <MaterialIcons 
                              name="inventory" 
                              size={16} 
                              color={alert.stock_status === 'critical' ? colors.error : colors.warning} 
                            />
                            <Text style={[
                              styles.itemSubtitle,
                              { color: alert.stock_status === 'critical' ? colors.error : colors.warning }
                            ]}>
                              Stock: {alert.current_stock} ({alert.stock_status})
                            </Text>
                          </View>
                          <Text style={styles.itemSubtitle}>Reorder: {alert.recommended_reorder} units</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Top Products */}
                <View style={styles.sectionHeader}>
                  <MaterialIcons name="stars" size={24} color={colors.success} />
                  <Text style={styles.sectionTitle}>Top Products</Text>
                </View>
                {analytics.topProducts.slice(0, 10).map((product, index) => (
                  <View key={product.id} style={styles.itemCard}>
                    <View style={styles.rankBadge}>
                      <Text style={styles.rankText}>#{index + 1}</Text>
                    </View>
                    {product.image_url && (
                      <Image
                        source={{ uri: product.image_url }}
                        style={styles.productImage}
                        contentFit="cover"
                        transition={200}
                      />
                    )}
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemTitle}>{product.name}</Text>
                      <Text style={styles.itemSubtitle}>
                        {product.category === 'boutique' ? '🛍️ Boutique' : '🎵 Music'}
                      </Text>
                      <Text style={styles.itemSubtitle}>{product.units_sold} sold</Text>
                      <Text style={styles.itemPrice}>¥{(product.revenue / 100).toLocaleString()}</Text>
                    </View>
                  </View>
                ))}

                {/* Category Breakdown */}
                <View style={styles.sectionHeader}>
                  <MaterialIcons name="pie-chart" size={24} color={colors.primary} />
                  <Text style={styles.sectionTitle}>Revenue by Category</Text>
                </View>
                {analytics.categoryRevenue.map((category) => (
                  <View key={category.category} style={styles.categoryCard}>
                    <View style={styles.categoryHeader}>
                      <Text style={styles.categoryName}>{category.category}</Text>
                      <Text style={styles.categoryRevenue}>¥{(category.revenue / 100).toLocaleString()}</Text>
                    </View>
                    <View style={styles.progressBar}>
                      <View style={[
                        styles.progressFill,
                        { width: `${category.percentage}%` }
                      ]} />
                    </View>
                    <View style={styles.categoryStats}>
                      <Text style={styles.categoryPercentage}>{category.percentage.toFixed(1)}%</Text>
                      <Text style={styles.categoryOrders}>{category.order_count} orders</Text>
                    </View>
                  </View>
                ))}

                {/* Stock Turnover */}
                <View style={styles.sectionHeader}>
                  <MaterialIcons name="autorenew" size={24} color={colors.primary} />
                  <Text style={styles.sectionTitle}>Stock Turnover (Top 10)</Text>
                </View>
                {analytics.stockTurnover.slice(0, 10).map((item) => (
                  <View key={item.product_id} style={styles.itemCard}>
                    {item.image_url && (
                      <Image
                        source={{ uri: item.image_url }}
                        style={styles.productImage}
                        contentFit="cover"
                        transition={200}
                      />
                    )}
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemTitle}>{item.product_name}</Text>
                      <Text style={styles.itemSubtitle}>Sold: {item.total_sold} in 30 days</Text>
                      <Text style={styles.itemSubtitle}>Stock: {item.current_stock}</Text>
                      <Text style={[
                        styles.itemSubtitle,
                        { color: item.days_until_stockout < 30 ? colors.error : colors.success }
                      ]}>
                        {item.days_until_stockout < 9999 
                          ? `Stockout in ${item.days_until_stockout} days`
                          : 'Healthy stock'}
                      </Text>
                    </View>
                  </View>
                ))}

                {/* Sales Trends */}
                <View style={styles.sectionHeader}>
                  <MaterialIcons name="show-chart" size={24} color={colors.primary} />
                  <Text style={styles.sectionTitle}>30-Day Sales Trend</Text>
                </View>
                <View style={styles.trendCard}>
                  <Text style={styles.trendLabel}>Total Sales</Text>
                  {analytics.salesTrends.slice(-7).map((point) => (
                    <View key={point.date} style={styles.trendRow}>
                      <Text style={styles.trendDate}>
                        {new Date(point.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                      </Text>
                      <View style={styles.trendBar}>
                        <View style={[
                          styles.trendBarFill,
                          { 
                            width: `${Math.min((point.total_revenue / Math.max(...analytics.salesTrends.map(p => p.total_revenue))) * 100, 100)}%`,
                            backgroundColor: colors.primary
                          }
                        ]} />
                      </View>
                      <Text style={styles.trendAmount}>¥{(point.total_revenue / 100).toLocaleString()}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <View style={[styles.statCard, styles.centered]}>
                <MaterialIcons name="info" size={48} color={colors.textLight} />
                <Text style={styles.loadingText}>No analytics data available</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Batch Actions Toolbar */}
      {selectionMode && getSelectedCount() > 0 && (
        <View style={[styles.batchToolbar, { paddingBottom: insets.bottom + spacing.md }]}>
          <View style={styles.batchToolbarLeft}>
            <Text style={styles.batchCount}>{getSelectedCount()} selected</Text>
          </View>
          <View style={styles.batchToolbarRight}>
            <Pressable
              style={({ pressed }) => [
                styles.batchActionButton,
                styles.batchExportButton,
                pressed && { opacity: 0.7 }
              ]}
              onPress={handleBatchExport}
              disabled={exporting}
            >
              {exporting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <MaterialIcons name="file-download" size={20} color="#fff" />
              )}
            </Pressable>
            
            {(activeTab === 'music' || activeTab === 'boutique') && (
              <Pressable
                style={({ pressed }) => [
                  styles.batchActionButton,
                  styles.batchVisibilityButton,
                  pressed && { opacity: 0.7 }
                ]}
                onPress={handleBatchToggleVisibility}
              >
                <MaterialIcons name="visibility" size={20} color="#fff" />
              </Pressable>
            )}
            
            <Pressable
              style={({ pressed }) => [
                styles.batchActionButton,
                styles.batchPriceButton,
                pressed && { opacity: 0.7 }
              ]}
              onPress={handleBatchPriceUpdate}
            >
              <MaterialIcons name="monetization-on" size={20} color="#fff" />
            </Pressable>
            
            <Pressable
              style={({ pressed }) => [
                styles.batchActionButton,
                styles.batchDeleteButton,
                pressed && { opacity: 0.7 }
              ]}
              onPress={handleBatchDelete}
            >
              <MaterialIcons name="delete" size={20} color="#fff" />
            </Pressable>
          </View>
        </View>
      )}

      {/* Price Update Modal */}
      <Modal
        visible={priceModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPriceModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Bulk Price Update</Text>
            <Text style={styles.itemSubtitle}>
              Update price for {getSelectedCount()} selected items
            </Text>
            <TextInput
              style={styles.modalInput}
              value={newPrice}
              onChangeText={setNewPrice}
              placeholder="Enter new price (¥)"
              keyboardType="number-pad"
              placeholderTextColor={colors.textLight}
            />
            <View style={styles.modalButtons}>
              <Pressable
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.modalCancelButton,
                  pressed && { opacity: 0.7 }
                ]}
                onPress={() => setPriceModalVisible(false)}
                disabled={updatingPrices}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.modalConfirmButton,
                  updatingPrices && { opacity: 0.5 },
                  pressed && { opacity: 0.7 }
                ]}
                onPress={confirmBatchPriceUpdate}
                disabled={updatingPrices}
              >
                {updatingPrices ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalButtonText}>Update</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
