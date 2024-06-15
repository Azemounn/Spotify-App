import React, { useEffect, useState, useRef, useCallback } from 'react';
import axios from 'axios';
import SwipeableViews from 'react-swipeable-views';
import PropTypes from 'prop-types';
import SongCard from './SongCard';
import './SwipeableCards.css';

const SwipeableCards = ({ accessToken }) => {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentSong, setCurrentSong] = useState(null);
  const audioRef = useRef(null);
  const [backgroundStyle, setBackgroundStyle] = useState({});
  const [userInteracted, setUserInteracted] = useState(false);

  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!accessToken) return;

      try {
        const topTracksResponse = await axios.get('https://api.spotify.com/v1/me/top/tracks', {
          headers: {
            Authorization: `Bearer ${accessToken}`
          },
          params: {
            limit: 5
          }
        });

        const topArtistsResponse = await axios.get('https://api.spotify.com/v1/me/top/artists', {
          headers: {
            Authorization: `Bearer ${accessToken}`
          },
          params: {
            limit: 5
          }
        });

        const topTracks = topTracksResponse.data.items.map((track) => track.id);
        const topArtists = topArtistsResponse.data.items.map((artist) => artist.id);

        const seedTracks = topTracks.slice(0, 3);
        const seedArtists = topArtists.slice(0, 2);

        const recommendationsResponse = await axios.get('https://api.spotify.com/v1/recommendations', {
          headers: {
            Authorization: `Bearer ${accessToken}`
          },
          params: {
            seed_tracks: seedTracks.join(','),
            seed_artists: seedArtists.join(','),
            limit: 20
          }
        });

        const recommendedTracks = recommendationsResponse.data.tracks;
        setSongs(recommendedTracks);
        if (recommendedTracks.length > 0) {
          setCurrentSong(recommendedTracks[0]);
        }
      } catch (error) {
        console.error('Error fetching recommendations:', error.response ? error.response.data : error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [accessToken]);

  const handleLike = async (song) => {
    try {
      await axios.put('https://api.spotify.com/v1/me/tracks', null, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
        params: {
          ids: song.id
        }
      });
      setSongs((prevSongs) => prevSongs.filter((s) => s.id !== song.id));
      if (song.id === currentSong.id) {
        playNextSong();
      }
    } catch (error) {
      console.error('Error adding song to library:', error.response ? error.response.data : error.message);
    }
  };

  const handleDislike = (song) => {
    setSongs((prevSongs) => prevSongs.filter((s) => s.id !== song.id));
    if (song.id === currentSong.id) {
      playNextSong(false);
    }
  };

  const playNextSong = async (shouldPlay = true) => {
    const currentIndex = songs.findIndex((song) => song.id === currentSong?.id);
    const nextIndex = currentIndex + 1 < songs.length ? currentIndex + 1 : 0;
    const nextSong = songs[nextIndex];
    setCurrentSong(nextSong);
    await resetAudioPlayer();
    if (shouldPlay) {
      setIsPlaying(true);
    }
  };

  const resetAudioPlayer = async () => {
    if (audioRef.current) {
      await audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.load();
      setIsPlaying(false);
      setCurrentTime(0);
    }
  };

  const togglePlayPause = async () => {
    if (audioRef.current) {
      try {
        if (isPlaying) {
          await audioRef.current.pause();
        } else {
          await audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
      } catch (error) {
        console.error('Error toggling play/pause:', error);
      }
    }
  };

  const handleTimeUpdate = () => {
    setCurrentTime(audioRef.current ? audioRef.current.currentTime : 0);
    setDuration(audioRef.current ? audioRef.current.duration : 0);
  };

  const handleSliderChange = (value) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value;
      setCurrentTime(value);
    }
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const extractColors = useCallback((imageUrl) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = imageUrl;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, img.width, img.height);

      const imageData = ctx.getImageData(0, 0, img.width, img.height).data;

      let r = 0, g = 0, b = 0, count = 0;

      for (let i = 0; i < imageData.length; i += 4) {
        r += imageData[i];
        g += imageData[i + 1];
        b += imageData[i + 2];
        count++;
      }

      r = Math.floor(r / count);
      g = Math.floor(g / count);
      b = Math.floor(b / count);

      const color = `rgb(${r},${g},${b})`;

      setBackgroundStyle({
        background: `linear-gradient(135deg, ${color} 0%, #121212 100%)`
      });
    };
  }, []);

  useEffect(() => {
    if (currentSong && currentSong.album && currentSong.album.images[0]) {
      extractColors(currentSong.album.images[0].url);
    }
  }, [currentSong, extractColors]);

  const handleSongChange = (index) => {
    if (index >= 0 && index < songs.length) {
      const newSong = songs[index];
      setCurrentSong(newSong);
      resetAudioPlayer();
    }
  };

  const handleUserInteraction = () => {
    setUserInteracted(true);
  };

  useEffect(() => {
    if (userInteracted && currentSong && isPlaying && audioRef.current) {
      audioRef.current.play().catch((error) => {
        console.error('Error playing audio:', error);
      });
    }
  }, [userInteracted, currentSong, isPlaying]);

  const currentIndex = songs.findIndex((song) => song.id === currentSong?.id);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="swipe-container" onClick={handleUserInteraction}>
      <div className="dynamic-background" style={backgroundStyle}></div>
      {songs.length > 0 ? (
        <SwipeableViews index={currentIndex !== -1 ? currentIndex : 0} onChangeIndex={handleSongChange}>
          {songs.map((song, index) => (
            <SongCard
              key={song.id}
              song={song}
              onLike={() => handleLike(song)}
              onDislike={() => handleDislike(song)}
              isPlaying={isPlaying && currentIndex === index}
              currentTime={currentTime}
              duration={duration}
              togglePlayPause={togglePlayPause}
              handleTimeUpdate={handleTimeUpdate}
              handleSliderChange={handleSliderChange}
              audioRef={audioRef}
              userInteracted={userInteracted}
              formatTime={formatTime}
              setIsPlaying={setIsPlaying} // Pass setIsPlaying to SongCard
            />
          ))}
        </SwipeableViews>
      ) : (
        <div className="no-songs">No songs available</div>
      )}
      <audio
        ref={audioRef}
        src={currentSong?.preview_url}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => playNextSong(false)}
      />
    </div>
  );
};

SwipeableCards.propTypes = {
  accessToken: PropTypes.string.isRequired
};

export default SwipeableCards;
