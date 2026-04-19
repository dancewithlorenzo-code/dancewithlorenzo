import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Calendar } from 'react-native-calendars';

import { useAuth } from '@/template';
import { colors, spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { getCalendarClasses, getClassesForDate, formatDateLong, formatTimeRange, MarkedDates, CalendarClass, DateStats } from '@/services/calendarService';

type ViewMode = 'month' | 'week';

// --- Utility: get the 7 dates of the week containing a given dateString ---
function getWeekDates(dateString: string): string[] {
  const date = new Date(dateString);
  // Sunday = 0, so shift so week starts on Monday
  const day = date.getDay(); // 0=Sun
  const monday = new Date(date);
  monday.setDate(date.getDate() - ((day + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().split('T')[0];
  });
}

function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

// --- Custom Day Component (monthly calendar) ---
interface DayProps {
  date?: { dateString: string; day: number; month: number; year: number; timestamp: number };
  state?: 'disabled' | 'today' | '';
  marking?: {
    selected?: boolean;
    selectedColor?: string;
    classes?: CalendarClass[];
    stats?: DateStats;
    dotColor?: string;
  };
  onPress?: (date: any) => void;
}

function CustomDay({ date, state, marking, onPress }: DayProps) {
  const isSelected = marking?.selected;
  const isToday = state === 'today';
  const isDisabled = state === 'disabled';
  const isPast = !isToday && !isDisabled && !!date?.dateString && date.dateString < todayString();
  const classCount = marking?.stats?.classCount || 0;
  const hasBookedClass = marking?.stats?.hasBookedClass || false;

  return (
    <Pressable
      onPress={() => !isDisabled && onPress && onPress(date)}
      style={({ pressed }) => [pressed && { opacity: 0.7 }, isPast && { opacity: 0.35 }]}
    >
      <View style={styles.dayContainer}>
        <View style={{ position: 'relative' }}>
          <View style={[
            styles.dayCircle,
            isSelected && { backgroundColor: colors.primary },
            isToday && !isSelected && { backgroundColor: colors.primary + '15' },
          ]}>
            <Text style={[
              styles.dayText,
              isSelected && styles.dayTextSelected,
              isToday && !isSelected && styles.dayTextToday,
              isDisabled && styles.dayTextDisabled,
            ]}>
              {date?.day}
            </Text>
          </View>

        </View>
      </View>
    </Pressable>
  );
}

// --- Week Strip Component ---
interface WeekStripProps {
  weekDates: string[];
  selectedDate: string;
  markedDates: MarkedDates;
  onSelectDate: (date: string) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function WeekStrip({ weekDates, selectedDate, markedDates, onSelectDate, onPrevWeek, onNextWeek }: WeekStripProps) {
  const today = todayString();

  return (
    <View style={styles.weekStripContainer}>
      <Pressable
        onPress={onPrevWeek}
        style={({ pressed }) => [styles.weekNavBtn, pressed && { opacity: 0.5 }]}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <MaterialIcons name="chevron-left" size={28} color={colors.primary} />
      </Pressable>

      {weekDates.map((dateStr, idx) => {
        const isSelected = dateStr === selectedDate;
        const isToday = dateStr === today;
        const isPast = !isToday && dateStr < today;
        const mark = markedDates[dateStr];
        const classCount = mark?.stats?.classCount || 0;
        const hasBooking = mark?.stats?.hasBookedClass || false;

        return (
          <Pressable
            key={dateStr}
            onPress={() => onSelectDate(dateStr)}
            style={({ pressed }) => [
              styles.weekDayCell,
              pressed && { opacity: 0.7 },
              isPast && { opacity: 0.35 },
            ]}
          >
            <Text style={[
              styles.weekDayLabel,
              isToday && { color: colors.primary },
              isSelected && { color: colors.primary, fontWeight: '700' },
            ]}>
              {DAY_LABELS[idx]}
            </Text>

            <View style={{ position: 'relative', alignItems: 'center' }}>
              <View style={[
                styles.weekDayCircle,
                isSelected && { backgroundColor: colors.primary },
                isToday && !isSelected && { backgroundColor: colors.primary + '18', borderWidth: 1.5, borderColor: colors.primary },
              ]}>
                <Text style={[
                  styles.weekDayNumber,
                  isSelected && { color: '#fff', fontWeight: '700' },
                  isToday && !isSelected && { color: colors.primary, fontWeight: '700' },
                ]}>
                  {parseInt(dateStr.split('-')[2], 10)}
                </Text>
              </View>


            </View>

            {/* Dot indicator below circle */}
            {classCount > 0 && (
              <View style={[
                styles.weekDot,
                { backgroundColor: hasBooking ? colors.success : colors.primary },
                isSelected && { backgroundColor: colors.primary + '60' },
              ]} />
            )}
          </Pressable>
        );
      })}

      <Pressable
        onPress={onNextWeek}
        style={({ pressed }) => [styles.weekNavBtn, pressed && { opacity: 0.5 }]}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <MaterialIcons name="chevron-right" size={28} color={colors.primary} />
      </Pressable>
    </View>
  );
}

// ============================================================
// Main Screen
// ============================================================
export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [markedDates, setMarkedDates] = React.useState<MarkedDates>({});
  const [selectedDate, setSelectedDate] = React.useState(todayString());
  const [selectedClasses, setSelectedClasses] = React.useState<CalendarClass[]>([]);
  const [selectedStats, setSelectedStats] = React.useState<DateStats | null>(null);

  // View mode
  const [viewMode, setViewMode] = React.useState<ViewMode>('month');

  // Week navigation: track the anchor date (any date in the displayed week)
  const [weekAnchor, setWeekAnchor] = React.useState(todayString());
  const weekDates = React.useMemo(() => getWeekDates(weekAnchor), [weekAnchor]);

  React.useEffect(() => {
    loadCalendar();
  }, [user]);

  const loadCalendar = async () => {
    if (!user) return;
    try {
      const { markedDates: dates, error } = await getCalendarClasses(user.id);
      if (error) {
        console.error('Calendar load error:', error);
      } else {
        setMarkedDates(dates);
        // Auto-select today
        const today = todayString();
        if (dates[today]) {
          setSelectedClasses(dates[today].classes);
          setSelectedStats(dates[today].stats);
        }
      }
    } catch (error) {
      console.error('Calendar error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadCalendar();
  };

  const handleDaySelect = (dateStr: string) => {
    setSelectedDate(dateStr);
    const classes = getClassesForDate(dateStr, markedDates);
    setSelectedClasses(classes);
    setSelectedStats(markedDates[dateStr]?.stats || null);
  };

  const handleDayPress = (day: any) => {
    handleDaySelect(day.dateString);
  };

  const handleWeekDaySelect = (dateStr: string) => {
    handleDaySelect(dateStr);
    setWeekAnchor(dateStr);
  };

  const goPrevWeek = () => {
    const anchor = new Date(weekAnchor);
    anchor.setDate(anchor.getDate() - 7);
    setWeekAnchor(anchor.toISOString().split('T')[0]);
  };

  const goNextWeek = () => {
    const anchor = new Date(weekAnchor);
    anchor.setDate(anchor.getDate() + 7);
    setWeekAnchor(anchor.toISOString().split('T')[0]);
  };

  const buildMarkedDatesWithSelection = (): MarkedDates => {
    if (!selectedDate) return markedDates;
    return {
      ...markedDates,
      [selectedDate]: {
        ...markedDates[selectedDate],
        selected: true,
        selectedColor: colors.primary,
      },
    };
  };

  const weekRangeLabel = React.useMemo(() => {
    if (weekDates.length === 0) return '';
    const first = new Date(weekDates[0]);
    const last = new Date(weekDates[6]);
    const firstStr = first.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const lastStr = last.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${firstStr} – ${lastStr}`;
  }, [weekDates]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading calendar...</Text>
      </View>
    );
  }

  const totalDaysWithClasses = Object.keys(markedDates).length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Class Calendar</Text>
          <Text style={styles.headerSubtitle}>
            {totalDaysWithClasses} {totalDaysWithClasses === 1 ? 'day' : 'days'} with upcoming classes
          </Text>
        </View>

        {/* View Mode Toggle */}
        <View style={styles.viewToggle}>
          <Pressable
            onPress={() => setViewMode('month')}
            style={[
              styles.viewToggleBtn,
              viewMode === 'month' && styles.viewToggleBtnActive,
            ]}
          >
            <MaterialIcons
              name="calendar-month"
              size={18}
              color={viewMode === 'month' ? '#fff' : colors.primary}
            />
          </Pressable>
          <Pressable
            onPress={() => setViewMode('week')}
            style={[
              styles.viewToggleBtn,
              viewMode === 'week' && styles.viewToggleBtnActive,
            ]}
          >
            <MaterialIcons
              name="view-week"
              size={18}
              color={viewMode === 'week' ? '#fff' : colors.primary}
            />
          </Pressable>
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
          <Text style={styles.legendText}>Booked</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
          <Text style={styles.legendText}>Available</Text>
        </View>

      </View>

      <ScrollView
        style={{ flex: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* ---- MONTH VIEW ---- */}
        {viewMode === 'month' && (
          <View style={styles.calendarContainer}>
            <Calendar
              current={new Date().toISOString().split('T')[0]}
              markedDates={buildMarkedDatesWithSelection()}
              onDayPress={handleDayPress}
              dayComponent={({ date, state, marking, onPress }: any) => (
                <CustomDay
                  date={date}
                  state={state}
                  marking={marking}
                  onPress={onPress || handleDayPress}
                />
              )}
              theme={{
                backgroundColor: colors.surface,
                calendarBackground: colors.surface,
                textSectionTitleColor: colors.textLight,
                selectedDayBackgroundColor: colors.primary,
                selectedDayTextColor: '#fff',
                todayTextColor: colors.primary,
                dayTextColor: colors.text,
                textDisabledColor: colors.textLight + '40',
                arrowColor: colors.primary,
                monthTextColor: colors.text,
                textDayFontFamily: 'System',
                textMonthFontFamily: 'System',
                textDayHeaderFontFamily: 'System',
                textDayFontWeight: '400',
                textMonthFontWeight: '600',
                textDayHeaderFontWeight: '600',
                textDayFontSize: 16,
                textMonthFontSize: 18,
                textDayHeaderFontSize: 14,
              }}
              enableSwipeMonths={true}
            />
          </View>
        )}

        {/* ---- WEEK VIEW ---- */}
        {viewMode === 'week' && (
          <View style={styles.weekViewContainer}>
            <Text style={styles.weekRangeLabel}>{weekRangeLabel}</Text>
            <WeekStrip
              weekDates={weekDates}
              selectedDate={selectedDate}
              markedDates={markedDates}
              onSelectDate={handleWeekDaySelect}
              onPrevWeek={goPrevWeek}
              onNextWeek={goNextWeek}
            />
          </View>
        )}

        {/* ---- DATE STATS PANEL (shared by both views) ---- */}
        {selectedDate && (
          <View style={styles.statsPanel}>
            <View style={styles.statsPanelHeader}>
              <Text style={styles.selectedDateText}>
                {formatDateLong(selectedDate)}
              </Text>
            </View>

            {selectedStats && selectedStats.classCount > 0 ? (
              <View style={styles.statsRow}>
                <View style={[styles.statChip, styles.statChipClasses]}>
                  <Text style={[styles.statChipNumber, { color: colors.primary }]}>
                    {selectedStats.classCount}
                  </Text>
                  <Text style={[styles.statChipLabel, { color: colors.primary }]}>
                    {selectedStats.classCount === 1 ? 'Class' : 'Classes'}
                  </Text>
                </View>
                <View style={[styles.statChip, styles.statChipTotal]}>
                  <Text style={[styles.statChipNumber, { color: colors.textLight }]}>
                    {selectedStats.totalSpots}
                  </Text>
                  <Text style={[styles.statChipLabel, { color: colors.textLight }]}>Total Spots</Text>
                </View>
                <View style={[styles.statChip, styles.statChipBooked]}>
                  <Text style={[styles.statChipNumber, { color: colors.success }]}>
                    {selectedStats.bookedSpots}
                  </Text>
                  <Text style={[styles.statChipLabel, { color: colors.success }]}>Booked</Text>
                </View>
                <View style={[styles.statChip, styles.statChipAvailable]}>
                  <Text style={[styles.statChipNumber, { color: colors.accent }]}>
                    {selectedStats.availableSpots}
                  </Text>
                  <Text style={[styles.statChipLabel, { color: colors.accent }]}>Open</Text>
                </View>
              </View>
            ) : (
              <View style={[styles.statsRow, { paddingBottom: spacing.md }]}>
                <Text style={[styles.statChipLabel, { color: colors.textLight }]}>
                  No classes on this day
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ---- CLASS CARDS ---- */}
        <View style={styles.scrollContent}>
          {selectedClasses.length > 0 ? (
            selectedClasses.map((classItem) => {
              const spotsUsed = classItem.current_participants;
              const spotsTotal = classItem.max_participants;
              const fillPercent = spotsTotal > 0 ? (spotsUsed / spotsTotal) * 100 : 0;
              const isFull = spotsUsed >= spotsTotal;
              const spotsLeft = Math.max(0, spotsTotal - spotsUsed);

              return (
                <View
                  key={classItem.id}
                  style={[
                    styles.classCard,
                    classItem.is_booked && styles.bookedClassCard,
                  ]}
                >
                  <View style={styles.classCardHeader}>
                    {classItem.photo_urls && classItem.photo_urls.length > 0 ? (
                      <Image
                        source={{ uri: classItem.photo_urls[0] }}
                        style={styles.classImage}
                        contentFit="cover"
                        transition={200}
                      />
                    ) : null}
                    <View style={styles.classInfo}>
                      <Text style={styles.classTitle} numberOfLines={2}>
                        {classItem.title}
                      </Text>
                      <Text style={styles.classType}>{classItem.class_type}</Text>
                      <Text style={styles.classTime}>
                        {formatTimeRange(classItem.start_time, classItem.end_time)}
                      </Text>
                    </View>
                  </View>

                  {classItem.location ? (
                    <View style={styles.detailRow}>
                      <MaterialIcons name="location-on" size={18} color={colors.primary} />
                      <Text style={styles.detailText}>{classItem.location}</Text>
                    </View>
                  ) : null}

                  {/* Spots bar */}
                  <View style={styles.spotsBar}>
                    <View style={styles.spotsBarLabel}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <MaterialIcons name="people" size={14} color={colors.textLight} />
                        <Text style={styles.spotsBarLabelText}>
                          {spotsUsed}/{spotsTotal} filled
                        </Text>
                      </View>
                      <Text style={[
                        styles.spotsBarLabelText,
                        { color: isFull ? colors.error : spotsLeft <= 3 ? colors.warning : colors.success, fontWeight: '600' }
                      ]}>
                        {isFull ? 'Full' : `${spotsLeft} left`}
                      </Text>
                    </View>
                    <View style={styles.spotsBarTrack}>
                      <View style={[
                        styles.spotsBarFill,
                        {
                          width: `${Math.min(fillPercent, 100)}%`,
                          backgroundColor: isFull ? colors.error : fillPercent >= 75 ? colors.warning : colors.success,
                        }
                      ]} />
                    </View>
                  </View>

                  <Text style={styles.classPrice}>¥{classItem.fee_per_person.toLocaleString()}/person</Text>

                  {classItem.is_booked ? (
                    <View style={styles.bookedBadge}>
                      <MaterialIcons name="check-circle" size={18} color="#fff" />
                      <Text style={styles.bookedBadgeText}>Already Booked</Text>
                    </View>
                  ) : (
                    <Pressable
                      style={({ pressed }) => [
                        styles.bookButton,
                        isFull && styles.bookButtonFull,
                        pressed && { opacity: 0.8 },
                      ]}
                      onPress={() => !isFull && router.push({ pathname: '/class-details', params: { classId: classItem.id } })}
                      disabled={isFull}
                    >
                      <Text style={styles.bookButtonText}>
                        {isFull ? 'Class Full' : 'Book This Class'}
                      </Text>
                    </Pressable>
                  )}
                </View>
              );
            })
          ) : selectedDate ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="event-busy" size={64} color={colors.textLight} />
              <Text style={styles.emptyStateText}>
                No classes scheduled for this date.{'\n'}
                Select another date to see available classes.
              </Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <MaterialIcons name="event" size={64} color={colors.textLight} />
              <Text style={styles.emptyStateText}>
                Select a date from the calendar above{'\n'}
                to see scheduled classes.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: { ...typography.h2, color: colors.text, marginBottom: 2 },
  headerSubtitle: { ...typography.caption, color: colors.textLight },
  // View mode toggle
  viewToggle: {
    flexDirection: 'row',
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    overflow: 'hidden',
  },
  viewToggleBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: 44,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewToggleBtnActive: {
    backgroundColor: colors.primary,
  },
  // Legend
  legendContainer: {
    flexDirection: 'row',
    gap: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendText: { ...typography.caption, color: colors.text, fontSize: 13 },
  // Monthly calendar
  calendarContainer: {
    backgroundColor: colors.surface,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  // Custom day (monthly)
  dayContainer: { alignItems: 'center', justifyContent: 'center', width: 36, height: 40 },
  dayCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 14, fontWeight: '400', color: colors.text },
  dayTextSelected: { color: '#fff', fontWeight: '600' },
  dayTextToday: { color: colors.primary, fontWeight: '700' },
  dayTextDisabled: { color: colors.textLight + '60' },
  countBadge: {
    position: 'absolute',
    top: -2,
    right: -4,
    backgroundColor: colors.primary,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  countBadgeBooked: { backgroundColor: colors.success },
  countBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700', lineHeight: 14 },
  // Week view
  weekViewContainer: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.md,
  },
  weekRangeLabel: {
    ...typography.caption,
    color: colors.textLight,
    textAlign: 'center',
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    fontWeight: '600',
    fontSize: 13,
  },
  weekStripContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    gap: 0,
  },
  weekNavBtn: {
    width: 32,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: 4,
  },
  weekDayLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textLight,
  },
  weekDayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDayNumber: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  weekCountBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: colors.primary,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  weekCountBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 14,
  },
  weekDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  // Stats panel
  statsPanel: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statsPanelHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  selectedDateText: { ...typography.h3, color: colors.text, fontWeight: '600' },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  statChip: {
    flex: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  statChipClasses: { backgroundColor: colors.primary + '12', borderColor: colors.primary + '30' },
  statChipTotal: { backgroundColor: colors.textLight + '10', borderColor: colors.textLight + '20' },
  statChipBooked: { backgroundColor: colors.success + '15', borderColor: colors.success + '30' },
  statChipAvailable: { backgroundColor: colors.accent + '12', borderColor: colors.accent + '30' },
  statChipNumber: { fontSize: 20, fontWeight: '700', marginBottom: 2 },
  statChipLabel: { fontSize: 11, fontWeight: '500', textAlign: 'center' },
  // Class cards
  scrollContent: { padding: spacing.lg, paddingBottom: 100 },
  classCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  bookedClassCard: {
    borderColor: colors.success,
    borderWidth: 2,
    backgroundColor: colors.success + '08',
  },
  classCardHeader: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  classImage: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
    backgroundColor: colors.border,
  },
  classInfo: { flex: 1, justifyContent: 'center' },
  classTitle: { ...typography.h3, color: colors.text, marginBottom: spacing.xs },
  classType: { ...typography.body, color: colors.textLight, marginBottom: spacing.xs },
  classTime: { ...typography.body, color: colors.primary, fontWeight: '600' },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  detailText: { ...typography.body, color: colors.text, flex: 1 },
  spotsBar: { marginTop: spacing.sm, gap: spacing.xs },
  spotsBarLabel: { flexDirection: 'row', justifyContent: 'space-between' },
  spotsBarLabelText: { fontSize: 12, color: colors.textLight },
  spotsBarTrack: { height: 6, backgroundColor: colors.background, borderRadius: 3, overflow: 'hidden' },
  spotsBarFill: { height: '100%', borderRadius: 3 },
  classPrice: { ...typography.h3, color: colors.primary, fontWeight: '700', marginTop: spacing.sm },
  bookedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.success,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
  },
  bookedBadgeText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  bookButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.md,
    minHeight: 48,
  },
  bookButtonFull: { backgroundColor: colors.textLight },
  bookButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl },
  emptyStateText: { ...typography.body, color: colors.textLight, marginTop: spacing.md, textAlign: 'center' },
  loadingText: { ...typography.body, color: colors.textLight, marginTop: spacing.md },
});
