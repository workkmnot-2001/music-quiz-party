// Search Service integrating MusicBrainz API & iTunes Search API
// - MusicBrainz: https://musicbrainz.org/ws/2/ (Rate limited, User-Agent: MyMusicApp/1.0 (work.kmnot@gmail.com))
// - iTunes: https://itunes.apple.com/search (Country configurable, media=music, entity=song)

const https = require('https');

// Local databases for immediate offline & fast autocomplete
let COMPREHENSIVE_CATALOG = [];
try { COMPREHENSIVE_CATALOG = require('./comprehensiveCatalog.json'); } catch (e) { COMPREHENSIVE_CATALOG = []; }
let CURATED_MVS = [];
try { CURATED_MVS = require('./curatedMVs.json'); } catch (e) { CURATED_MVS = []; }
let SEED_DATA = {};
try { SEED_DATA = require('./seedData.json'); } catch (e) { SEED_DATA = {}; }

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
function fetchJson(url, headers = {}, timeoutMs = 5000) {
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

// MusicBrainz Rate-Limited Request Executor (Max 2s timeout so it doesn't block users)
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
  }, 2500);
}

// Search MusicBrainz (Recordings, Artists & Releases)
async function searchMusicBrainz(query, limit = 15) {
  if (!query || !query.trim()) return [];

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

      const artwork = releaseId ? `https://coverartarchive.org/release/${releaseId}/front-250` : null;

      return {
        id: `mb_${r.id}`,
        title: r.title,
        artist,
        album: releaseTitle,
        releaseDate,
        artwork,
        previewUrl: null,
        externalUrl: `https://musicbrainz.org/recording/${r.id}`,
        musicBrainzUrl: `https://musicbrainz.org/recording/${r.id}`,
        source: 'musicbrainz',
        sourceLabel: 'MusicBrainz',
        type: 'song',
        score: r.score || 0
      };
    });
  } catch (err) {
    console.warn(`[SearchService] MusicBrainz search skipped (${err.message})`);
    return [];
  }
}

// Search iTunes Search API with automatic fallback to US if TH returns empty
async function searchITunes(query, country = 'TH', limit = 20) {
  if (!query || !query.trim()) return [];

  const cleanCountry = (country || 'TH').toUpperCase().trim().slice(0, 2);
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query.trim())}&media=music&entity=song&country=${cleanCountry}&limit=${limit}`;

  try {
    let data = await fetchJson(url, {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    }, 4500);

    let results = data.results || [];

    // Fallback: If country=TH returned 0 results, retry without country restriction (US store)
    if (results.length === 0 && cleanCountry === 'TH') {
      try {
        const fallbackUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(query.trim())}&media=music&entity=song&limit=${limit}`;
        const fallbackData = await fetchJson(fallbackUrl, {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }, 4000);
        if (fallbackData.results && fallbackData.results.length > 0) {
          results = fallbackData.results;
        }
      } catch (fallbackErr) {
        // Ignore fallback error
      }
    }

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
        previewUrl: t.previewUrl || null,
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
    return [];
  }
}

// Search Deezer API
async function searchDeezer(query, limit = 20) {
  if (!query || !query.trim()) return [];

  const url = `https://api.deezer.com/search?q=${encodeURIComponent(query.trim())}&limit=${limit}`;

  try {
    const data = await fetchJson(url, {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    }, 4500);

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
        previewUrl: t.preview || null,
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
    return [];
  }
}

