// Game Modes Service for Heardle, Songdle (LoLdle style), and Music Video
const fetch = global.fetch || require('node-fetch');

// Artist Knowledge Base for Songdle & Attributes
const ARTIST_METADATA = {
  // Thai Bands
  'bodyslam': { type: 'วงดนตรี (Band)', genre: 'Rock', country: '🇹🇭 ไทย' },
  'potato': { type: 'วงดนตรี (Band)', genre: 'Rock', country: '🇹🇭 ไทย' },
  'tattoo colour': { type: 'วงดนตรี (Band)', genre: 'Pop / Indie', country: '🇹🇭 ไทย' },
  'three man down': { type: 'วงดนตรี (Band)', genre: 'Pop / Rock', country: '🇹🇭 ไทย' },
  'tilly birds': { type: 'วงดนตรี (Band)', genre: 'Pop / Rock', country: '🇹🇭 ไทย' },
  'cocktail': { type: 'วงดนตรี (Band)', genre: 'Rock', country: '🇹🇭 ไทย' },
  'loso': { type: 'วงดนตรี (Band)', genre: 'Rock', country: '🇹🇭 ไทย' },
  'silly fools': { type: 'วงดนตรี (Band)', genre: 'Rock', country: '🇹🇭 ไทย' },
  'labanoon': { type: 'วงดนตรี (Band)', genre: 'Rock', country: '🇹🇭 ไทย' },
  'getsunova': { type: 'วงดนตรี (Band)', genre: 'Pop / Rock', country: '🇹🇭 ไทย' },
  'big ass': { type: 'วงดนตรี (Band)', genre: 'Rock', country: '🇹🇭 ไทย' },
  'clash': { type: 'วงดนตรี (Band)', genre: 'Rock', country: '🇹🇭 ไทย' },
  'paper planes': { type: 'วงดนตรี (Band)', genre: 'Rock', country: '🇹🇭 ไทย' },
  'no one else': { type: 'วงดนตรี (Band)', genre: 'Pop', country: '🇹🇭 ไทย' },
  'safeplanet': { type: 'วงดนตรี (Band)', genre: 'Indie', country: '🇹🇭 ไทย' },
  'taitosmith': { type: 'วงดนตรี (Band)', genre: 'Rock / เพื่อชีวิต', country: '🇹🇭 ไทย' },

  // Thai Duos
  'fellow fellow': { type: 'ดูโอ้ (Duo)', genre: 'Pop', country: '🇹🇭 ไทย' },
  'scrubb': { type: 'ดูโอ้ (Duo)', genre: 'Indie', country: '🇹🇭 ไทย' },
  'whal & dolph': { type: 'ดูโอ้ (Duo)', genre: 'Indie', country: '🇹🇭 ไทย' },
  'mirrr': { type: 'ดูโอ้ (Duo)', genre: 'Pop / Indie', country: '🇹🇭 ไทย' },
  'anatomy rabbit': { type: 'ดูโอ้ (Duo)', genre: 'Indie', country: '🇹🇭 ไทย' },
  'dept': { type: 'ดูโอ้ (Duo)', genre: 'Indie', country: '🇹🇭 ไทย' },

  // Thai Idols & Groups
  '4eve': { type: 'วงเกิร์ลกรุ๊ป (Girl Group)', genre: 'T-Pop', country: '🇹🇭 ไทย' },
  'pixxie': { type: 'วงเกิร์ลกรุ๊ป (Girl Group)', genre: 'T-Pop', country: '🇹🇭 ไทย' },
  'alala': { type: 'วงเกิร์ลกรุ๊ป (Girl Group)', genre: 'T-Pop', country: '🇹🇭 ไทย' },
  'viis': { type: 'วงเกิร์ลกรุ๊ป (Girl Group)', genre: 'T-Pop', country: '🇹🇭 ไทย' },
  'mxfruit': { type: 'วงเกิร์ลกรุ๊ป (Girl Group)', genre: 'T-Pop', country: '🇹🇭 ไทย' },
  'bnk48': { type: 'วงเกิร์ลกรุ๊ป (Girl Group)', genre: 'T-Pop', country: '🇹🇭 ไทย' },
  'proxie': { type: 'วงบอยแบนด์ (Boy Group)', genre: 'T-Pop', country: '🇹🇭 ไทย' },
  'bus': { type: 'วงบอยแบนด์ (Boy Group)', genre: 'T-Pop', country: '🇹🇭 ไทย' },
  'atlas': { type: 'วงบอยแบนด์ (Boy Group)', genre: 'T-Pop', country: '🇹🇭 ไทย' },
  'perses': { type: 'วงบอยแบนด์ (Boy Group)', genre: 'T-Pop', country: '🇹🇭 ไทย' },
  'lykn': { type: 'วงบอยแบนด์ (Boy Group)', genre: 'T-Pop', country: '🇹🇭 ไทย' },
  'dice': { type: 'วงบอยแบนด์ (Boy Group)', genre: 'T-Pop', country: '🇹🇭 ไทย' },

  // Thai Solos
  'nont tanont': { type: 'เดี่ยวชาย (Male Solo)', genre: 'Pop', country: '🇹🇭 ไทย' },
  'jeff satur': { type: 'เดี่ยวชาย (Male Solo)', genre: 'Pop', country: '🇹🇭 ไทย' },
  'billkin': { type: 'เดี่ยวชาย (Male Solo)', genre: 'Pop', country: '🇹🇭 ไทย' },
  'pp krit': { type: 'เดี่ยวชาย (Male Solo)', genre: 'Pop', country: '🇹🇭 ไทย' },
  'bowkylion': { type: 'เดี่ยวหญิง (Female Solo)', genre: 'Pop', country: '🇹🇭 ไทย' },
  'palmy': { type: 'เดี่ยวหญิง (Female Solo)', genre: 'Pop', country: '🇹🇭 ไทย' },
  'violette wautier': { type: 'เดี่ยวหญิง (Female Solo)', genre: 'Pop', country: '🇹🇭 ไทย' },
  'ink waruntorn': { type: 'เดี่ยวหญิง (Female Solo)', genre: 'Pop', country: '🇹🇭 ไทย' },
  'd gerrard': { type: 'เดี่ยวชาย (Male Solo)', genre: 'R&B / Hip-Hop', country: '🇹🇭 ไทย' },
  'มนต์แคน แก่นคูน': { type: 'เดี่ยวชาย (Male Solo)', genre: 'ลูกทุ่ง (Luk Thung)', country: '🇹🇭 ไทย' },
  'ไผ่ พงศธร': { type: 'เดี่ยวชาย (Male Solo)', genre: 'ลูกทุ่ง (Luk Thung)', country: '🇹🇭 ไทย' },
  'ต่าย อรทัย': { type: 'เดี่ยวหญิง (Female Solo)', genre: 'ลูกทุ่ง (Luk Thung)', country: '🇹🇭 ไทย' },
  'ลำไย ไหทองคำ': { type: 'เดี่ยวหญิง (Female Solo)', genre: 'ลูกทุ่ง (Luk Thung)', country: '🇹🇭 ไทย' },
  'ก้อง ห้วยไร่': { type: 'เดี่ยวชาย (Male Solo)', genre: 'ลูกทุ่ง (Luk Thung)', country: '🇹🇭 ไทย' },
  'เบิ้ล ปทุมราช': { type: 'เดี่ยวชาย (Male Solo)', genre: 'ลูกทุ่ง (Luk Thung)', country: '🇹🇭 ไทย' },

  // Thai Rappers & Hip-Hop
  'youngohm': { type: 'เดี่ยวชาย (Male Solo)', genre: 'Hip-Hop / Rap', country: '🇹🇭 ไทย' },
  'f.hero': { type: 'เดี่ยวชาย (Male Solo)', genre: 'Hip-Hop / Rap', country: '🇹🇭 ไทย' },
  'fhero': { type: 'เดี่ยวชาย (Male Solo)', genre: 'Hip-Hop / Rap', country: '🇹🇭 ไทย' },
  'saran': { type: 'เดี่ยวชาย (Male Solo)', genre: 'Hip-Hop / Rap', country: '🇹🇭 ไทย' },
  'sprite': { type: 'เดี่ยวชาย (Male Solo)', genre: 'Hip-Hop / Rap', country: '🇹🇭 ไทย' },
  '1mill': { type: 'เดี่ยวชาย (Male Solo)', genre: 'Hip-Hop / Rap', country: '🇹🇭 ไทย' },
  'og-anic': { type: 'เดี่ยวชาย (Male Solo)', genre: 'Hip-Hop / Rap', country: '🇹🇭 ไทย' },
  'oganic': { type: 'เดี่ยวชาย (Male Solo)', genre: 'Hip-Hop / Rap', country: '🇹🇭 ไทย' },
  'urboytj': { type: 'เดี่ยวชาย (Male Solo)', genre: 'Hip-Hop / Rap', country: '🇹🇭 ไทย' },
  'twopee': { type: 'เดี่ยวชาย (Male Solo)', genre: 'Hip-Hop / Rap', country: '🇹🇭 ไทย' },
  'illslick': { type: 'เดี่ยวชาย (Male Solo)', genre: 'Hip-Hop / R&B', country: '🇹🇭 ไทย' },
  'diamond mqt': { type: 'เดี่ยวชาย (Male Solo)', genre: 'Hip-Hop / Rap', country: '🇹🇭 ไทย' },
  'maiyarap': { type: 'เดี่ยวชาย (Male Solo)', genre: 'Hip-Hop / Rap', country: '🇹🇭 ไทย' },
  'milli': { type: 'เดี่ยวหญิง (Female Solo)', genre: 'Hip-Hop / Rap', country: '🇹🇭 ไทย' },
  'rachyo': { type: 'เดี่ยวชาย (Male Solo)', genre: 'Hip-Hop / Rap', country: '🇹🇭 ไทย' },
  'lazyloxy': { type: 'เดี่ยวชาย (Male Solo)', genre: 'Hip-Hop / Rap', country: '🇹🇭 ไทย' },
  'p-hot': { type: 'เดี่ยวชาย (Male Solo)', genre: 'Hip-Hop / Rap', country: '🇹🇭 ไทย' },
  'daboyway': { type: 'เดี่ยวชาย (Male Solo)', genre: 'Hip-Hop / Rap', country: '🇹🇭 ไทย' },
  'timethai': { type: 'เดี่ยวชาย (Male Solo)', genre: 'R&B / Hip-Hop', country: '🇹🇭 ไทย' },
  'fiixd': { type: 'เดี่ยวชาย (Male Solo)', genre: 'Hip-Hop / Rap', country: '🇹🇭 ไทย' },
  'guygeegee': { type: 'เดี่ยวชาย (Male Solo)', genre: 'Hip-Hop / Rap', country: '🇹🇭 ไทย' },

  // K-Pop Girl Groups
  'blackpink': { type: 'วงเกิร์ลกรุ๊ป (Girl Group)', genre: 'K-Pop', country: '🇰🇷 เกาหลี' },
  'twice': { type: 'วงเกิร์ลกรุ๊ป (Girl Group)', genre: 'K-Pop', country: '🇰🇷 เกาหลี' },
  'newjeans': { type: 'วงเกิร์ลกรุ๊ป (Girl Group)', genre: 'K-Pop', country: '🇰🇷 เกาหลี' },
  'aespa': { type: 'วงเกิร์ลกรุ๊ป (Girl Group)', genre: 'K-Pop', country: '🇰🇷 เกาหลี' },
  'ive': { type: 'วงเกิร์ลกรุ๊ป (Girl Group)', genre: 'K-Pop', country: '🇰🇷 เกาหลี' },
  'le sserafim': { type: 'วงเกิร์ลกรุ๊ป (Girl Group)', genre: 'K-Pop', country: '🇰🇷 เกาหลี' },
  'itzy': { type: 'วงเกิร์ลกรุ๊ป (Girl Group)', genre: 'K-Pop', country: '🇰🇷 เกาหลี' },
  'illit': { type: 'วงเกิร์ลกรุ๊ป (Girl Group)', genre: 'K-Pop', country: '🇰🇷 เกาหลี' },
  'babymonster': { type: 'วงเกิร์ลกรุ๊ป (Girl Group)', genre: 'K-Pop', country: '🇰🇷 เกาหลี' },
  '(g)i-dle': { type: 'วงเกิร์ลกรุ๊ป (Girl Group)', genre: 'K-Pop', country: '🇰🇷 เกาหลี' },
  'red velvet': { type: 'วงเกิร์ลกรุ๊ป (Girl Group)', genre: 'K-Pop', country: '🇰🇷 เกาหลี' },
  'stayc': { type: 'วงเกิร์ลกรุ๊ป (Girl Group)', genre: 'K-Pop', country: '🇰🇷 เกาหลี' },
  'nmixx': { type: 'วงเกิร์ลกรุ๊ป (Girl Group)', genre: 'K-Pop', country: '🇰🇷 เกาหลี' },
  'girls\' generation': { type: 'วงเกิร์ลกรุ๊ป (Girl Group)', genre: 'K-Pop', country: '🇰🇷 เกาหลี' },
  '2ne1': { type: 'วงเกิร์ลกรุ๊ป (Girl Group)', genre: 'K-Pop', country: '🇰🇷 เกาหลี' },

  // K-Pop Boy Groups
  'bts': { type: 'วงบอยแบนด์ (Boy Group)', genre: 'K-Pop', country: '🇰🇷 เกาหลี' },
  'stray kids': { type: 'วงบอยแบนด์ (Boy Group)', genre: 'K-Pop', country: '🇰🇷 เกาหลี' },
  'seventeen': { type: 'วงบอยแบนด์ (Boy Group)', genre: 'K-Pop', country: '🇰🇷 เกาหลี' },
  'bigbang': { type: 'วงบอยแบนด์ (Boy Group)', genre: 'K-Pop', country: '🇰🇷 เกาหลี' },
  'exo': { type: 'วงบอยแบนด์ (Boy Group)', genre: 'K-Pop', country: '🇰🇷 เกาหลี' },
  'txt': { type: 'วงบอยแบนด์ (Boy Group)', genre: 'K-Pop', country: '🇰🇷 เกาหลี' },
  'enhypen': { type: 'วงบอยแบนด์ (Boy Group)', genre: 'K-Pop', country: '🇰🇷 เกาหลี' },
  'ateez': { type: 'วงบอยแบนด์ (Boy Group)', genre: 'K-Pop', country: '🇰🇷 เกาหลี' },
  'riize': { type: 'วงบอยแบนด์ (Boy Group)', genre: 'K-Pop', country: '🇰🇷 เกาหลี' },
  'shinee': { type: 'วงบอยแบนด์ (Boy Group)', genre: 'K-Pop', country: '🇰🇷 เกาหลี' },
  'super junior': { type: 'วงบอยแบนด์ (Boy Group)', genre: 'K-Pop', country: '🇰🇷 เกาหลี' },
  'nct dream': { type: 'วงบอยแบนด์ (Boy Group)', genre: 'K-Pop', country: '🇰🇷 เกาหลี' },
  'nct 127': { type: 'วงบอยแบนด์ (Boy Group)', genre: 'K-Pop', country: '🇰🇷 เกาหลี' },
  'psy': { type: 'เดี่ยวชาย (Male Solo)', genre: 'K-Pop', country: '🇰🇷 เกาหลี' },
  'iu': { type: 'เดี่ยวหญิง (Female Solo)', genre: 'K-Pop', country: '🇰🇷 เกาหลี' },

  // International Artists
  'taylor swift': { type: 'เดี่ยวหญิง (Female Solo)', genre: 'Pop', country: '🌍 สากล' },
  'bruno mars': { type: 'เดี่ยวชาย (Male Solo)', genre: 'Pop / Funk', country: '🌍 สากล' },
  'sabrina carpenter': { type: 'เดี่ยวหญิง (Female Solo)', genre: 'Pop', country: '🌍 สากล' },
  'billie eilish': { type: 'เดี่ยวหญิง (Female Solo)', genre: 'Pop / Alt', country: '🌍 สากล' },
  'ariana grande': { type: 'เดี่ยวหญิง (Female Solo)', genre: 'Pop / R&B', country: '🌍 สากล' },
  'dua lipa': { type: 'เดี่ยวหญิง (Female Solo)', genre: 'Pop / Disco', country: '🌍 สากล' },
  'olivia rodrigo': { type: 'เดี่ยวหญิง (Female Solo)', genre: 'Pop / Rock', country: '🌍 สากล' },
  'lady gaga': { type: 'เดี่ยวหญิง (Female Solo)', genre: 'Pop', country: '🌍 สากล' },
  'ed sheeran': { type: 'เดี่ยวชาย (Male Solo)', genre: 'Pop / Acoustic', country: '🌍 สากล' },
  'justin bieber': { type: 'เดี่ยวชาย (Male Solo)', genre: 'Pop', country: '🌍 สากล' },
  'the weeknd': { type: 'เดี่ยวชาย (Male Solo)', genre: 'R&B / Pop', country: '🌍 สากล' },
  'drake': { type: 'เดี่ยวชาย (Male Solo)', genre: 'Hip-Hop', country: '🌍 สากล' },
  'post malone': { type: 'เดี่ยวชาย (Male Solo)', genre: 'Hip-Hop / Pop', country: '🌍 สากล' },
  'kendrick lamar': { type: 'เดี่ยวชาย (Male Solo)', genre: 'Hip-Hop', country: '🌍 สากล' },
  'coldplay': { type: 'วงดนตรี (Band)', genre: 'Pop / Rock', country: '🌍 สากล' },
  'maroon 5': { type: 'วงดนตรี (Band)', genre: 'Pop / Rock', country: '🌍 สากล' },
  'queen': { type: 'วงดนตรี (Band)', genre: 'Rock', country: '🌍 สากล' },
  'imagine dragons': { type: 'วงดนตรี (Band)', genre: 'Rock / Pop', country: '🌍 สากล' },
  'linkin park': { type: 'วงดนตรี (Band)', genre: 'Rock', country: '🌍 สากล' },
  'onerepublic': { type: 'วงดนตรี (Band)', genre: 'Pop / Rock', country: '🌍 สากล' },

  // J-Pop & Anime
  'yoasobi': { type: 'ดูโอ้ (Duo)', genre: 'J-Pop / Anime', country: '🇯🇵 ญี่ปุ่น' },
  'lisa': { type: 'เดี่ยวหญิง (Female Solo)', genre: 'J-Pop / Anime', country: '🇯🇵 ญี่ปุ่น' },
  'aimer': { type: 'เดี่ยวหญิง (Female Solo)', genre: 'J-Pop / Anime', country: '🇯🇵 ญี่ปุ่น' },
  'kenshi yonezu': { type: 'เดี่ยวชาย (Male Solo)', genre: 'J-Pop / Anime', country: '🇯🇵 ญี่ปุ่น' },
  'official hige dandism': { type: 'วงดนตรี (Band)', genre: 'J-Pop / Anime', country: '🇯🇵 ญี่ปุ่น' },
  'radwimps': { type: 'วงดนตรี (Band)', genre: 'J-Pop / Rock', country: '🇯🇵 ญี่ปุ่น' },
  'fujii kaze': { type: 'เดี่ยวชาย (Male Solo)', genre: 'J-Pop', country: '🇯🇵 ญี่ปุ่น' },
  'aimyon': { type: 'เดี่ยวหญิง (Female Solo)', genre: 'J-Pop', country: '🇯🇵 ญี่ปุ่น' },
  'yuuri': { type: 'เดี่ยวชาย (Male Solo)', genre: 'J-Pop', country: '🇯🇵 ญี่ปุ่น' },
  'creepy nuts': { type: 'ดูโอ้ (Duo)', genre: 'Hip-Hop / Anime', country: '🇯🇵 ญี่ปุ่น' },
  'mrs. green apple': { type: 'วงดนตรี (Band)', genre: 'J-Pop / Rock', country: '🇯🇵 ญี่ปุ่น' },
  'king gnu': { type: 'วงดนตรี (Band)', genre: 'J-Pop / Rock', country: '🇯🇵 ญี่ปุ่น' },
  'eve': { type: 'เดี่ยวชาย (Male Solo)', genre: 'J-Pop / Anime', country: '🇯🇵 ญี่ปุ่น' }
};

