import { getSupabaseClient } from '@/template';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Class } from './classService';

const SEARCH_HISTORY_KEY = '@dance_lorenzo_search_history';
const MAX_HISTORY_ITEMS = 10;

export interface SearchFilters {
  keyword?: string;
  dateFrom?: string;
  dateTo?: string;
  location?: string;
  classType?: 'tokyo' | 'yokohama' | 'online' | 'private' | 'all';
  classCategory?: 'become_my_dancers' | 'workshop' | 'all';
  minSpots?: number;
}

export interface SearchSuggestion {
  type: 'class' | 'location' | 'instructor_note';
  value: string;
  subtitle?: string;
}

export interface SearchHistoryItem {
  query: string;
  timestamp: number;
  filters?: SearchFilters;
}

export const searchService = {
  /**
   * Search classes with advanced filters
   */
  async searchClasses(filters: SearchFilters): Promise<{ data: Class[] | null; error: string | null }> {
    const supabase = getSupabaseClient();
    
    try {
      let query = supabase
        .from('classes')
        .select('*')
        .eq('is_active', true)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true });

      // Keyword search - search in title, description, location
      if (filters.keyword && filters.keyword.trim()) {
        const keyword = `%${filters.keyword.trim()}%`;
        query = query.or(`title.ilike.${keyword},description.ilike.${keyword},location.ilike.${keyword}`);
      }

      // Date range filter
      if (filters.dateFrom) {
        query = query.gte('start_time', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('start_time', filters.dateTo);
      }

      // Location filter
      if (filters.location && filters.location !== 'all') {
        query = query.ilike('location', `%${filters.location}%`);
      }

      // Class type filter
      if (filters.classType && filters.classType !== 'all') {
        query = query.eq('class_type', filters.classType);
      }

      // Class category filter
      if (filters.classCategory && filters.classCategory !== 'all') {
        query = query.eq('class_category', filters.classCategory);
      }

      const { data, error } = await query;

      if (error) {
        return { data: null, error: error.message };
      }

      // Client-side filter for minimum available spots
      let filteredData = data;
      if (filters.minSpots && filters.minSpots > 0) {
        filteredData = data.filter(
          classItem => (classItem.max_participants - classItem.current_participants) >= filters.minSpots
        );
      }

      return { data: filteredData, error: null };
    } catch (err) {
      console.error('Search error:', err);
      return { data: null, error: String(err) };
    }
  },

  /**
   * Get autocomplete suggestions based on partial query
   */
  async getSuggestions(query: string): Promise<{ data: SearchSuggestion[] | null; error: string | null }> {
    if (!query || query.trim().length < 2) {
      return { data: [], error: null };
    }

    const supabase = getSupabaseClient();
    const keyword = `%${query.trim()}%`;
    
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('title, location, description')
        .eq('is_active', true)
        .gte('start_time', new Date().toISOString())
        .or(`title.ilike.${keyword},location.ilike.${keyword},description.ilike.${keyword}`)
        .limit(20);

      if (error) {
        return { data: null, error: error.message };
      }

      const suggestions: SearchSuggestion[] = [];
      const seenValues = new Set<string>();

      // Extract unique class titles
      data.forEach((item) => {
        if (item.title && item.title.toLowerCase().includes(query.toLowerCase())) {
          const value = item.title.trim();
          if (!seenValues.has(value)) {
            suggestions.push({
              type: 'class',
              value: value,
              subtitle: item.location || undefined,
            });
            seenValues.add(value);
          }
        }
      });

      // Extract unique locations
      data.forEach((item) => {
        if (item.location && item.location.toLowerCase().includes(query.toLowerCase())) {
          const value = item.location.trim();
          if (!seenValues.has(value)) {
            suggestions.push({
              type: 'location',
              value: value,
              subtitle: 'Location',
            });
            seenValues.add(value);
          }
        }
      });

      // Extract unique description snippets (instructor notes)
      data.forEach((item) => {
        if (item.description && item.description.toLowerCase().includes(query.toLowerCase())) {
          // Extract a snippet around the matched keyword
          const descLower = item.description.toLowerCase();
          const queryLower = query.toLowerCase();
          const matchIndex = descLower.indexOf(queryLower);
          
          if (matchIndex !== -1) {
            const start = Math.max(0, matchIndex - 20);
            const end = Math.min(item.description.length, matchIndex + query.length + 40);
            const snippet = (start > 0 ? '...' : '') + 
                          item.description.substring(start, end).trim() + 
                          (end < item.description.length ? '...' : '');
            
            if (!seenValues.has(snippet)) {
              suggestions.push({
                type: 'instructor_note',
                value: snippet,
                subtitle: item.title,
              });
              seenValues.add(snippet);
            }
          }
        }
      });

      // Limit to top 8 suggestions
      return { data: suggestions.slice(0, 8), error: null };
    } catch (err) {
      console.error('Suggestions error:', err);
      return { data: null, error: String(err) };
    }
  },

  /**
   * Save search query to history
   */
  async saveSearchHistory(query: string, filters?: SearchFilters): Promise<void> {
    if (!query || query.trim().length === 0) return;

    try {
      const history = await this.getSearchHistory();
      
      const newItem: SearchHistoryItem = {
        query: query.trim(),
        timestamp: Date.now(),
        filters,
      };

      // Remove duplicate if exists
      const filtered = history.filter(item => item.query !== newItem.query);
      
      // Add new item at the beginning
      const updated = [newItem, ...filtered];
      
      // Keep only MAX_HISTORY_ITEMS
      const limited = updated.slice(0, MAX_HISTORY_ITEMS);
      
      await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(limited));
    } catch (err) {
      console.error('Error saving search history:', err);
    }
  },

  /**
   * Get search history
   */
  async getSearchHistory(): Promise<SearchHistoryItem[]> {
    try {
      const stored = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
      if (!stored) return [];
      
      const history: SearchHistoryItem[] = JSON.parse(stored);
      return history;
    } catch (err) {
      console.error('Error getting search history:', err);
      return [];
    }
  },

  /**
   * Clear search history
   */
  async clearSearchHistory(): Promise<void> {
    try {
      await AsyncStorage.removeItem(SEARCH_HISTORY_KEY);
    } catch (err) {
      console.error('Error clearing search history:', err);
    }
  },

  /**
   * Remove single item from history
   */
  async removeSearchHistoryItem(query: string): Promise<void> {
    try {
      const history = await this.getSearchHistory();
      const filtered = history.filter(item => item.query !== query);
      await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(filtered));
    } catch (err) {
      console.error('Error removing search history item:', err);
    }
  },

  /**
   * Get unique locations from active classes
   */
  async getAvailableLocations(): Promise<string[]> {
    const supabase = getSupabaseClient();
    
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('location')
        .eq('is_active', true)
        .gte('start_time', new Date().toISOString())
        .not('location', 'is', null);

      if (error || !data) return [];

      const locations = new Set<string>();
      data.forEach(item => {
        if (item.location) locations.add(item.location);
      });

      return Array.from(locations).sort();
    } catch (err) {
      console.error('Error fetching locations:', err);
      return [];
    }
  },
};
