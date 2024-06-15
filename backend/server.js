const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
require('dotenv').config();

const OpenAI = require('openai');

const app = express();
const port = 5000;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.use(cors());
app.use(express.json({ limit: '1000mb' }));

const cache = new Map();

const generateCacheKey = (data) => {
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
};

app.post('/generate-description', async (req, res) => {
  const { stats, isFinalChunk } = req.body;

  console.log('Received stats:', JSON.stringify(stats));
  console.log('isFinalChunk:', isFinalChunk);

  if (!stats || !Array.isArray(stats.genres) || stats.genres.length === 0 || !Array.isArray(stats.recommendations) || stats.recommendations.length === 0) {
    console.error('Invalid stats provided:', stats);
    return res.status(400).json({ error: 'Invalid music stats provided. Please provide valid genres and recommendations.' });
  }

  const cacheKey = generateCacheKey(stats);

  if (cache.has(cacheKey)) {
    console.log('Serving from cache');
    return res.json(cache.get(cacheKey));
  }

  if (!isFinalChunk) {
    return res.json({ message: 'Chunk received' });
  }

  try {
    const totalMinutes = stats.recommendations.reduce((acc, rec) => acc + rec.duration_ms, 0) / 60000;

    const top5Artists = stats.recommendations
      .map(rec => rec.artists[0])
      .reduce((acc, artist) => {
        acc[artist.name] = (acc[artist.name] || 0) + 1;
        return acc;
      }, {});

    const sortedArtists = Object.entries(top5Artists).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name]) => name);

    const descriptionResponse = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an assistant.',
        },
        {
          role: 'user',
          content: `Based on these music stats ${JSON.stringify(stats)}, create a fun description.`,
        },
      ],
      max_tokens: 150,
    });

    const description = descriptionResponse.choices[0].message.content;

    const result = {
      description,
      totalMinutes,
      top5Artists: sortedArtists,
      top3Genres: stats.genres.slice(0, 3),
    };

    cache.set(cacheKey, result);

    res.json(result);
  } catch (error) {
    console.error('Error generating description:', error);
    if (error instanceof OpenAI.APIError) {
      console.error(error.status);  // e.g. 401
      console.error(error.message); // e.g. The authentication token you passed was invalid...
      console.error(error.code);  // e.g. 'invalid_api_key'
      console.error(error.type);  // e.g. 'invalid_request_error'
      if (error.status === 429 || error.code === 'insufficient_quota') {
        return res.status(429).json({
          error: 'Rate limit exceeded or insufficient quota. Please try again later or upgrade your plan.',
          details: error.message,
          fallback: 'Due to high demand, we are unable to process your request right now. Please try again later or upgrade your plan.'
        });
      } else {
        return res.status(500).json({ error: 'Error generating description', details: error.message });
      }
    } else {
      return res.status(500).json({ error: 'Error generating description', details: error.message });
    }
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
