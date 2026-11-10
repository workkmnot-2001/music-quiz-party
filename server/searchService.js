// Search Service integrating MusicBrainz API & iTunes Search API
// - MusicBrainz: https://musicbrainz.org/ws/2/ (Rate limited, User-Agent: MyMusicApp/1.0 (work.kmnot@gmail.com))
// - iTunes: https://itunes.apple.com/search (Country configurable, media=music, entity=song)

const https = require('https');

// Configuration
const MUSICBRAINZ_USER_AGENT = 'MyMusicApp/1.0 (work.kmnot@gmail.com)';
const MUSICBRAINZ_MIN_INTERVAL_MS = 1050; // MusicBrainz 1 req/sec rate limit compliance
let lastMusicBrainzRequestTime = 0;

// In-Memory Search Cache (TTL: 10 minutes)
const searchCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000;

// Helper to clean search strings for normalization and deduplication
function normalizeText(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/\s*\(feat\..*?\)/gi, '')
    .replace(/\s*\[feat\..*?\]/gi, '')
    .replace(/\s*\(ft\..*?\)/gi, '')
    .replace(/\s*\[ft\..*?\]/gi, '')
    .replace(/[\s\-_.,'"!?:;()\[\]]/g, '')
    .trim();
}

// Fetch helper with timeout and custom headers
function fetchJson(url, headers = {}, timeoutMs = 7000) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        ...headers
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const json = JSON.parse(data);
            resolve(json);
          } catch (err) {
            reject(new Error(`Invalid JSON response: ${err.message}`));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage || 'API Error'}`));
        }
      });
    });

    req.on('error', (err) => reject(err));

    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject(new Error(`Request timeout after ${timeoutMs}ms`));
    });

    req.end();
  });
}

// MusicBrainz Rate-Limited Request Executor
async function executeMusicBrainzRequest(url) {
  const now = Date.now();
  const timeSinceLast = now - lastMusicBrainzRequestTime;
  if (timeSinceLast < MUSICBRAINZ_MIN_INTERVAL_MS) {
    const delay = MUSICBRAINZ_MIN_INTERVAL_MS - timeSinceLast;
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  lastMusicBrainzRequestTime = Date.now();

  return fetchJson(url, {
    'User-Agent': MUSICBRAINZ_USER_AGENT
  }, 7000);
}

// Search MusicBrainz (Recordings, Artists & Releases)
async function searchMusicBrainz(query, limit = 15) {
  if (!query || !query.trim()) return [];

  // Lucene query: search both artist and recording title
  const cleanQ = query.trim();
  const luceneQuery = `artist:"${cleanQ}" OR recording:"${cleanQ}" OR ${cleanQ}`;
  const url = `https://musicbrainz.org/ws/2/recording/?query=${encodeURIComponent(luceneQuery)}&fmt=json&limit=${limit}`;

  try {
    const data = await executeMusicBrainzRequest(url);
    const recordings = data.recordings || [];

    return recordings.map(r => {
      const artist = r['artist-credit']?.map(a => a.name).join(' & ') || 'Unknown Artist';
      const release = r.releases?.[0];
      const releaseTitle = release?.title || '';
      const releaseDate = release?.date || '';
      const releaseId = release?.id;

      // MusicBrainz front artwork from Cover Art Archive (if release ID exists)
      const artwork = releaseId ? `https://coverartarchive.org/release/${releaseId}/front-250` : null;

      return {
        id: `mb_${r.id}`,
        title: r.title,
        artist,
        album: releaseTitle,
        releaseDate,
        artwork,
        externalUrl: `https://musicbrainz.org/recording/${r.id}`,
        musicBrainzUrl: `https://musicbrainz.org/recording/${r.id}`,
        source: 'musicbrainz',
        sourceLabel: 'MusicBrainz',
        type: 'song',
        score: r.score || 0
      };
    });
  } catch (err) {
    console.warn(`[SearchService] MusicBrainz search failed for "${query}":`, err.message);
    throw err;
  }
}

// Search iTunes Search API
async function searchITunes(query, country = 'TH', limit = 20) {
  if (!query || !query.trim()) return [];

  const cleanCountry = (country || 'TH').toUpperCase().trim().slice(0, 2);
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query.trim())}&media=music&entity=song&country=${cleanCountry}&limit=${limit}`;

  try {
    const data = await fetchJson(url, {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    }, 6000);

    const results = data.results || [];
    return results.map(t => {
      const artwork = t.artworkUrl100
        ? t.artworkUrl100.replace('100x100bb', '600x600bb')
        : null;

      const releaseYear = t.releaseDate ? t.releaseDate.slice(0, 4) : '';

      return {
        id: `itunes_${t.trackId}`,
        title: t.trackName,
        artist: t.artistName,
        album: t.collectionName || '',
        releaseDate: releaseYear,
        genre: t.primaryGenreName || '',
        artwork,
        externalUrl: t.trackViewUrl || t.collectionViewUrl || '',
        appleMusicUrl: t.trackViewUrl || t.collectionViewUrl || '',
        source: 'itunes',
        sourceLabel: 'Apple Music / iTunes',
        type: 'song',
        trackId: t.trackId
      };
    });
  } catch (err) {
    console.warn(`[SearchService] iTunes search failed for "${query}":`, err.message);
    throw err;
  }
}

// Search Deezer API
async function searchDeezer(query, limit = 20) {
  if (!query || !query.trim()) return [];

  const url = `https://api.deezer.com/search?q=${encodeURIComponent(query.trim())}&limit=${limit}`;

  try {
    const data = await fetchJson(url, {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    }, 6000);

    const results = data.data || [];
    return results.map(t => {
      const artwork = t.album?.cover_xl || t.album?.cover_big || t.album?.cover_medium || null;
      return {
        id: `dz_${t.id}`,
        title: t.title,
        artist: t.artist?.name || '',
        album: t.album?.title || '',
        releaseDate: '',
        genre: '',
        artwork,
        externalUrl: t.link || '',
        deezerUrl: t.link || '',
        source: 'deezer',
        sourceLabel: 'Deezer',
        type: 'song',
        trackId: t.id
      };
    });
  } catch (err) {
    console.warn(`[SearchService] Deezer search failed for "${query}":`, err.message);
    throw err;
  }
}

