import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import CustomSlider from './CustomSlider';
import VolumeControl from './VolumeControl'; // Import the new component

const SongCard = ({
  song,
  onLike,
  onDislike,
  isPlaying,
  currentTime,
  duration,
  togglePlayPause,
  handleTimeUpdate,
  handleSliderChange,
  audioRef,
  userInteracted,
  formatTime,
  setIsPlaying
}) => {
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.load();
    }
  }, [song, audioRef]);

  useEffect(() => {
    if (userInteracted && isPlaying && audioRef.current) {
      audioRef.current.play().catch((error) => {
        console.error('Error playing audio:', error);
      });
    }
  }, [userInteracted, isPlaying, song, audioRef]);

  const handleEnded = () => {
    setIsPlaying(false);
  };

  return (
    <div className="card">
      {song.album && song.album.images[0] && (
        <img src={song.album.images[0].url} alt={song.name} className="card-image" />
      )}
      <div className="song-details">
        <h3 className="song-title">{song.name}</h3>
        <p className="song-artist">{song.artists.map((artist) => artist.name).join(', ')}</p>
        <div className="audio-controls">
          <button className="play-button" onClick={togglePlayPause}>
            {isPlaying ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="icon">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="icon">
                <path d="M5 3v18l15-9L5 3z" />
              </svg>
            )}
          </button>
          <VolumeControl audioRef={audioRef} /> {/* Move VolumeControl component here */}
          <CustomSlider
            currentTime={currentTime}
            duration={isNaN(duration) ? 0 : duration}
            onTimeChange={handleSliderChange}
          />
          <div className="time-display">
            {formatTime(currentTime)} / {formatTime(isNaN(duration) ? 0 : duration)}
          </div>
        </div>
        <div className="like-dislike-buttons">
          <button onClick={onDislike} className="dislike-button">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="icon">
              <path d="m6.72 5.66 11.62 11.62A8.25 8.25 0 0 0 6.72 5.66Zm10.56 12.68L5.66 6.72a8.25 8.25 0 0 0 11.62 11.62ZM5.105 5.106c3.807-3.808 9.98-3.808 13.788 0 3.808 3.807 3.808 9.98 0 13.788-3.807 3.808-9.98 3.808-13.788 0-3.808-3.807-3.808-9.98 0-13.788Z" />
            </svg>
          </button>
          <button onClick={onLike} className="like-button">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="icon">
              <path
                fillRule="evenodd"
                d="m11.645 20.91-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

SongCard.propTypes = {
  song: PropTypes.object.isRequired,
  onLike: PropTypes.func.isRequired,
  onDislike: PropTypes.func.isRequired,
  isPlaying: PropTypes.bool.isRequired,
  currentTime: PropTypes.number.isRequired,
  duration: PropTypes.number.isRequired,
  togglePlayPause: PropTypes.func.isRequired,
  handleTimeUpdate: PropTypes.func.isRequired,
  handleSliderChange: PropTypes.func.isRequired,
  audioRef: PropTypes.object.isRequired,
  userInteracted: PropTypes.bool.isRequired,
  formatTime: PropTypes.func.isRequired,
  setIsPlaying: PropTypes.func.isRequired
};

export default SongCard;
