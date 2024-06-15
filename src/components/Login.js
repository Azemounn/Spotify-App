import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';
import spotifyLogo from '../images/spotify.png';

function Login() {
  const navigate = useNavigate();
  const clientId = 'ab6e0c2c8258420083bc08c8cbfab8d5'; // Replace with your client ID
  const redirectUri = 'http://localhost:3000'; // Ensure this matches the URI in your Spotify Developer Dashboard
  const scopes = 'user-top-read playlist-modify-private user-library-modify playlist-read-private user-read-recently-played playlist-modify-public playlist-read-private user-read-currently-playing ugc-image-upload';

  const handleLogin = () => {
    const authUrl = `https://accounts.spotify.com/authorize?response_type=token&client_id=${clientId}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirectUri)}`;
    window.location = authUrl;
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace('#', ''));
    const token = params.get('access_token');
    if (token) {
      try {
        localStorage.setItem('spotifyAccessToken', token);
        navigate('/home');
      } catch (error) {
        console.error('Error saving access token:', error);
      }
    }
  }, [navigate]);

  return (
    <div className="login-container">
      <div className="login-card">
        <img src={spotifyLogo} alt="Spotify Logo" className="spotify-logo" />
        <h1 className="login-heading">Log into Spotify</h1>
        <div className="relative inline-flex group">
          <div className="absolute transition-all duration-1000 opacity-70 -inset-px bg-gradient-to-r from-[#44BCFF] via-[#FF44EC] to-[#FF675E] rounded-xl blur-lg group-hover:opacity-100 group-hover:-inset-1 group-hover:duration-200 animate-tilt"></div>
          <button
            onClick={handleLogin}
            className="relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white transition-all duration-200 bg-gray-900 font-pj rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900"
          >
            Grant us Access :3
          </button>
        </div>
        <div className="space-x-3 mt-6">
          <label htmlFor="select1" className="relative inline-flex cursor-pointer items-center">
            <input type="checkbox" id="select1" className="peer sr-only" />
          </label>
        </div>
      </div>
    </div>
  );
}

export default Login;
