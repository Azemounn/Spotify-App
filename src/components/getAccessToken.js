import axios from 'axios';

const clientId = 'ab6e0c2c8258420083bc08c8cbfab8d5';
const clientSecret = 'c0096db8aa954fb59be264de807569a3';

const getAccessToken = async (refreshToken = null) => {
  try {
    const params = new URLSearchParams();
    if (refreshToken) {
      params.append('grant_type', 'refresh_token');
      params.append('refresh_token', refreshToken);
    } else {
      params.append('grant_type', 'client_credentials');
    }

    const response = await axios.post('https://accounts.spotify.com/api/token', params, {
      headers: {
        'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`),
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    console.log('Access token fetched:', response.data.access_token); // Print the access token
    return response.data;
  } catch (error) {
    console.error('Error fetching access token:', error.response ? error.response.data : error.message);
    throw error;
  }
};

export default getAccessToken;
