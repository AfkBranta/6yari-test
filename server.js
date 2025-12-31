import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// ----- API: download cover art -----
app.get('/api/download-cover', async (req, res) => {
    const imageUrl = req.query.url;

    // Basic safety check (Spotify CDN only)
    if (!imageUrl || !imageUrl.startsWith('https://i.scdn.co/')) {
        return res.status(400).send('Invalid image URL');
    }

    try {
        const response = await fetch(imageUrl);

        if (!response.ok) {
            throw new Error('Failed to fetch image');
        }

        const buffer = Buffer.from(await response.arrayBuffer());

        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader(
            'Content-Disposition',
            'attachment; filename="cover.jpg"'
        );

        res.send(buffer);
    } catch (err) {
        console.error('Cover download failed:', err);
        res.status(500).send('Failed to download cover');
    }
});

app.get('/api/leaks', (req, res) => {
  try {
    const leaksPath = path.join(__dirname, 'data', 'leaks.json');
    const leaksData = fs.readFileSync(leaksPath, 'utf8');
    const leaks = JSON.parse(leaksData);
    res.json(leaks);
  } catch (err) {
    console.error('Failed to load leaks:', err);
    res.status(500).json([]);
  }
});

let spotifyToken = '';
let tokenExpiresAt = 0;

async function getSpotifyToken() {
    const now = Date.now();
    if (spotifyToken && now < tokenExpiresAt) return spotifyToken;

    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');

    const res = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Authorization': 'Basic ' + Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params
    });

    const data = await res.json();
    spotifyToken = data.access_token;
    tokenExpiresAt = now + (data.expires_in - 60) * 1000;
    return spotifyToken;
}

// fetch albums & tracks for bunii and shy the eternal
async function fetchArtistTracks(artistId) {
    try {
        const token = await getSpotifyToken();
        const albumsRes = await fetch(`https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album,single&limit=50`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const albumsData = await albumsRes.json();
        const albums = albumsData.items || [];

        const seen = new Set();
        const uniqueAlbums = albums.filter(album => {
            if (seen.has(album.id)) return false;
            seen.add(album.id);
            return true;
        });

        const albumsWithTracks = await Promise.all(uniqueAlbums.map(async album => {
            const tracksRes = await fetch(`https://api.spotify.com/v1/albums/${album.id}/tracks`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const tracksData = await tracksRes.json();

            return {
                albumName: album.name,
                releaseDate: album.release_date,
                album_id: album.id,
                artwork: album.images[0]?.url || '',
                tracks: tracksData.items?.map(track => ({
                    name: track.name,
                    artists: 'bunii',
                    preview_url: track.preview_url,
                    spotify_url: track.external_urls.spotify
                })) || []
};

        }));

        return albumsWithTracks;
    } catch (err) {
        console.error('Error fetching artist:', artistId, err);
        return [];
    }
}

// ----------------------
// Caching
// ----------------------
let cache = {
    bunii: { data: null, timestamp: 0 },
    shy: { data: null, timestamp: 0 },
    all: { data: null, timestamp: 0 }
};

const CACHE_DURATION = 1000 * 60 * 5; // 5 minutes

async function getCachedTracks(key, fetchFunction) {
    const now = Date.now();
    if (cache[key].data && now - cache[key].timestamp < CACHE_DURATION) {
        return cache[key].data;
    }
    const data = await fetchFunction();
    cache[key] = { data, timestamp: now };
    return data;
}

// ----------------------
// API Endpoints
// ----------------------
app.get('/api/bunii', async (req, res) => {
    const tracks = await getCachedTracks('bunii', () => fetchArtistTracks('6mx3Y8XNLPaS2pjJbQFq3W')); // Bunii
    res.json(tracks);
});

app.get('/api/shy', async (req, res) => {
    const tracks = await getCachedTracks('shy', () => fetchArtistTracks('6sZWADsYSJKpvXQMek1Cwl')); // Shy the Eternal
    res.json(tracks);
});

app.get('/api/all', async (req, res) => {
    const tracks = await getCachedTracks('all', async () => {
        const [bunii, shy] = await Promise.all([
            fetchArtistTracks('6mx3Y8XNLPaS2pjJbQFq3W'),
            fetchArtistTracks('6sZWADsYSJKpvXQMek1Cwl')
        ]);
        return [...bunii, ...shy];
    });
    res.json(tracks);
});

// Serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});