import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Pressable, 
  TextInput,
  ActivityIndicator,
  Dimensions 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { colors, spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { searchService, SearchFilters, SearchSuggestion, SearchHistoryItem } from '@/services/searchService';
import { Class } from '@/services/classService';
import { useLanguage } from '@/hooks/useLanguage';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - spacing.lg * 3) / 2;

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { language } = useLanguage();
  const searchInputRef = useRef<TextInput>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Class[]>([]);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'become_my_dancers' | 'workshop'>('all');
  const [selectedType, setSelectedType] = useState<'all' | 'tokyo' | 'yokohama' | 'online' | 'private'>('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);

  useEffect(() => {
    loadSearchHistory();
    loadAvailableLocations();
    // Auto-focus search input
    setTimeout(() => searchInputRef.current?.focus(), 100);
  }, []);

  useEffect(() => {
    // Debounced suggestions
    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        loadSuggestions(searchQuery);
      } else {
        setSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadSearchHistory = async () => {
    const history = await searchService.getSearchHistory();
    setSearchHistory(history);
  };

  const loadAvailableLocations = async () => {
    const locations = await searchService.getAvailableLocations();
    setAvailableLocations(locations);
  };

  const loadSuggestions = async (query: string) => {
    const { data } = await searchService.getSuggestions(query);
    if (data) setSuggestions(data);
  };

  const handleSearch = async (query?: string) => {
    const finalQuery = query || searchQuery;
    if (!finalQuery.trim() && selectedCategory === 'all' && selectedType === 'all' && selectedLocation === 'all') {
      return;
    }

    setLoading(true);
    setShowSuggestions(false);
    setHasSearched(true);

    const filters: SearchFilters = {
      keyword: finalQuery.trim() || undefined,
      classCategory: selectedCategory !== 'all' ? selectedCategory : undefined,
      classType: selectedType !== 'all' ? selectedType : undefined,
      location: selectedLocation !== 'all' ? selectedLocation : undefined,
    };

    const { data, error } = await searchService.searchClasses(filters);
    
    setLoading(false);

    if (error) {
      console.error('Search error:', error);
      setSearchResults([]);
      return;
    }

    setSearchResults(data || []);
    
    // Save to history
    if (finalQuery.trim()) {
      await searchService.saveSearchHistory(finalQuery, filters);
      loadSearchHistory();
    }
  };

  const handleSuggestionPress = (suggestion: SearchSuggestion) => {
    setSearchQuery(suggestion.value);
    setShowSuggestions(false);
    handleSearch(suggestion.value);
  };

  const handleHistoryPress = (item: SearchHistoryItem) => {
    setSearchQuery(item.query);
    if (item.filters) {
      if (item.filters.classCategory) setSelectedCategory(item.filters.classCategory);
      if (item.filters.classType) setSelectedType(item.filters.classType);
      if (item.filters.location) setSelectedLocation(item.filters.location);
    }
    handleSearch(item.query);
  };

  const handleClearHistory = async () => {
    await searchService.clearSearchHistory();
    loadSearchHistory();
  };

  const handleRemoveHistoryItem = async (query: string) => {
    await searchService.removeSearchHistoryItem(query);
    loadSearchHistory();
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedType('all');
    setSelectedLocation('all');
    setSearchResults([]);
    setHasSearched(false);
    setSuggestions([]);
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(language, { weekday: 'short', month: 'short', day: 'numeric' }),
      time: date.toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' }),
    };
  };

  const getCategoryBadge = (category: string) => {
    if (category === 'become_my_dancers') {
      return { label: 'BMD', color: colors.primary, icon: 'toll' };
    } else {
      return { label: 'Workshop', color: colors.accent, icon: 'payments' };
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'tokyo': return 'location-city';
      case 'yokohama': return 'place';
      case 'online': return 'videocam';
      case 'private': return 'person';
      default: return 'event';
    }
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'class': return 'event';
      case 'location': return 'place';
      case 'instructor_note': return 'notes';
      default: return 'search';
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Search Classes</Text>
        {(searchQuery || selectedCategory !== 'all' || selectedType !== 'all' || selectedLocation !== 'all') && (
          <Pressable onPress={resetFilters} style={styles.resetButton}>
            <MaterialIcons name="refresh" size={20} color={colors.primary} />
          </Pressable>
        )}
        {!searchQuery && selectedCategory === 'all' && selectedType === 'all' && selectedLocation === 'all' && (
          <View style={{ width: 40 }} />
        )}
      </View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={22} color={colors.textLight} />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Search by keyword, location, date..."
            placeholderTextColor={colors.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setShowSuggestions(true)}
            onSubmitEditing={() => handleSearch()}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <MaterialIcons name="close" size={20} color={colors.textLight} />
            </Pressable>
          )}
        </View>

        {/* Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            {suggestions.map((suggestion, index) => (
              <Pressable
                key={index}
                style={styles.suggestionItem}
                onPress={() => handleSuggestionPress(suggestion)}
              >
                <MaterialIcons 
                  name={getSuggestionIcon(suggestion.type)} 
                  size={20} 
                  color={colors.textLight} 
                />
                <View style={styles.suggestionTextContainer}>
                  <Text style={styles.suggestionValue}>{suggestion.value}</Text>
                  {suggestion.subtitle && (
                    <Text style={styles.suggestionSubtitle}>{suggestion.subtitle}</Text>
                  )}
                </View>
                <MaterialIcons name="north-west" size={16} color={colors.textLight} />
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {/* Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersScroll}
        style={styles.filtersContainer}
      >
        {/* Category Filter */}
        <View style={styles.filterGroup}>
          <Pressable
            style={[styles.filterChip, selectedCategory === 'all' && styles.filterChipActive]}
            onPress={() => setSelectedCategory('all')}
          >
            <Text style={[styles.filterChipText, selectedCategory === 'all' && styles.filterChipTextActive]}>
              All
            </Text>
          </Pressable>
          <Pressable
            style={[styles.filterChip, selectedCategory === 'become_my_dancers' && styles.filterChipActive]}
            onPress={() => setSelectedCategory('become_my_dancers')}
          >
            <MaterialIcons name="toll" size={14} color={selectedCategory === 'become_my_dancers' ? colors.surface : colors.primary} />
            <Text style={[styles.filterChipText, selectedCategory === 'become_my_dancers' && styles.filterChipTextActive]}>
              BMD
            </Text>
          </Pressable>
          <Pressable
            style={[styles.filterChip, selectedCategory === 'workshop' && styles.filterChipActive]}
            onPress={() => setSelectedCategory('workshop')}
          >
            <MaterialIcons name="payments" size={14} color={selectedCategory === 'workshop' ? colors.surface : colors.accent} />
            <Text style={[styles.filterChipText, selectedCategory === 'workshop' && styles.filterChipTextActive]}>
              Workshop
            </Text>
          </Pressable>
        </View>

        {/* Type Filter */}
        <View style={styles.filterDivider} />
        <View style={styles.filterGroup}>
          <Pressable
            style={[styles.filterChip, selectedType === 'all' && styles.filterChipActive]}
            onPress={() => setSelectedType('all')}
          >
            <Text style={[styles.filterChipText, selectedType === 'all' && styles.filterChipTextActive]}>
              All Types
            </Text>
          </Pressable>
          <Pressable
            style={[styles.filterChip, selectedType === 'online' && styles.filterChipActive]}
            onPress={() => setSelectedType('online')}
          >
            <MaterialIcons name="videocam" size={14} color={selectedType === 'online' ? colors.surface : colors.textLight} />
            <Text style={[styles.filterChipText, selectedType === 'online' && styles.filterChipTextActive]}>
              Online
            </Text>
          </Pressable>
          <Pressable
            style={[styles.filterChip, selectedType === 'tokyo' && styles.filterChipActive]}
            onPress={() => setSelectedType('tokyo')}
          >
            <MaterialIcons name="location-city" size={14} color={selectedType === 'tokyo' ? colors.surface : colors.textLight} />
            <Text style={[styles.filterChipText, selectedType === 'tokyo' && styles.filterChipTextActive]}>
              Tokyo
            </Text>
          </Pressable>
          <Pressable
            style={[styles.filterChip, selectedType === 'yokohama' && styles.filterChipActive]}
            onPress={() => setSelectedType('yokohama')}
          >
            <MaterialIcons name="place" size={14} color={selectedType === 'yokohama' ? colors.surface : colors.textLight} />
            <Text style={[styles.filterChipText, selectedType === 'yokohama' && styles.filterChipTextActive]}>
              Yokohama
            </Text>
          </Pressable>
        </View>

        {/* Location Filter */}
        {availableLocations.length > 0 && (
          <>
            <View style={styles.filterDivider} />
            <View style={styles.filterGroup}>
              <Pressable
                style={[styles.filterChip, selectedLocation === 'all' && styles.filterChipActive]}
                onPress={() => setSelectedLocation('all')}
              >
                <Text style={[styles.filterChipText, selectedLocation === 'all' && styles.filterChipTextActive]}>
                  All Locations
                </Text>
              </Pressable>
              {availableLocations.slice(0, 5).map((location) => (
                <Pressable
                  key={location}
                  style={[styles.filterChip, selectedLocation === location && styles.filterChipActive]}
                  onPress={() => setSelectedLocation(location)}
                >
                  <Text style={[styles.filterChipText, selectedLocation === location && styles.filterChipTextActive]}>
                    {location}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {/* Search Button */}
      <View style={styles.searchButtonContainer}>
        <Pressable
          style={[styles.searchButton, loading && styles.searchButtonDisabled]}
          onPress={() => handleSearch()}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.surface} />
          ) : (
            <>
              <MaterialIcons name="search" size={20} color={colors.surface} />
              <Text style={styles.searchButtonText}>Search Classes</Text>
            </>
          )}
        </Pressable>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {!hasSearched && searchHistory.length > 0 && (
          <View style={styles.historySection}>
            <View style={styles.historySectionHeader}>
              <Text style={styles.sectionTitle}>Recent Searches</Text>
              <Pressable onPress={handleClearHistory}>
                <Text style={styles.clearHistoryText}>Clear all</Text>
              </Pressable>
            </View>
            {searchHistory.map((item, index) => (
              <Pressable
                key={index}
                style={styles.historyItem}
                onPress={() => handleHistoryPress(item)}
              >
                <MaterialIcons name="history" size={20} color={colors.textLight} />
                <Text style={styles.historyItemText}>{item.query}</Text>
                <Pressable
                  onPress={() => handleRemoveHistoryItem(item.query)}
                  style={styles.historyRemoveButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MaterialIcons name="close" size={16} color={colors.textLight} />
                </Pressable>
              </Pressable>
            ))}
          </View>
        )}

        {hasSearched && (
          <>
            {searchResults.length > 0 ? (
              <View style={styles.resultsSection}>
                <Text style={styles.resultsCount}>
                  {searchResults.length} {searchResults.length === 1 ? 'class' : 'classes'} found
                </Text>
                <View style={styles.resultsGrid}>
                  {searchResults.map((classItem) => {
                    const { date, time } = formatDateTime(classItem.start_time);
                    const badge = getCategoryBadge(classItem.class_category);
                    const imageSource = classItem.photo_urls && classItem.photo_urls.length > 0
                      ? { uri: classItem.photo_urls[0] }
                      : require('@/assets/images/tahitian-dance-performance.jpg');

                    return (
                      <Pressable
                        key={classItem.id}
                        style={styles.resultCard}
                        onPress={() => router.push(`/class-details?id=${classItem.id}`)}
                      >
                        <View style={styles.resultImageContainer}>
                          <Image
                            source={imageSource}
                            style={styles.resultImage}
                            contentFit="cover"
                            transition={200}
                          />
                          <View style={[styles.resultBadge, { backgroundColor: badge.color }]}>
                            <MaterialIcons name={badge.icon} size={12} color={colors.surface} />
                          </View>
                        </View>
                        <View style={styles.resultContent}>
                          <Text style={styles.resultTitle} numberOfLines={2}>{classItem.title}</Text>
                          <View style={styles.resultMeta}>
                            <View style={styles.resultMetaRow}>
                              <MaterialIcons name="event" size={12} color={colors.textLight} />
                              <Text style={styles.resultMetaText}>{date}</Text>
                            </View>
                            <View style={styles.resultMetaRow}>
                              <MaterialIcons name="schedule" size={12} color={colors.textLight} />
                              <Text style={styles.resultMetaText}>{time}</Text>
                            </View>
                          </View>
                          {classItem.location && (
                            <View style={styles.resultLocation}>
                              <MaterialIcons name="place" size={12} color={colors.textLight} />
                              <Text style={styles.resultLocationText} numberOfLines={1}>
                                {classItem.location}
                              </Text>
                            </View>
                          )}
                          <View style={styles.resultFooter}>
                            <Text style={[styles.resultSpots, { 
                              color: classItem.current_participants >= classItem.max_participants 
                                ? colors.error 
                                : colors.success 
                            }]}>
                              {classItem.current_participants}/{classItem.max_participants} spots
                            </Text>
                            <MaterialIcons name="arrow-forward" size={16} color={colors.primary} />
                          </View>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <MaterialIcons name="search-off" size={64} color={colors.textLight} />
                <Text style={styles.emptyTitle}>No classes found</Text>
                <Text style={styles.emptyText}>
                  Try adjusting your search filters or keywords
                </Text>
              </View>
            )}
          </>
        )}

        {!hasSearched && searchHistory.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialIcons name="search" size={64} color={colors.textLight} />
            <Text style={styles.emptyTitle}>Search for classes</Text>
            <Text style={styles.emptyText}>
              Find classes by keyword, location, date, or instructor notes
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
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
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary + '20',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text,
  },
  resetButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    position: 'relative',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    ...shadows.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    paddingVertical: spacing.xs,
  },
  clearButton: {
    padding: spacing.xs,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: spacing.md + 48,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    ...shadows.xl,
    zIndex: 10,
    maxHeight: 300,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  suggestionTextContainer: {
    flex: 1,
  },
  suggestionValue: {
    ...typography.body,
    color: colors.text,
    marginBottom: 2,
  },
  suggestionSubtitle: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textLight,
  },
  filtersContainer: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary + '20',
  },
  filtersScroll: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  filterGroup: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  filterDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.primary + '20',
    marginHorizontal: spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.textLight + '30',
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    ...typography.caption,
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: colors.surface,
    fontWeight: '600',
  },
  searchButtonContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary + '20',
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    ...shadows.md,
  },
  searchButtonDisabled: {
    opacity: 0.6,
  },
  searchButtonText: {
    ...typography.button,
    color: colors.surface,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  historySection: {
    marginBottom: spacing.lg,
  },
  historySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
  },
  clearHistoryText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
    ...shadows.sm,
  },
  historyItemText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  historyRemoveButton: {
    padding: spacing.xs,
  },
  resultsSection: {
    marginTop: spacing.md,
  },
  resultsCount: {
    ...typography.body,
    color: colors.textLight,
    marginBottom: spacing.md,
    fontWeight: '600',
  },
  resultsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  resultCard: {
    width: CARD_WIDTH,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.lg,
  },
  resultImageContainer: {
    width: '100%',
    height: CARD_WIDTH * 1.2,
    position: 'relative',
  },
  resultImage: {
    width: '100%',
    height: '100%',
  },
  resultBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  resultContent: {
    padding: spacing.sm,
  },
  resultTitle: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
    lineHeight: 18,
  },
  resultMeta: {
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  resultMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resultMetaText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textLight,
  },
  resultLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.xs,
  },
  resultLocationText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textLight,
    flex: 1,
  },
  resultFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  resultSpots: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyText: {
    ...typography.body,
    color: colors.textLight,
    textAlign: 'center',
    maxWidth: 280,
  },
});
