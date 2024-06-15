import { useState, useEffect, useCallback } from 'react';
import getAccessToken from '../components/getAccessToken';
import {
  setAccessToken,
  getUserProfile,
  getUserTopTracks,
  getUserTopGenres,
  getPersonalizedRecommendations,
  createPlaylist,
  uploadPlaylistImage,
  fetchLatestReleases
} from '../services/spotify';

const useSpotifyData = () => {
  const [user, setUser] = useState(null);
  const [topTracks, setTopTracks] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAccessToken = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem('spotifyRefreshToken');
      const response = await getAccessToken(refreshToken);
      const newAccessToken = response.access_token;
      localStorage.setItem('spotifyAccessToken', newAccessToken);
      setAccessToken(newAccessToken);
      console.log('Access token refreshed successfully');
      return newAccessToken;
    } catch (error) {
      console.error('Failed to refresh access token:', error);
      setError('Failed to refresh access token');
      return null;
    }
  }, []);

  const apiRequest = useCallback(async (fn) => {
    try {
      return await fn();
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('Token expired, attempting to refresh...');
        const newAccessToken = await refreshAccessToken();
        if (newAccessToken) {
          return await fn();
        }
      }
      console.error('API request failed:', error);
      throw error;
    }
  }, [refreshAccessToken]);

  useEffect(() => {
    const fetchAccessTokenAndData = async () => {
      try {
        let token = localStorage.getItem('spotifyAccessToken');
        if (!token) {
          const response = await getAccessToken();
          token = response.access_token;
          localStorage.setItem('spotifyAccessToken', token);
          setAccessToken(token);
        } else {
          setAccessToken(token);
        }

        console.log('Fetching user profile...');
        const userProfile = await apiRequest(getUserProfile);
        setUser(userProfile);
        console.log('User profile fetched successfully:', userProfile);

        console.log('Fetching top tracks...');
        const topTracksResponse = await apiRequest(() => getUserTopTracks('short_term'));
        setTopTracks(topTracksResponse.items);
        console.log('Top tracks fetched successfully:', topTracksResponse.items);
      } catch (err) {
        setError('Failed to fetch Spotify data');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAccessTokenAndData();
  }, [apiRequest]);

  const getTopGenresAndRecommendations = async () => {
    try {
      console.log('Fetching top genres and recommendations...');
      const topGenres = await apiRequest(getUserTopGenres);
      const topTracksResponse = await apiRequest(() => getUserTopTracks('medium_term'));
      const trackIds = topTracksResponse.items.map(track => track.id);
      const recommendations = await apiRequest(() => getPersonalizedRecommendations(trackIds, 50));
      console.log('Top genres and recommendations fetched successfully');
      return {
        genres: topGenres,
        recommendations,
      };
    } catch (error) {
      console.error('Error fetching top genres and recommendations:', error);
      throw error;
    }
  };

  const getAdditionalRecommendations = async (existingTracks, limit) => {
    try {
      let tracks = [...existingTracks];
      const fetchNewRecommendations = async () => {
        const newRecommendations = await apiRequest(() => getPersonalizedRecommendations(tracks.map(track => track.id), 50));
        tracks = [...new Set([...tracks, ...newRecommendations])];
        console.log(`Fetched ${newRecommendations.length} additional recommendations.`);
        return newRecommendations;
      };
      while (tracks.length < limit) {
        const newRecommendations = await fetchNewRecommendations();
        if (newRecommendations.length === 0) break;
      }
      console.log(`Total tracks fetched: ${tracks.length}`);
      return tracks.slice(0, limit);
    } catch (error) {
      console.error('Error fetching additional recommendations:', error);
      throw error;
    }
  };

  const getLatestReleases = async () => {
    try {
      console.log('Fetching latest releases...');
      const response = await apiRequest(fetchLatestReleases);
      console.log('Latest releases fetched successfully');
      return response;
    } catch (error) {
      console.error('Error fetching latest releases:', error);
      throw error;
    }
  };

  return {
    user,
    topTracks,
    error,
    isLoading,
    getTopGenresAndRecommendations,
    getAdditionalRecommendations,
    createPlaylist,
    uploadPlaylistImage,
    getLatestReleases,
  };
};

export default useSpotifyData;