// Unified Search: Merges and Deduplicates Results from iTunes, Deezer, and MusicBrainz
async function unifiedMusicSearch(query, country = 'TH') {
  if (!query || !query.trim()) {
    return {
      query: '',
      country,
      total: 0,
      sources: {
        itunes: { status: 'ok', count: 0, error: null },
        deezer: { status: 'ok', count: 0, error: null },
        musicbrainz: { status: 'ok', count: 0, error: null }
      },
      results: []
    };
  }

  const cleanQ = query.trim();
  const cleanCountry = (country || 'TH').toUpperCase().slice(0, 2);
  const cacheKey = `${cleanQ.toLowerCase()}_${cleanCountry}`;

  // Check in-memory cache
  if (searchCache.has(cacheKey)) {
    const cached = searchCache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }
    searchCache.delete(cacheKey);
  }

  // Run searches across all 3 providers concurrently with individual error handling
  const [itunesRes, deezerRes, mbRes] = await Promise.allSettled([
    searchITunes(cleanQ, cleanCountry, 20),
    searchDeezer(cleanQ, 20),
    searchMusicBrainz(cleanQ, 15)
  ]);

  const sourcesStatus = {
    itunes: {
      status: itunesRes.status === 'fulfilled' ? 'ok' : 'error',
      count: itunesRes.status === 'fulfilled' ? itunesRes.value.length : 0,
      error: itunesRes.status === 'rejected' ? itunesRes.reason.message : null
    },
    deezer: {
      status: deezerRes.status === 'fulfilled' ? 'ok' : 'error',
      count: deezerRes.status === 'fulfilled' ? deezerRes.value.length : 0,
      error: deezerRes.status === 'rejected' ? deezerRes.reason.message : null
    },
    musicbrainz: {
      status: mbRes.status === 'fulfilled' ? 'ok' : 'error',
      count: mbRes.status === 'fulfilled' ? mbRes.value.length : 0,
      error: mbRes.status === 'rejected' ? mbRes.reason.message : null
    }
  };

  const itunesList = itunesRes.status === 'fulfilled' ? itunesRes.value : [];
  const deezerList = deezerRes.status === 'fulfilled' ? deezerRes.value : [];
  const mbList = mbRes.status === 'fulfilled' ? mbRes.value : [];

  // Merge and Deduplicate items across all providers
  // Key: normalized(title) + '___' + normalized(artist)
  const mergedMap = new Map();

  // 1. Process iTunes tracks
  for (const track of itunesList) {
    const key = `${normalizeText(track.title)}___${normalizeText(track.artist)}`;
    mergedMap.set(key, {
      ...track,
      source: 'itunes',
      sources: ['itunes'],
      sourceLabels: ['Apple Music']
    });
  }

  // 2. Process Deezer tracks: enrich existing or add new
  for (const dzTrack of deezerList) {
    const key = `${normalizeText(dzTrack.title)}___${normalizeText(dzTrack.artist)}`;
    if (mergedMap.has(key)) {
      const existing = mergedMap.get(key);
      existing.source = 'both';
      if (!existing.sources.includes('deezer')) {
        existing.sources.push('deezer');
        existing.sourceLabels.push('Deezer');
      }
      existing.deezerUrl = dzTrack.deezerUrl;
      if (!existing.artwork && dzTrack.artwork) existing.artwork = dzTrack.artwork;
      if (!existing.album && dzTrack.album) existing.album = dzTrack.album;
    } else {
      mergedMap.set(key, {
        ...dzTrack,
        source: 'deezer',
        sources: ['deezer'],
        sourceLabels: ['Deezer']
      });
    }
  }

  // 3. Process MusicBrainz tracks: enrich existing or add new
  for (const mbTrack of mbList) {
    const key = `${normalizeText(mbTrack.title)}___${normalizeText(mbTrack.artist)}`;
    if (mergedMap.has(key)) {
      const existing = mergedMap.get(key);
      existing.source = 'both';
      if (!existing.sources.includes('musicbrainz')) {
        existing.sources.push('musicbrainz');
        existing.sourceLabels.push('MusicBrainz');
      }
      existing.musicBrainzUrl = mbTrack.musicBrainzUrl;
      if (!existing.album && mbTrack.album) existing.album = mbTrack.album;
      if (!existing.releaseDate && mbTrack.releaseDate) existing.releaseDate = mbTrack.releaseDate;
    } else {
      mergedMap.set(key, {
        ...mbTrack,
        source: 'musicbrainz',
        sources: ['musicbrainz'],
        sourceLabels: ['MusicBrainz']
      });
    }
  }

  const results = Array.from(mergedMap.values());

  const responsePayload = {
    query: cleanQ,
    country: cleanCountry,
    total: results.length,
    sources: sourcesStatus,
    results
  };

  // Cache successful result
  searchCache.set(cacheKey, {
    timestamp: Date.now(),
    data: responsePayload
  });

  return responsePayload;
}

module.exports = {
  searchITunes,
  searchDeezer,
  searchMusicBrainz,
  unifiedMusicSearch
};

