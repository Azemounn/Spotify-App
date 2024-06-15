import React, { useState, useEffect } from 'react';
import useSpotifyData from '../hooks/useSpotifyData';
import { getLyrics } from '../services/musixmatch';  // Ensure this import is correct
import { BASE_URL, getHeaders } from '../services/spotify';
import './Home.css';
import SwipeableCards from './SwipeableCards';
import Modal from './AIModal';
import axios from 'axios';

const COOLDOWN_PERIOD = 45 * 1000; // 45 seconds in milliseconds

function Home() {
  const {
    user,
    topTracks,
    error,
    isLoading,
    getTopGenresAndRecommendations,
    getAdditionalRecommendations,
    createPlaylist,
    uploadPlaylistImage,
  } = useSpotifyData();

  const [currentSlide, setCurrentSlide] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lyrics, setLyrics] = useState('');
  const [showLyrics, setShowLyrics] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [playlistName, setPlaylistName] = useState('');
  const [songRange, setSongRange] = useState(25);
  const [playlistImage, setPlaylistImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [accessToken, setAccessToken] = useState(localStorage.getItem('spotifyAccessToken'));
  const [musicStats, setMusicStats] = useState(null);
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [generatedSongs, setGeneratedSongs] = useState([]);

  useEffect(() => {
    console.log('Access Token:', accessToken);
    if (!accessToken) {
      console.error('Access token is missing. Please authenticate again.');
      alert('Access token is missing. Please authenticate again.');
      return;
    }

    if (topTracks.length > 0) {
      const interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % topTracks.length);
      }, 8000);
      return () => clearInterval(interval);
    }
  }, [accessToken, topTracks]);

  const handleOpenModal = () => {
    setShowPlaylistModal(true);
  };

  const closeModal = () => {
    setShowPlaylistModal(false);
    setShowStatsModal(false);
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setPlaylistImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateRecommendations = async () => {
    try {
      console.log('Generating recommendations...');
      const { recommendations, genres } = await getTopGenresAndRecommendations();
      let allRecommendations = recommendations.slice(0, Math.min(songRange, 50));

      if (songRange > 50) {
        const additionalRecommendations = await getAdditionalRecommendations(allRecommendations, songRange);
        allRecommendations = additionalRecommendations;
      }

      setGeneratedSongs(allRecommendations);

      console.log(`Generated ${allRecommendations.length} songs`);
      setSelectedGenres(genres.slice(0, 3));
      return allRecommendations;
    } catch (error) {
      console.error('Error generating recommendations:', error);
      alert('Failed to generate recommendations');
      return [];
    }
  };

  const handleCreatePlaylist = async () => {
    if (!playlistName || songRange < 10 || songRange > 250) {
      alert('Please fill in all fields correctly.');
      return;
    }

    const lastGeneratedTime = localStorage.getItem('lastGeneratedTime');
    const currentTime = new Date().getTime();

    if (lastGeneratedTime && currentTime - lastGeneratedTime < COOLDOWN_PERIOD) {
      const remainingTime = COOLDOWN_PERIOD - (currentTime - lastGeneratedTime);
      const remainingSeconds = Math.floor(remainingTime / 1000);
      alert(`Please wait ${remainingSeconds} seconds before generating another playlist.`);
      return;
    }

    setIsGenerating(true);

    try {
      const recommendations = await generateRecommendations();  // Await the recommendations

      console.log(`Creating playlist with ${recommendations.length} songs...`);
      const trackUris = recommendations.map(song => song.uri);
      console.log('Track URIs:', trackUris);

      const chunkSize = 100;
      const playlist = await createPlaylist(user.id, playlistName, trackUris.slice(0, chunkSize));

      for (let i = chunkSize; i < trackUris.length; i += chunkSize) {
        const chunk = trackUris.slice(i, i + chunkSize);
        await axios.post(`${BASE_URL}/playlists/${playlist.id}/tracks`, { uris: chunk }, getHeaders());
        console.log(`Added ${chunk.length} tracks to playlist: ${playlist.id}`);
      }

      if (playlistImage) {
        await uploadPlaylistImage(playlist.id, playlistImage);
      }

      localStorage.setItem('lastGeneratedTime', currentTime);

      alert('Playlist generated successfully');
    } catch (error) {
      console.error('Error generating playlist:', error);
      if (error.response && error.response.status === 401) {
        alert('Unauthorized access. Please re-authenticate.');
      } else {
        alert('Failed to generate playlist');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShowLyrics = async (track) => {
    try {
      const fetchedLyrics = await getLyrics(track.name, track.artists[0].name);
      setLyrics(fetchedLyrics);
      setShowLyrics(true);
    } catch (error) {
      console.error('Error fetching lyrics:', error);
      if (error.response && error.response.status === 401) {
        alert('Unauthorized access. Please re-authenticate.');
      } else {
        alert('Failed to fetch lyrics');
      }
    }
  };

  const handleSelectGenre = (genre) => {
    if (selectedGenres.includes(genre)) {
      setSelectedGenres(selectedGenres.filter((g) => g !== genre));
    } else if (selectedGenres.length < 3) {
      setSelectedGenres([...selectedGenres, genre]);
    } else {
      alert('You can select up to 3 genres.');
    }
  };

  const chunkArray = (array, chunkSize) => {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  };

  const sendChunkedData = async (url, data, chunkSize) => {
    const chunks = chunkArray(data, chunkSize);
    for (let i = 0; i < chunks.length; i++) {
      try {
        console.log('Sending chunk:', chunks[i]);
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ stats: chunks[i], isFinalChunk: i === chunks.length - 1 }),
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch server: ${response.statusText}`);
        }
      } catch (error) {
        console.error('Error in sendChunkedData:', error);
        throw error;
      }
    }
  };

  const refreshAccessToken = async () => {
    try {
      const response = await axios.post('/your-refresh-endpoint'); // Implement your refresh token logic
      const { accessToken } = response.data;
      setAccessToken(accessToken);
      localStorage.setItem('spotifyAccessToken', accessToken);
      return accessToken;
    } catch (error) {
      console.error('Failed to refresh access token:', error);
      return null;
    }
  };

  const handleShowStats = async () => {
    try {
      const { genres, recommendations } = await getTopGenresAndRecommendations();
      const stats = {
        genres,
        recommendations,
      };

      console.log('Stats to send:', stats); // Log the stats data
      const chunkSize = 10;
      const url = 'http://localhost:5000/generate-description'; // Ensure this URL is correct

      await sendChunkedData(url, stats, chunkSize);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stats: [], isFinalChunk: true }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch server: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(result.details);
      }

      setMusicStats(result);
      setShowStatsModal(true);
    } catch (error) {
      console.error('Error fetching music stats:', error);
      alert(`Failed to fetch music stats: ${error.message}`);
    }
  };

  if (isLoading) return <div className="bg-emerald-900 min-h-screen flex items-center justify-center text-white">Loading...</div>;

  if (error) return <div className="bg-emerald-900 min-h-screen flex items-center justify-center text-white">{error}</div>;

  return (
    <div className="bg-stone_2 min-h-screen">
      <div className="fixed bg-stone border-2 border-stone_3 rounded-t-lg text-white px-10 py-1 z-10 w-full">
        <div className="flex items-center justify-between py-2 text-5xl">
          <div className="font-bold text-white text-xl">Playlist Gen <span className="text-orange-500">:3</span></div>
        </div>
      </div>

      <div className="flex flex-row pt-24 px-10 pb-4">
        <div className="w-2/12 mr-6">
          <div className="avatar-field bg-stone border-2 border-stone_3 rounded-xl shadow-lg mb-6 px-6 py-4 text-center">
            {user && (
              <div>
                <img src={user.images[0]?.url} alt={user.display_name} className="rounded-full avatar-img mx-auto mb-4" />
                <p className="text-2xl text-white font-sleek">{user.display_name}</p>
                <a href="#" onClick={handleShowStats} className="text-sm text-blue-500 underline">pst, click me :3</a>
              </div>
            )}
          </div>
          <div className="bg-stone border-2 overflow-auto border-stone_3 rounded-xl shadow-lg text-center p-4">
            <SwipeableCards accessToken={accessToken} />
          </div>
        </div>

        <div className="w-10/12">
          <div className="bg-stone border-2 border-stone_3 rounded-xl w-full p-6 relative flex flex-col justify-between">
            <div className="text-container mb-6">
              <p className="text-5xl text-white mb-4">Hey there <br /><strong>Welcome ... Back</strong></p>
              <div className="button-container">
                <button onClick={handleOpenModal} className="button-36 " disabled={isGenerating}>
                  {isGenerating ? 'Generating...' : 'Generate a Playlist'}
                </button>
                <div className="hover-message">Click to generate a new playlist based on your top tracks and genres.</div>
              </div>
            </div>
            <div className="carousel-container">
              <div className="carousel">
                {topTracks.map((track, index) => (
                  <div key={track.id} className={`carousel-item ${index === currentSlide ? 'active' : ''}`}>
                    {track.album.images[0] && (
                      <img src={track.album.images[0].url} alt={track.name} className="carousel-image" />
                    )}
                    <p className="carousel-text">{track.name} by {track.artists.map(artist => artist.name).join(', ')}</p>
                    <button onClick={() => handleShowLyrics(track)} className="lyrics-button">Show Lyrics</button>
                    <div className="info-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
                        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm11.378-3.917c-.89-.777-2.366-.777-3.255 0a.75.75 0 0 1-.988-1.129c1.454-1.272 3.776-1.272 5.23 0 1.513 1.324 1.513 3.518 0 4.842a3.75 3.75 0 0 1-.837.552c-.676.328-1.028.774-1.028 1.152v.75a.75.75 0 0 1-1.5 0v-.75c0-1.279 1.06-2.107 1.875-2.502.182-.088.351-.199.503-.331.83-.727.83-1.857 0-2.584ZM12 18a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
                      </svg>
                      <span className="hover-message">Click to see the lyrics of this track.</span>
                    </div>
                  </div>
                ))}
                <div className="progress-bar">
                  <div className="progress-bar-fill" style={{ width: `${((currentSlide + 1) / topTracks.length) * 100}%` }}></div>
                </div>
              </div>
            </div>
            {showLyrics && (
              <div className="lyrics-container">
                <h3 className="text-2xl text-white">Lyrics</h3>
                <p className="text-white">{lyrics}</p>
                <button onClick={() => setShowLyrics(false)} className="close-lyrics-button">Close</button>
              </div>
            )}
          </div>
          <div className="bg-stone border-2 border-stone_3 rounded-xl shadow-lg mt-6 px-7 py-4 w-full relative">
            <p className="text-2xl text-white font-sleek">Recent Playlists Created<span className="text-orange-500"></span></p>
            <div className="playlists-container">
              {/* Add dynamic content for recent playlists here */}
            </div>
            <div className="info-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
                <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm11.378-3.917c-.89-.777-2.366-.777-3.255 0a.75.75 0 0 1-.988-1.129c1.454-1.272 3.776-1.272 5.23 0 1.513 1.324 1.513 3.518 0 4.842a3.75 3.75 0 0 1-.837.552c-.676.328-1.028.774-1.028 1.152v.75a.75.75 0 0 1-1.5 0v-.75c0-1.279 1.06-2.107 1.875-2.502.182-.088.351-.199.503-.331.83-.727.83-1.857 0-2.584ZM12 18a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
              </svg>
              <span className="hover-message">In this area you should see all the playlists created using our tool!</span>
            </div>
          </div>
        </div>
      </div>

      {showPlaylistModal && (
        <Modal onClose={closeModal}>
          <div className="playlist-modal-content">
            <div className="playlist-modal-header">
              <h2>Create a Playlist</h2>
              <span className="close" onClick={closeModal}>&times;</span>
            </div>
            <div className="playlist-modal-body">
              <input
                type="text"
                value={playlistName}
                onChange={(e) => setPlaylistName(e.target.value)}
                placeholder="Playlist Name"
                className="input-field"
              />
              <input
                type="number"
                value={songRange}
                onChange={(e) => setSongRange(e.target.value)}
                placeholder="Number of Songs (10-250)"
                className="input-field"
              />
              <div className="image-uploader">
                <input type="file" id="file" onChange={handleImageUpload} />
                <label htmlFor="file">Upload Playlist Image</label>
                {imagePreview && <img src={imagePreview} alt="Playlist Preview" className="image-preview" />}
              </div>
              <button onClick={handleCreatePlaylist} className="submit-button">
                Create Playlist
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showStatsModal && musicStats && (
        <Modal onClose={closeModal}>
          <h2 className="text-2xl text-white font-sleek">Your Music Stats</h2>
          <p className="text-white">{musicStats.description}</p>
          <p className="text-white">Total minutes listened this month: {musicStats.totalMinutes}</p>
          <div className="top-artists">
            {musicStats.top5Artists.map((artist, index) => (
              <div key={index} className="artist-circle">
                <img src={artist.image} alt={artist.name} className="artist-image" />
                <p className="artist-name">{artist.name}</p>
              </div>
            ))}
          </div>
          <div className="top-genres">
            {musicStats.top3Genres.map((genre, index) => (
              <div key={index} className="genre-icon">
                <img src={genre.icon} alt={genre.name} />
                <p>{genre.name}</p>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

export default Home;