// Fallback classifier if artist not in manual dictionary
function getArtistMetadata(artistName = '', mainId = 'mix') {
  const norm = artistName.toLowerCase().trim();
  for (const [k, meta] of Object.entries(ARTIST_METADATA)) {
    if (norm === k || norm.includes(k) || k.includes(norm)) {
      return { ...meta };
    }
  }

  // Heuristics based on mainId
  let country = '🇹🇭 ไทย';
  let genre = 'Pop';
  let type = 'เดี่ยวชาย (Male Solo)';

  if (mainId === 'kpop' || norm.includes('kpop')) {
    country = '🇰🇷 เกาหลี';
    genre = 'K-Pop';
    type = 'วงเกิร์ลกรุ๊ป (Girl Group)';
  } else if (mainId === 'inter') {
    country = '🌍 สากล';
    genre = 'Pop';
    type = 'เดี่ยวหญิง (Female Solo)';
  } else if (mainId === 'anime') {
    country = '🇯🇵 ญี่ปุ่น';
    genre = 'J-Pop / Anime';
    type = 'วงดนตรี (Band)';
  } else if (mainId === 'thai') {
    country = '🇹🇭 ไทย';
    genre = 'Thai Pop';
    type = 'วงดนตรี (Band)';
  }

  return { type, genre, country };
}