// Unified Search: Merges and Deduplicates Results from iTunes, Deezer, MusicBrainz & Local Library
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

  // Pre-search local database for instant Thai/Inter matches
  const localMatches = [];
  const qLower = cleanQ.toLowerCase();
  const allLocal = [
    ...COMPREHENSIVE_CATALOG,
    ...CURATED_MVS,
    ...Object.values(SEED_DATA).flat()
  ];
  for (const t of allLocal) {
    if (!t || !t.title || !t.artist) continue;
    if (t.title.toLowerCase().includes(qLower) || t.artist.toLowerCase().includes(qLower)) {
      localMatches.push({
        id: t.id || `local_${normalizeText(t.title)}_${normalizeText(t.artist)}`,
        title: t.title,
        artist: t.artist,
        album: t.album || '',
        releaseDate: t.year ? String(t.year) : '',
        genre: t.genre || '',
        artwork: t.artwork || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600',
        previewUrl: t.previewUrl || null,
        externalUrl: '',
        appleMusicUrl: '',
        deezerUrl: '',
        source: 'local',
        sourceLabel: 'คลังเพลงแนะนำ',
        sources: ['itunes'],
        sourceLabels: ['Apple Music']
      });
      if (localMatches.length >= 10) break;
    }
  }

  // Run searches across providers concurrently
  const [itunesRes, deezerRes, mbRes] = await Promise.allSettled([
    searchITunes(cleanQ, cleanCountry, 25),
    searchDeezer(cleanQ, 20),
    searchMusicBrainz(cleanQ, 10)
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
  const mergedMap = new Map();

  // 1. Process local matches first (highest relevance)
  for (const track of localMatches) {
    const key = `${normalizeText(track.title)}___${normalizeText(track.artist)}`;
    mergedMap.set(key, track);
  }

  // 2. Process iTunes tracks
  for (const track of itunesList) {
    const key = `${normalizeText(track.title)}___${normalizeText(track.artist)}`;
    if (mergedMap.has(key)) {
      const existing = mergedMap.get(key);
      if (!existing.previewUrl && track.previewUrl) existing.previewUrl = track.previewUrl;
      if (!existing.artwork && track.artwork) existing.artwork = track.artwork;
      if (!existing.appleMusicUrl && track.appleMusicUrl) existing.appleMusicUrl = track.appleMusicUrl;
    } else {
      mergedMap.set(key, {
        ...track,
        source: 'itunes',
        sources: ['itunes'],
        sourceLabels: ['Apple Music']
      });
    }
  }

  // 3. Process Deezer tracks
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
      if (!existing.previewUrl && dzTrack.previewUrl) existing.previewUrl = dzTrack.previewUrl;
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

  // 4. Process MusicBrainz tracks
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

// Fast Autocomplete Search for Dropdowns (Local First + Fast iTunes API)
async function searchAutocomplete(query, limit = 12) {
  if (!query || typeof query !== 'string' || query.trim().length < 1) {
    return [];
  }

  const q = query.trim().toLowerCase();
  const results = [];
  const seenKeys = new Set();

  function addCandidate(c, priority = 3) {
    if (!c || !c.title || !c.artist) return;
    const key = `${normalizeText(c.title)}___${normalizeText(c.artist)}`;
    if (seenKeys.has(key)) return;
    seenKeys.add(key);

    results.push({
      id: c.id || `${c.artist}_${c.title}`.toLowerCase().replace(/[\s\-_.,'"!?:;()\[\]]/g, ''),
      title: c.title,
      artist: c.artist,
      displayText: c.displayText || `${c.title} - ${c.artist}`,
      artwork: c.artwork || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100',
      previewUrl: c.previewUrl || null,
      year: c.year || (c.releaseDate ? parseInt(c.releaseDate.substring(0, 4), 10) : 2021),
      genre: c.genre || 'Pop',
      country: c.country || 'สากล',
      artistType: c.artistType || 'ศิลปินเดี่ยว',
      priority
    });
  }

  // 1. Instant check against local comprehensive library & MVs
  const localPool = [
    ...COMPREHENSIVE_CATALOG,
    ...CURATED_MVS,
    ...Object.values(SEED_DATA).flat()
  ];

  for (const t of localPool) {
    if (!t || !t.title || !t.artist) continue;
    const tLower = t.title.toLowerCase();
    const aLower = t.artist.toLowerCase();
    const dLower = `${tLower} ${aLower}`;

    if (tLower === q || aLower === q) {
      addCandidate(t, 1); // Exact match
    } else if (tLower.startsWith(q) || aLower.startsWith(q)) {
      addCandidate(t, 2); // Starts with
    } else if (dLower.includes(q)) {
      addCandidate(t, 3); // Substring
    }
  }

  // 2. If fewer than limit and user typed >= 2 chars, fetch live from iTunes API
  if (results.length < limit && q.length >= 2) {
    try {
      const itunesItems = await searchITunes(query, 'TH', 10);
      for (const item of itunesItems) {
        addCandidate({
          id: item.id,
          title: item.title,
          artist: item.artist,
          album: item.album,
          artwork: item.artwork,
          previewUrl: item.previewUrl,
          year: item.releaseDate ? parseInt(item.releaseDate, 10) : 2022,
          genre: item.genre,
          displayText: `${item.title} - ${item.artist}`
        }, 4);
        if (results.length >= limit) break;
      }
    } catch (e) {
      // Ignore network search errors for autocomplete
    }
  }

  // Sort by priority (1: exact, 2: startsWith, 3: contains local, 4: itunes live)
  results.sort((a, b) => a.priority - b.priority);
  return results.slice(0, limit);
}

module.exports = {
  searchITunes,
  searchDeezer,
  searchMusicBrainz,
  unifiedMusicSearch,
  searchAutocomplete
};


