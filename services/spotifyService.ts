/**
 * Spotify Web API Integration
 * Fetches track metadata and 30-second preview URLs without authentication
 * Uses public Spotify oEmbed and Web API endpoints
 */

interface SpotifyTrackInfo {
  id: string;
  name: string;
  artists: string[];
  album: string;
  releaseDate: string;
  previewUrl: string | null;
  coverImageUrl: string | null;
  trackCount?: number;
}

export const spotifyService = {
  /**
   * Extract Spotify track ID from various URL formats
   * Supports:
   * - https://open.spotify.com/track/TRACK_ID
   * - spotify:track:TRACK_ID
   * - TRACK_ID (direct ID)
   */
  extractTrackId(input: string): string | null {
    if (!input) return null;

    // Direct ID (22 characters)
    if (/^[a-zA-Z0-9]{22}$/.test(input.trim())) {
      return input.trim();
    }

    // Spotify URI: spotify:track:ID
    const uriMatch = input.match(/spotify:track:([a-zA-Z0-9]{22})/);
    if (uriMatch) return uriMatch[1];

    // Web URL: https://open.spotify.com/track/ID
    const urlMatch = input.match(/spotify\.com\/track\/([a-zA-Z0-9]{22})/);
    if (urlMatch) return urlMatch[1];

    return null;
  },

  /**
   * Extract Spotify album ID from various URL formats
   */
  extractAlbumId(input: string): string | null {
    if (!input) return null;

    // Direct ID
    if (/^[a-zA-Z0-9]{22}$/.test(input.trim())) {
      return input.trim();
    }

    // Spotify URI: spotify:album:ID
    const uriMatch = input.match(/spotify:album:([a-zA-Z0-9]{22})/);
    if (uriMatch) return uriMatch[1];

    // Web URL: https://open.spotify.com/album/ID
    const urlMatch = input.match(/spotify\.com\/album\/([a-zA-Z0-9]{22})/);
    if (urlMatch) return urlMatch[1];

    return null;
  },

  /**
   * Fetch track information from Spotify (no auth required for public data)
   * Uses the Spotify oEmbed endpoint as a fallback
   */
  async getTrackInfo(trackIdOrUrl: string): Promise<{ data: SpotifyTrackInfo | null; error: string | null }> {
    try {
      const trackId = this.extractTrackId(trackIdOrUrl);
      if (!trackId) {
        return { data: null, error: 'Invalid Spotify track URL or ID' };
      }

      // Use Spotify Web API endpoint (public access)
      const response = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        // If direct API fails (rate limit), try oEmbed as fallback
        const oEmbedResponse = await fetch(
          `https://open.spotify.com/oembed?url=https://open.spotify.com/track/${trackId}`
        );
        
        if (!oEmbedResponse.ok) {
          return { data: null, error: 'Failed to fetch track from Spotify. Please check the URL and try again.' };
        }

        const oEmbedData = await oEmbedResponse.json();
        
        // oEmbed doesn't provide preview URL, so return partial data
        return {
          data: {
            id: trackId,
            name: oEmbedData.title || 'Unknown Track',
            artists: ['Artist info unavailable'],
            album: 'Album info unavailable',
            releaseDate: new Date().toISOString(),
            previewUrl: null,
            coverImageUrl: oEmbedData.thumbnail_url || null,
          },
          error: null,
        };
      }

      const trackData = await response.json();

      return {
        data: {
          id: trackData.id,
          name: trackData.name,
          artists: trackData.artists.map((artist: any) => artist.name),
          album: trackData.album.name,
          releaseDate: trackData.album.release_date,
          previewUrl: trackData.preview_url,
          coverImageUrl: trackData.album.images[0]?.url || null,
        },
        error: null,
      };
    } catch (err) {
      console.error('Spotify API error:', err);
      return { data: null, error: 'Network error while fetching Spotify track. Please try again.' };
    }
  },

  /**
   * Fetch album information from Spotify
   */
  async getAlbumInfo(albumIdOrUrl: string): Promise<{ data: any; error: string | null }> {
    try {
      const albumId = this.extractAlbumId(albumIdOrUrl);
      if (!albumId) {
        return { data: null, error: 'Invalid Spotify album URL or ID' };
      }

      const response = await fetch(`https://api.spotify.com/v1/albums/${albumId}`, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        return { data: null, error: 'Failed to fetch album from Spotify. Please check the URL and try again.' };
      }

      const albumData = await response.json();

      return {
        data: {
          id: albumData.id,
          name: albumData.name,
          artists: albumData.artists.map((artist: any) => artist.name),
          releaseDate: albumData.release_date,
          totalTracks: albumData.total_tracks,
          coverImageUrl: albumData.images[0]?.url || null,
          tracks: albumData.tracks.items.map((track: any) => ({
            id: track.id,
            name: track.name,
            previewUrl: track.preview_url,
          })),
          // Use first track's preview as album preview
          previewUrl: albumData.tracks.items[0]?.preview_url || null,
        },
        error: null,
      };
    } catch (err) {
      console.error('Spotify API error:', err);
      return { data: null, error: 'Network error while fetching Spotify album. Please try again.' };
    }
  },

  /**
   * Generate Spotify embed URL for player
   */
  getEmbedUrl(trackId: string, compact: boolean = false): string {
    return `https://open.spotify.com/embed/track/${trackId}?utm_source=generator${compact ? '&theme=0' : ''}`;
  },
};