// Curated Verified Music Videos (90+ real 1080p preview videos across Thai, K-Pop, Pop, J-Pop)
const CURATED_MUSIC_VIDEOS = require('./curatedMVs.json');

// Comprehensive Preloaded Catalog (150+ iconic songs across Thai, K-Pop, Inter, Anime)
let COMPREHENSIVE_CATALOG = [];
try {
  COMPREHENSIVE_CATALOG = require('./comprehensiveCatalog.json');
} catch (e) {
  COMPREHENSIVE_CATALOG = [];
}

// In-Memory Catalog for Songdle and Heardle
let enrichedCatalog = [];

function buildSongdleCatalog(tracks = []) {
  const map = new Map();

  // Helper to register track into catalog map
  function registerTrack(t) {
    if (!t || !t.title || !t.artist) return;
    const cleanTitle = t.title.trim();
    const cleanArtist = t.artist.trim();
    const id = t.id || `${cleanArtist}_${cleanTitle}`.toLowerCase().replace(/[\s\-_.,'"!?:;()\[\]]/g, '');

    if (!map.has(id)) {
      const meta = getArtistMetadata(cleanArtist, t.mainId);
      const year = t.year || (t.releaseDate ? parseInt(t.releaseDate.substring(0, 4), 10) : 2021);

      map.set(id, {
        id,
        title: cleanTitle,
        artist: cleanArtist,
        album: t.album || '',
        artwork: t.artwork || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
        previewUrl: t.previewUrl || '',
        artistType: t.artistType || meta.type,
        genre: t.genre || meta.genre,
        country: t.country || meta.country,
        year: year || 2021,
        displayText: t.displayText || `${cleanTitle} - ${cleanArtist}`
      });
    }
  }

  // 1. Process custom tracks (e.g. from seedData)
  for (const t of tracks) registerTrack(t);

  // 2. Process comprehensive catalog
  for (const t of COMPREHENSIVE_CATALOG) registerTrack(t);

  // 3. Process curated MVs as guessable items
  for (const mv of CURATED_MUSIC_VIDEOS) registerTrack(mv);

  enrichedCatalog = Array.from(map.values());
  return enrichedCatalog;
}

// Compare a Songdle guess against the secret track
function compareSongdleGuess(targetTrack, guessTrack) {
  if (!targetTrack || !guessTrack) return null;

  const isTitleMatch = targetTrack.title.toLowerCase().trim() === guessTrack.title.toLowerCase().trim();
  const isArtistExact = targetTrack.artist.toLowerCase().trim() === guessTrack.artist.toLowerCase().trim();

  // Artist comparison: Green = exact, Orange = partial name / same origin/country, Red = different
  let artistStatus = 'red';
  if (isArtistExact) {
    artistStatus = 'green';
  } else if (
    targetTrack.artist.toLowerCase().includes(guessTrack.artist.toLowerCase()) ||
    guessTrack.artist.toLowerCase().includes(targetTrack.artist.toLowerCase()) ||
    targetTrack.country === guessTrack.country
  ) {
    artistStatus = 'orange';
  }

  // Artist Type comparison
  const typeStatus = targetTrack.artistType === guessTrack.artistType ? 'green' : 'red';

  // Genre comparison: Green = match, Orange = overlapping (e.g. Pop vs T-Pop, or Rock vs Pop/Rock)
  let genreStatus = 'red';
  if (targetTrack.genre === guessTrack.genre) {
    genreStatus = 'green';
  } else if (
    targetTrack.genre.toLowerCase().includes(guessTrack.genre.toLowerCase()) ||
    guessTrack.genre.toLowerCase().includes(targetTrack.genre.toLowerCase()) ||
    (targetTrack.genre.includes('Pop') && guessTrack.genre.includes('Pop')) ||
    (targetTrack.genre.includes('Rock') && guessTrack.genre.includes('Rock'))
  ) {
    genreStatus = 'orange';
  }

  // Country comparison
  const countryStatus = targetTrack.country === guessTrack.country ? 'green' : 'red';

  // Release Year comparison
  let yearStatus = 'red';
  let yearDirection = 'equal';
  if (targetTrack.year === guessTrack.year) {
    yearStatus = 'green';
    yearDirection = 'equal';
  } else if (targetTrack.year > guessTrack.year) {
    // Secret is newer/higher
    yearDirection = 'up';
  } else {
    // Secret is older/lower
    yearDirection = 'down';
  }

  const isVictory = isTitleMatch && isArtistExact;

  return {
    song: { value: guessTrack.title, artwork: guessTrack.artwork, status: isTitleMatch ? 'green' : 'red' },
    artist: { value: guessTrack.artist, status: artistStatus },
    artistType: { value: guessTrack.artistType, status: typeStatus },
    genre: { value: guessTrack.genre, status: genreStatus },
    country: { value: guessTrack.country, status: countryStatus },
    year: { value: guessTrack.year, status: yearStatus, direction: yearDirection },
    isVictory
  };
}

// In-Memory Sessions for Songdle
const songdleSessions = new Map();

function createSongdleSession(category) {
  let pool = enrichedCatalog;
  if (category && category !== 'mix' && category !== 'all') {
    pool = enrichedCatalog.filter(t => {
      const g = (t.genre || '').toLowerCase();
      const c = (t.country || '').toLowerCase();
      return g.includes(category.toLowerCase()) || c.includes(category.toLowerCase());
    });
  }
  if (!pool || pool.length === 0) pool = enrichedCatalog;

  const target = pool[Math.floor(Math.random() * pool.length)];
  const token = 's_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
  songdleSessions.set(token, {
    target,
    createdAt: Date.now()
  });

  // Clean old sessions (> 2 hours)
  if (songdleSessions.size > 200) {
    const expireTime = Date.now() - 7200000;
    for (const [k, v] of songdleSessions.entries()) {
      if (v.createdAt < expireTime) songdleSessions.delete(k);
    }
  }

  return {
    token,
    candidateSongs: enrichedCatalog.map(c => ({
      id: c.id,
      title: c.title,
      artist: c.artist,
      displayText: c.displayText,
      artwork: c.artwork,
      year: c.year
    }))
  };
}

function evaluateSongdleGuess(token, guessId) {
  const session = songdleSessions.get(token);
  if (!session) {
    return { error: 'SESSION_EXPIRED', message: 'รอบการเล่นหมดอายุ กรุณาเริ่มเกมใหม่' };
  }

  const rawClean = (guessId || '').trim().toLowerCase();
  let guessTrack = enrichedCatalog.find(t => t.id === guessId) ||
    enrichedCatalog.find(t => (t.displayText || '').toLowerCase() === rawClean) ||
    enrichedCatalog.find(t => (t.title || '').toLowerCase() === rawClean);

  if (!guessTrack) {
    guessTrack = enrichedCatalog.find(t =>
      (t.displayText || '').toLowerCase().includes(rawClean) ||
      (t.title || '').toLowerCase().includes(rawClean) ||
      (t.artist || '').toLowerCase().includes(rawClean)
    );
  }

  // Graceful fallback track: NEVER block user from guessing even if not pre-indexed!
  if (!guessTrack) {
    const parts = (guessId || '').split(/[-–—]/);
    const title = (parts[0] || guessId || 'เพลงปริศนา').trim();
    const artist = (parts[1] || 'ศิลปิน').trim();
    guessTrack = {
      id: `custom_${Date.now()}`,
      title,
      artist,
      album: 'เพลงที่ค้นหา',
      artwork: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
      previewUrl: '',
      artistType: 'ศิลปินเดี่ยว',
      genre: 'Pop',
      country: 'สากล',
      year: 2020,
      displayText: `${title} - ${artist}`
    };
  }

  const comparison = compareSongdleGuess(session.target, guessTrack);
  if (comparison.isVictory) {
    comparison.fullTrack = {
      title: session.target.title,
      artist: session.target.artist,
      album: session.target.album,
      artwork: session.target.artwork,
      previewUrl: session.target.previewUrl,
      year: session.target.year
    };
  }

  return comparison;
}

function surrenderSongdle(token) {
  const session = songdleSessions.get(token);
  if (!session) {
    return { error: 'SESSION_EXPIRED', message: 'รอบการเล่นหมดอายุ กรุณาเริ่มเกมใหม่' };
  }
  return {
    isSurrendered: true,
    fullTrack: {
      title: session.target.title,
      artist: session.target.artist,
      album: session.target.album,
      artwork: session.target.artwork,
      previewUrl: session.target.previewUrl,
      year: session.target.year
    }
  };
}

// Random Heardle track provider
function getRandomHeardleTrack(category) {
  let pool = enrichedCatalog.filter(t => t.previewUrl && t.previewUrl.startsWith('http'));
  if (category && category !== 'mix' && category !== 'all') {
    const filtered = pool.filter(t => {
      const g = (t.genre || '').toLowerCase();
      const c = (t.country || '').toLowerCase();
      return g.includes(category.toLowerCase()) || c.includes(category.toLowerCase());
    });
    if (filtered.length > 0) pool = filtered;
  }
  if (pool.length === 0) pool = enrichedCatalog;

  const track = pool[Math.floor(Math.random() * pool.length)];
  return {
    track: {
      id: track.id,
      title: track.title,
      artist: track.artist,
      album: track.album,
      artwork: track.artwork,
      previewUrl: track.previewUrl,
      year: track.year
    },
    candidateSongs: enrichedCatalog.map(c => ({
      id: c.id,
      title: c.title,
      artist: c.artist,
      displayText: c.displayText
    }))
  };
}

// Random Music Video provider
function getRandomMusicVideo(category, excludeIds = []) {
  let pool = CURATED_MUSIC_VIDEOS;
  if (category && category !== 'mix' && category !== 'all') {
    const filtered = pool.filter(m => {
      const g = (m.genre || '').toLowerCase();
      const c = (m.country || '').toLowerCase();
      return g.includes(category.toLowerCase()) || c.includes(category.toLowerCase());
    });
    if (filtered.length > 0) pool = filtered;
  }

  const excludeSet = new Set(Array.isArray(excludeIds) ? excludeIds : (typeof excludeIds === 'string' ? excludeIds.split(',') : []));
  let available = pool.filter(m => !excludeSet.has(m.id));
  if (available.length === 0) available = pool;

  const mv = available[Math.floor(Math.random() * available.length)];
  return {
    video: {
      id: mv.id,
      title: mv.title,
      artist: mv.artist,
      album: mv.album,
      year: mv.year,
      artwork: mv.artwork,
      previewUrl: mv.previewUrl
    },
    candidateSongs: pool.concat(enrichedCatalog.slice(0, 50)).map(c => ({
      id: c.id,
      title: c.title,
      artist: c.artist,
      displayText: `${c.title} - ${c.artist}`
    }))
  };
}

// Check MV Guess
function checkMusicVideoGuess(mvId, typed) {
  const mv = CURATED_MUSIC_VIDEOS.find(m => m.id === mvId);
  if (!mv) {
    return { isCorrect: false };
  }

  const clean = s => (s || '').toLowerCase().replace(/[\s\-_.,'"!?:;()\[\]]/g, '');
  const t = clean(typed);
  const title = clean(mv.title);
  const artist = clean(mv.artist);
  const combo1 = clean(`${mv.title}${mv.artist}`);
  const combo2 = clean(`${mv.artist}${mv.title}`);

  const isCorrect = (
    t === title ||
    t === artist ||
    t === combo1 ||
    t === combo2 ||
    (t.length >= 4 && (title.includes(t) || combo1.includes(t)))
  );

  return {
    isCorrect,
    trackInfo: {
      title: mv.title,
      artist: mv.artist,
      album: mv.album,
      year: mv.year,
      artwork: mv.artwork,
      previewUrl: mv.previewUrl
    }
  };
}

module.exports = {
  ARTIST_METADATA,
  CURATED_MUSIC_VIDEOS,
  getArtistMetadata,
  buildSongdleCatalog,
  compareSongdleGuess,
  createSongdleSession,
  evaluateSongdleGuess,
  surrenderSongdle,
  getRandomHeardleTrack,
  getRandomMusicVideo,
  checkMusicVideoGuess,
  getEnrichedCatalog: () => enrichedCatalog
};
