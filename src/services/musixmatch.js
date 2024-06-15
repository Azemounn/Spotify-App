import axios from 'axios';

const MUSIXMATCH_API_KEY = 'c8df9a5014f6888bf33674f8c22cab39'; // Replace with your actual Musixmatch API key

export const getLyrics = async (trackName, artistName) => {
  const url = `https://api.musixmatch.com/ws/1.1/matcher.lyrics.get?q_track=${trackName}&q_artist=${artistName}&apikey=${MUSIXMATCH_API_KEY}`;
  try {
    const response = await axios.get(url);
    if (response.data.message.body.lyrics) {
      return response.data.message.body.lyrics.lyrics_body;
    } else {
      return 'Lyrics not found.';
    }
  } catch (error) {
    console.error('Error fetching lyrics:', error);
    return 'Error fetching lyrics.';
  }
};
