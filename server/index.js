const express = require('express');
const http = require('http');
const path = require('path');
const os = require('os');
const { Server } = require('socket.io');
const QRCode = require('qrcode');
const { MAIN_CATEGORIES, ALL_SUBCATEGORIES, generateQuizQuestions } = require('./musicService');
const { unifiedMusicSearch, searchAutocomplete } = require('./searchService');
const {
  buildSongdleCatalog,
  compareSongdleGuess,
  createSongdleSession,
  evaluateSongdleGuess,
  surrenderSongdle,
  getRandomHeardleTrack,
  getRandomMusicVideo,
  checkMusicVideoGuess,
  getEnrichedCatalog,
  getArtistMetadata,
  CURATED_MUSIC_VIDEOS
} = require('./gameModesService');
const seedData = require('./seedData.json');

// Initialize catalog for Songdle and Heardle on startup
buildSongdleCatalog(Object.values(seedData).flat());

// --- Songdle Mode Helper Functions ---
function buildSongdleHints(target) {
  if (!target) return [];
  const cleanTitle = (target.title || '').trim();
  const firstLetter = cleanTitle.charAt(0) || '?';
  const charCount = cleanTitle.length;

  return [
    {
      index: 1,
      id: 'artistType',
      title: 'ประเภทศิลปิน (Artist Type)',
      icon: '🏷️',
      value: target.artistType || 'ศิลปินเดี่ยว'
    },
    {
      index: 2,
      id: 'country',
      title: 'สัญชาติ / แหล่งกำเนิด (Origin)',
      icon: '🌍',
      value: target.country || 'สากล'
    },
    {
      index: 3,
      id: 'genre',
      title: 'หมวดหมู่ / แนวเพลง (Genre)',
      icon: '🎼',
      value: target.genre || 'Pop'
    },
    {
      index: 4,
      id: 'year',
      title: 'ปีที่ปล่อยเพลง (Release Year)',
      icon: '📅',
      value: target.year ? `ปล่อยปี ค.ศ. ${target.year}` : 'ไม่ระบุปี'
    },
    {
      index: 5,
      id: 'titleAudio',
      title: 'คำใบ้ชื่อเพลง & ตัวอย่างเสียง (Title & Audio)',
      icon: '🎵',
      value: `ชื่อเพลงขึ้นต้นด้วย "${firstLetter}..." (${charCount} ตัวอักษร)`,
      previewUrl: target.previewUrl || ''
    }
  ];
}

function sanitizeSongdleState(songdleState, room, isRevealed = false) {
  if (!songdleState) return null;
  const target = songdleState.target;
  const isOver = isRevealed || songdleState.status === 'won' || songdleState.status === 'lost';

  const hints = (songdleState.hints || []).map((h, i) => {
    const isUnlocked = isOver || (i < songdleState.unlockedHintCount);
    return {
      index: i + 1,
      id: h.id,
      title: h.title,
      icon: h.icon,
      isUnlocked,
      value: isUnlocked ? h.value : `คำใบ้ที่ ${i + 1} (ตอบผิดเพื่อปลดล็อค)`,
      previewUrl: isUnlocked ? h.previewUrl : null
    };
  });

  const playerList = (songdleState.turnOrder || [])
    .filter(pid => room.players.has(pid))
    .map(pid => {
      const p = room.players.get(pid);
      return { id: pid, name: p ? p.name : 'ผู้เล่น', avatar: p ? p.avatar : '🎧' };
    });

  const activePlayer = playerList.length > 0
    ? playerList[songdleState.currentTurnIndex % playerList.length]
    : null;

  return {
    hints,
    unlockedHintCount: songdleState.unlockedHintCount,
    maxHints: 5,
    guesses: songdleState.guesses || [],
    turnOrder: playerList,
    activePlayer,
    isSinglePlayer: playerList.length <= 1,
    status: songdleState.status,
    winner: songdleState.winner,
    fullTrack: isOver && target ? {
      title: target.title,
      artist: target.artist,
      album: target.album,
      artwork: target.artwork,
      previewUrl: target.previewUrl,
      year: target.year,
      genre: target.genre,
      country: target.country,
      artistType: target.artistType
    } : null
  };
}

// --- Music Video (MV) Mode Helper Functions ---
const MV_SNIPPET_DURATIONS = [1.5, 3.0, 5.0, 9.0, 16.0, 30.0];

function sanitizeMvState(mvState, room, isRevealed = false) {
  if (!mvState) return null;
  const isOver = isRevealed || mvState.status === 'won' || mvState.status === 'lost';
  const target = mvState.target;

  const playerList = (mvState.turnOrder || [])
    .filter(pid => room.players.has(pid))
    .map(pid => {
      const p = room.players.get(pid);
      return { id: pid, name: p ? p.name : 'ผู้เล่น', avatar: p ? p.avatar : '🎧' };
    });

  const activePlayer = playerList.length > 0
    ? playerList[mvState.currentTurnIndex % playerList.length]
    : null;

  const currentLevel = Math.min(mvState.unlockedLevel, mvState.maxLevel);
  const allowedSeconds = MV_SNIPPET_DURATIONS[currentLevel];

  return {
    unlockedLevel: currentLevel,
    maxLevel: mvState.maxLevel,
    allowedSeconds,
    history: mvState.history || [],
    turnOrder: playerList,
    activePlayer,
    isSinglePlayer: playerList.length <= 1,
    status: mvState.status,
    winner: mvState.winner,
    videoUrl: target.videoUrl,
    fullTrack: isOver && target ? {
      title: target.title,
      artist: target.artist,
      album: target.album,
      artwork: target.artwork,
      year: target.year,
      genre: target.genre,
      country: target.country,
      videoUrl: target.videoUrl
    } : null,
    solution: isOver && target ? {
      title: target.title,
      artist: target.artist,
      album: target.album,
      artwork: target.artwork,
      year: target.year,
      genre: target.genre,
      country: target.country,
      videoUrl: target.videoUrl
    } : null
  };
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const PORT = parseInt(process.env.PORT, 10) || 3000;
let currentServerPort = PORT;

process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Unhandled Rejection]', reason);
});

// --- Security & Input Sanitization Helpers ---
function sanitizeInput(str, maxLen = 18) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/<[^>]*>?/gm, '') // Strip HTML tags to eliminate XSS
    .replace(/[\x00-\x1F\x7F]/g, '') // Strip control characters
    .trim()
    .slice(0, maxLen);
}

function isValidRoomCode(code) {
  return typeof code === 'string' && /^[A-Za-z0-9]{4,8}$/.test(code.trim());
}

const ALLOWED_AVATARS = new Set(['🎧', '🎸', '🎤', '🎷', '🥁', '🎹', '🕶️', '🕺', '💃', '🐱', '🦊', '🦄', '👑', '🚀', '⚡', '🌟']);

// =========================================================================
// ENTERPRISE SECURITY & ANTI-TAMPERING SUITE (Anti-XSS, Anti-Phishing, CSP)
// =========================================================================

// 1. Disable server fingerprinting
app.disable('x-powered-by');

// 2. Comprehensive Security Headers & Content Security Policy (CSP)
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  // Content Security Policy: Strict whitelist to block rogue scripts, malware domains, or iframe hijacks
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: https://* blob:",
    "media-src 'self' https://* blob:",
    "connect-src 'self' ws: wss: https://* http://localhost:* http://127.0.0.1:*",
    "frame-ancestors 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; '));
  next();
});

// Enable reverse proxy support (e.g. Render, Cloudflare)
app.set('trust proxy', 1);

// 3. In-Memory Anti-DDoS & Rate Limiter Middleware
const requestCounts = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 300; // Increased to 300 to allow smooth live autocomplete typing

app.use('/api', (req, res, next) => {
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const clientData = requestCounts.get(clientIp) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };

  if (now > clientData.resetAt) {
    clientData.count = 0;
    clientData.resetAt = now + RATE_LIMIT_WINDOW_MS;
  }

  clientData.count++;
  requestCounts.set(clientIp, clientData);

  if (clientData.count > MAX_REQUESTS_PER_WINDOW) {
    return res.status(429).json({
      error: 'Security Alert: Rate limit exceeded. Please wait a moment.'
    });
  }
  next();
});

// Stale rate limit cleanup
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of requestCounts.entries()) {
    if (now > data.resetAt + 60000) {
      requestCounts.delete(ip);
    }
  }
}, 5 * 60 * 1000);

// Middleware & static files
app.use(express.json({ limit: '50kb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

// Detect local network IPv4 address for phones on the same Wi-Fi
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const localIP = getLocalIP();

// --- HTTP API Endpoints ---
app.get('/api/info', (req, res) => {
  res.json({
    port: currentServerPort,
    localIP,
    mainCategories: MAIN_CATEGORIES,
    allSubcategories: ALL_SUBCATEGORIES
  });
});

app.get('/api/qr', async (req, res) => {
  const rawText = req.query.text;
  if (!rawText || typeof rawText !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid text parameter' });
  }

  // Anti-URL Tampering & Phishing Filter:
  // Strictly enforce that the QR code link MUST target this application's own origin or local network IP
  let isLegitUrl = false;
  try {
    const parsed = new URL(rawText, `http://${req.headers.host || 'localhost'}`);
    const host = parsed.host;
    const reqHost = req.headers.host;

    const isSelfDomain = (host === reqHost) ||
                         (host.startsWith('localhost')) ||
                         (host.startsWith('127.0.0.1')) ||
                         (localIP && host.includes(localIP)) ||
                         (host.endsWith('.onrender.com'));

    // Validate that the path is solely a room invitation with alphanumeric code
    if (isSelfDomain && parsed.pathname === '/') {
      const roomParam = parsed.searchParams.get('room') || parsed.searchParams.get('join') || '';
      if (/^[A-Za-z0-9]{4,8}$/.test(roomParam)) {
        isLegitUrl = true;
      }
    }
  } catch (err) {
    isLegitUrl = false;
  }

  if (!isLegitUrl) {
    return res.status(403).json({
      error: 'Security Warning: Destination link has been tampered with or is not authorized.'
    });
  }

  try {
    const dataUrl = await QRCode.toDataURL(rawText, {
      margin: 2,
      width: 260,
      color: {
        dark: '#1e1b4b',
        light: '#ffffff'
      }
    });
    res.json({ dataUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Search API (Unified MusicBrainz + iTunes)
app.get('/api/search', async (req, res) => {
  const query = (req.query.q || req.query.query || '').trim();
  const country = (req.query.country || 'TH').trim().toUpperCase();

  if (!query) {
    return res.status(400).json({ error: 'กรุณาระบุคำค้นหา (Missing query parameter "q")' });
  }

  try {
    const data = await unifiedMusicSearch(query, country);
    res.json(data);
  } catch (err) {
    console.error('[API /api/search Error]:', err.message);
    res.status(500).json({
      error: 'เกิดข้อผิดพลาดในการค้นหาเพลง',
      message: err.message
    });
  }
});

// Fast Autocomplete Live Search API (Local First + iTunes fallback)
app.get('/api/autocomplete', async (req, res) => {
  const query = (req.query.q || req.query.term || req.query.query || '').trim();
  if (!query || query.length < 1) {
    return res.json({ results: [] });
  }

  try {
    const results = await searchAutocomplete(query, 12);
    res.json({ results });
  } catch (err) {
    console.warn('[API /api/autocomplete Error]:', err.message);
    res.json({ results: [] });
  }
});

// 2. Songdle API: Surrender and reveal secret track
app.post('/api/games/songdle/surrender', (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Missing token' });
  try {
    const result = surrenderSongdle(token);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Mini Games HTTP APIs ---

// 1. Heardle API: Random track with preview audio
app.get('/api/games/heardle/random', (req, res) => {
  try {
    const data = getRandomHeardleTrack(req.query.category);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Songdle API (LoLdle Music): Start new game session
app.get('/api/games/songdle/new', (req, res) => {
  try {
    const session = createSongdleSession(req.query.category);
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Songdle API: Evaluate guess against mystery song
app.post('/api/games/songdle/guess', (req, res) => {
  const { token, guessId } = req.body;
  if (!token || !guessId) {
    return res.status(400).json({ error: 'Missing token or guessId' });
  }
  try {
    const result = evaluateSongdleGuess(token, guessId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Music Video API: Random music video
app.get('/api/games/mv/random', (req, res) => {
  try {
    const data = getRandomMusicVideo(req.query.category, req.query.exclude);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Music Video API: Check typed guess
app.post('/api/games/mv/check', (req, res) => {
  const { mvId, typedAnswer } = req.body;
  try {
    const result = checkMusicVideoGuess(mvId, typedAnswer);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- In-Memory Room Storage ---
const rooms = new Map();

// Helper to clean strings for fuzzy matching in typing mode
function cleanFuzzyString(s) {
  if (!s) return '';
  return s.toLowerCase().replace(/[\s\-_.,'"!?:;()\[\]]/g, '');
}

function isTypingAnswerCorrect(typed, correctTitle, correctArtist) {
  if (!typed || typeof typed !== 'string') return false;
  const t = cleanFuzzyString(typed);
  const title = cleanFuzzyString(correctTitle);
  const artist = cleanFuzzyString(correctArtist);
  const combo1 = cleanFuzzyString(`${correctTitle}${correctArtist}`);
  const combo2 = cleanFuzzyString(`${correctArtist}${correctTitle}`);

  if (!t) return false;
  if (t === title || t === artist || t === combo1 || t === combo2) return true;
  // If typed answer matches the beginning or is a strong substring of title
  if (title.length >= 3 && (title.includes(t) || t.includes(title))) return true;
  // If typed answer matches combos
  if (combo1.length >= 4 && (combo1.includes(t) || t.includes(combo1))) return true;
  if (combo2.length >= 4 && (combo2.includes(t) || t.includes(combo2))) return true;
  // If typed answer matches the artist alone (do not match if t contains an unrelated song title)
  if (artist.length >= 3 && artist.includes(t)) return true;
  return false;
}

// Generate short, unique 5-character room code
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  if (rooms.has(code)) return generateRoomCode();
  return code;
}

// Get sorted leaderboard
function getLeaderboard(room) {
  const isSurvival = room && room.settings && room.settings.gameMode === 'survival';
  return Array.from(room.players.values())
    .map(p => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      score: p.score,
      streak: p.streak,
      isHost: p.id === room.hostId,
      answered: p.answered,
      answerIndex: p.answerIndex,
      typedAnswer: p.typedAnswer,
      hasSkipped: p.hasSkipped,
      pointsEarned: p.pointsEarned || 0,
      lives: p.lives !== undefined ? p.lives : 3,
      isEliminated: !!p.isEliminated
    }))
    .sort((a, b) => {
      if (isSurvival) {
        if (a.isEliminated !== b.isEliminated) {
          return a.isEliminated ? 1 : -1;
        }
        if (b.lives !== a.lives) {
          return b.lives - a.lives;
        }
      }
      return b.score - a.score;
    })
    .map((p, index) => ({ ...p, rank: index + 1 }));
}

// --- Socket.IO Real-Time Engine ---
io.on('connection', (socket) => {
  console.log(`[Socket Connected] ID: ${socket.id}`);

  // Create Room
  socket.on('create_room', async ({ name, avatar, settings }) => {
    try {
      const roomCode = generateRoomCode();
      const sanitizedName = sanitizeInput(name, 18) || 'หัวหน้าห้อง';
      const sanitizedAvatar = ALLOWED_AVATARS.has(avatar) ? avatar : '👑';
      const hostPlayer = {
        id: socket.id,
        name: sanitizedName,
        avatar: sanitizedAvatar,
        score: 0,
        streak: 0,
        answered: false,
        answerIndex: null,
        typedAnswer: '',
        hasSkipped: false,
        pointsEarned: 0,
        lives: 3,
        isEliminated: false
      };

      const room = {
        code: roomCode,
        hostId: socket.id,
        state: 'lobby', // lobby | starting | quiz | reveal | podium
        settings: {
          gameMode: settings?.gameMode || 'choices', // choices | typing | mixed | year | survival
          questionTarget: settings?.questionTarget || 'mixed', // title | artist | mixed
          categories: settings?.categories || ['mix'],
          questionCount: parseInt(settings?.questionCount, 10) || 10,
          timePerRound: parseInt(settings?.timePerRound, 10) || 20
        },
        players: new Map([[socket.id, hostPlayer]]),
        questions: [],
        candidateSongs: [],
        currentQuestionIndex: -1,
        roundStartTime: 0,
        roundTimeout: null,
        autoAdvanceTimeout: null
      };

      rooms.set(roomCode, room);
      socket.join(roomCode);
      socket.roomCode = roomCode;

      socket.emit('room_created', {
        roomCode,
        settings: room.settings,
        player: { ...hostPlayer, isHost: true },
        players: [hostPlayer],
        localIP,
        port: currentServerPort
      });

      console.log(`[Room ${roomCode}] Created by ${hostPlayer.name} (Socket ${socket.id})`);
    } catch (err) {
      console.error('Error creating room:', err);
      socket.emit('error_message', 'ไม่สามารถสร้างห้องได้ กรุณาลองใหม่อีกครั้ง');
    }
  });

  // Join Room
  socket.on('join_room', ({ roomCode, name, avatar }) => {
    const code = (roomCode || '').trim().toUpperCase();
    if (!isValidRoomCode(code)) {
      return socket.emit('error_message', 'รหัสห้องไม่ถูกต้อง กรุณาตรวจสอบรหัสอีกครั้ง');
    }

    const room = rooms.get(code);

    if (!room) {
      return socket.emit('error_message', `ไม่พบห้องรหัส "${code}" กรุณาตรวจสอบรหัสอีกครั้ง`);
    }

    if (room.state !== 'lobby') {
      return socket.emit('error_message', 'ห้องนี้กำลังเล่นอยู่ ไม่สามารถเข้าร่วมได้ในขณะนี้');
    }

    let finalName = sanitizeInput(name, 18) || 'ผู้เล่น';
    const isNameTaken = Array.from(room.players.values()).some(p => p.name.toLowerCase() === finalName.toLowerCase());
    if (isNameTaken) {
      finalName += ` #${Math.floor(10 + Math.random() * 89)}`;
    }

    const sanitizedAvatar = ALLOWED_AVATARS.has(avatar) ? avatar : '🎧';

    const player = {
      id: socket.id,
      name: finalName,
      avatar: sanitizedAvatar,
      score: 0,
      streak: 0,
      answered: false,
      answerIndex: null,
      typedAnswer: '',
      hasSkipped: false,
      pointsEarned: 0,
      lives: 3,
      isEliminated: false
    };

    room.players.set(socket.id, player);
    socket.join(code);
    socket.roomCode = code;

    socket.emit('room_joined', {
      roomCode: code,
      settings: room.settings,
      player: { ...player, isHost: false },
      players: Array.from(room.players.values()).map(p => ({ ...p, isHost: p.id === room.hostId })),
      localIP,
      port: currentServerPort
    });

    // Broadcast updated player list to room
    io.to(code).emit('player_list_updated', {
      players: Array.from(room.players.values()).map(p => ({ ...p, isHost: p.id === room.hostId })),
      joinedPlayer: player
    });

    console.log(`[Room ${code}] ${player.name} joined. Total: ${room.players.size}`);
  });

  // Update room settings (Host only)
  socket.on('update_settings', ({ settings }) => {
    const room = rooms.get(socket.roomCode);
    if (!room || room.hostId !== socket.id || room.state !== 'lobby') return;

    if (settings.gameMode) room.settings.gameMode = settings.gameMode;
    if (settings.questionTarget) room.settings.questionTarget = settings.questionTarget;
    if (settings.categories) room.settings.categories = settings.categories;
    if (settings.questionCount) room.settings.questionCount = parseInt(settings.questionCount, 10);
    if (settings.timePerRound) room.settings.timePerRound = parseInt(settings.timePerRound, 10);

    io.to(room.code).emit('settings_updated', room.settings);
  });

  // Update Player Profile (Name & Avatar)
  socket.on('update_profile', ({ name, avatar }) => {
    const room = rooms.get(socket.roomCode);
    if (!room) return;
    if (room.state !== 'lobby') {
      socket.emit('toast', { type: 'warning', message: '⚠️ ไม่สามารถแก้ไขชื่อหรืออวาตาร์ขณะกำลังเล่นเกมได้' });
      return;
    }

    const player = room.players.get(socket.id);
    if (!player) return;

    const trimmedName = sanitizeInput(name, 18);
    if (trimmedName) {
      player.name = trimmedName;
    }
    if (avatar && ALLOWED_AVATARS.has(avatar)) {
      player.avatar = avatar;
    }

    console.log(`[Room ${room.code}] Player ${socket.id} updated profile: Name="${player.name}", Avatar="${player.avatar}"`);

    // Broadcast updated player list to room
    io.to(room.code).emit('player_list_updated', {
      players: Array.from(room.players.values()).map(p => ({ ...p, isHost: p.id === room.hostId })),
      updatedPlayer: player
    });
  });

  // Start game (Host only)
  socket.on('start_game', async () => {
    const room = rooms.get(socket.roomCode);
    if (!room || room.hostId !== socket.id) return;
    if (room.state !== 'lobby' && room.state !== 'podium') return;

    room.state = 'starting';
    io.to(room.code).emit('game_starting', { countdownSeconds: 3 });

    try {
      console.log(`[Room ${room.code}] Generating questions. Mode: ${room.settings.gameMode}, Target: ${room.settings.questionTarget}, Cats:`, room.settings.categories);
      const { questions, candidateSongs } = await generateQuizQuestions(
        room.settings.categories,
        room.settings.questionCount,
        room.settings.gameMode,
        room.settings.questionTarget
      );

      if (!questions || questions.length === 0) {
        throw new Error('ไม่พบข้อมูลเพลง');
      }

      room.questions = questions;
      room.candidateSongs = candidateSongs || [];
      room.currentQuestionIndex = -1;

      // Reset players
      for (const player of room.players.values()) {
        player.score = 0;
        player.streak = 0;
        player.answered = false;
        player.answerIndex = null;
        player.typedAnswer = '';
        player.hasSkipped = false;
        player.pointsEarned = 0;
        player.lives = 3;
        player.isEliminated = false;
      }

      // 3s start countdown
      setTimeout(() => {
        if (!rooms.has(room.code)) return;
        startNextRound(room);
      }, 3000);
    } catch (err) {
      console.error(`[Room ${room.code}] Question load failed:`, err.message);
      room.state = 'lobby';
      io.to(room.code).emit('error_message', 'ไม่สามารถโหลดเพลงจาก API ได้ กรุณาลองใหม่อีกครั้ง');
    }
  });

  // Start next round
  function startNextRound(room) {
    if (!rooms.has(room.code)) return;
    if (room.autoAdvanceTimeout) clearTimeout(room.autoAdvanceTimeout);

    room.currentQuestionIndex++;
    if (room.currentQuestionIndex >= room.questions.length) {
      return endGame(room);
    }

    if (room.settings && room.settings.gameMode === 'survival') {
      const alivePlayers = Array.from(room.players.values()).filter(p => !p.isEliminated);
      if (room.players.size >= 2 && alivePlayers.length <= 1) {
        return endGame(room);
      } else if (alivePlayers.length === 0) {
        return endGame(room);
      }
    }

    const q = room.questions[room.currentQuestionIndex];
    room.state = 'quiz';
    room.roundStartTime = Date.now();

    // Reset player answers
    for (const player of room.players.values()) {
      player.answered = false;
      player.answerIndex = null;
      player.typedAnswer = '';
      player.hasSkipped = false;
      player.pointsEarned = 0;
      player.songdleGuesses = [];
      player.heardleAttempts = [];
      player.mvAttempts = [];
    }

    if (q.mode === 'songdle') {
      const hints = buildSongdleHints(q.targetMetadata);
      const playerIds = Array.from(room.players.keys());
      room.songdleState = {
        target: q.targetMetadata,
        hints,
        unlockedHintCount: 0,
        turnOrder: playerIds,
        currentTurnIndex: 0,
        guesses: [],
        status: 'playing',
        winner: null
      };
    } else {
      room.songdleState = null;
    }

    if (q.mode === 'mv') {
      room.playedMvIds = room.playedMvIds || new Set();
      const playerIds = Array.from(room.players.keys());
      const targetId = q.id || 'mv_' + Date.now();
      room.playedMvIds.add(targetId);
      room.mvState = {
        target: {
          id: targetId,
          title: q.correctTitle,
          artist: q.correctArtist,
          album: q.album,
          year: q.releaseYear,
          genre: (q.hints && q.hints[0]) || 'Pop',
          country: (q.hints && q.hints[1]) || '🌍 สากล',
          artwork: q.artwork,
          videoUrl: q.videoUrl || q.previewUrl
        },
        unlockedLevel: 0,
        maxLevel: 5,
        turnOrder: playerIds,
        currentTurnIndex: 0,
        history: [],
        status: 'playing',
        winner: null
      };
    } else {
      room.mvState = null;
    }

    const timeLimit = room.settings.timePerRound;

    // Broadcast question details to room
    io.to(room.code).emit('round_start', {
      questionIndex: room.currentQuestionIndex,
      questionNumber: room.currentQuestionIndex + 1,
      totalQuestions: room.questions.length,
      mode: q.mode, // 'choices', 'typing', 'year', 'heardle', 'songdle', 'mv'
      category: q.category,
      questionText: q.question,
      previewUrl: q.previewUrl,
      videoUrl: q.videoUrl || q.previewUrl,
      options: q.options,
      hints: q.hints,
      targetMetadata: q.targetMetadata,
      candidateSongs: room.candidateSongs, // For autocomplete dropdown!
      songdleState: sanitizeSongdleState(room.songdleState, room, false),
      mvState: sanitizeMvState(room.mvState, room, false),
      timeLimit,
      startedAt: room.roundStartTime
    });

    // Schedule timer round end (+800ms leeway) - NOT for Songdle or MV (untimed puzzle modes)
    if (room.roundTimeout) clearTimeout(room.roundTimeout);
    if (q.mode !== 'songdle' && q.mode !== 'mv') {
      room.roundTimeout = setTimeout(() => {
        endRound(room);
      }, (timeLimit * 1000) + 800);
    }
  }

  // Submit answer (Choice button OR Typed string)
  socket.on('submit_answer', ({ optionIndex, typedAnswer }) => {
    const room = rooms.get(socket.roomCode);
    if (!room || room.state !== 'quiz') return;

    const player = room.players.get(socket.id);
    if (!player || player.answered || player.isEliminated) return;

    const q = room.questions[room.currentQuestionIndex];
    const now = Date.now();
    const elapsedMs = Math.max(0, now - room.roundStartTime);
    const timeLimitMs = room.settings.timePerRound * 1000;

    let isCorrect = false;

    if (q.mode === 'typing') {
      player.typedAnswer = (typedAnswer || '').trim();
      isCorrect = isTypingAnswerCorrect(typedAnswer, q.correctTitle, q.correctArtist);
    } else {
      player.answerIndex = optionIndex;
      isCorrect = optionIndex === q.correctIndex;
    }

    let points = 0;
    if (isCorrect) {
      const remainingRatio = Math.max(0, 1 - (elapsedMs / timeLimitMs));
      const speedBonus = Math.round(500 * remainingRatio);
      const streakBonus = Math.min(250, player.streak * 50);
      points = 500 + speedBonus + streakBonus;
      player.streak++;
    } else {
      player.streak = 0;
    }

    player.answered = true;
    player.pointsEarned = points;
    player.score += points;

    // Send answer receipt to player
    socket.emit('answer_received', {
      mode: q.mode,
      optionIndex,
      typedAnswer,
      isCorrect,
      pointsEarned: points,
      streak: player.streak
    });

    // Broadcast answer progress
    broadcastProgress(room, player);
  });

  // Songdle guess in round (Rule-based: single player continuous, multiplayer turn-based)
  socket.on('submit_songdle_guess', ({ guessTrack, guessId, guessText }) => {
    const room = rooms.get(socket.roomCode);
    if (!room || room.state !== 'quiz' || !room.songdleState) return;
    if (room.songdleState.status !== 'playing') return;

    const player = room.players.get(socket.id);
    if (!player || player.isEliminated) return;

    // 1. Check active turn in multiplayer
    const turnOrder = room.songdleState.turnOrder.filter(id => room.players.has(id));
    room.songdleState.turnOrder = turnOrder;
    if (turnOrder.length > 1) {
      const activePlayerId = turnOrder[room.songdleState.currentTurnIndex % turnOrder.length];
      if (socket.id !== activePlayerId) {
        socket.emit('songdle_toast', { type: 'warning', message: '⏳ ยังไม่ถึงตาของคุณ กรุณารอผู้เล่นคนอื่นทาย' });
        return;
      }
    }

    // 2. Resolve guess track from catalog/candidates (Rule 6: Invalid/empty does NOT consume turn or open hint)
    const catalog = getEnrichedCatalog() || [];
    const candidates = room.candidateSongs || [];
    const fullPool = [...candidates, ...catalog];

    let resolved = null;
    if (guessTrack && guessTrack.title && guessTrack.artist) {
      resolved = guessTrack;
    } else if (guessId) {
      resolved = fullPool.find(t => t.id === guessId);
    } else {
      const rawText = (guessText || (guessTrack && guessTrack.displayText) || '').trim().toLowerCase();
      if (rawText) {
        resolved = fullPool.find(t =>
          (t.displayText && t.displayText.toLowerCase() === rawText) ||
          (t.title && t.title.toLowerCase() === rawText) ||
          (t.id && t.id.toLowerCase() === rawText)
        );
        if (!resolved) {
          resolved = fullPool.find(t =>
            (t.displayText && t.displayText.toLowerCase().includes(rawText)) ||
            (t.title && t.title.toLowerCase().includes(rawText))
          );
        }
      }
    }

    if (!resolved || !resolved.title || !resolved.artist) {
      const rawText = (guessText || (guessTrack && guessTrack.displayText) || 'เพลงที่ทาย').trim();
      const parts = rawText.split(/[-–—]/);
      const title = (parts[0] || rawText).trim();
      const artist = (parts[1] || 'ศิลปิน').trim();
      resolved = {
        id: `user_${Date.now()}`,
        title,
        artist,
        artwork: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600',
        artistType: getArtistMetadata(artist).type,
        genre: getArtistMetadata(artist).genre,
        country: getArtistMetadata(artist).country,
        year: 2021,
        displayText: `${title} - ${artist}`
      };
    }

    // Ensure metadata fields are present
    const cleanGuess = {
      id: resolved.id || `${resolved.title}_${resolved.artist}`.toLowerCase().replace(/[\s\-_]/g, ''),
      title: resolved.title,
      artist: resolved.artist,
      artwork: resolved.artwork || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100',
      artistType: resolved.artistType || (getArtistMetadata(resolved.artist).type),
      genre: resolved.genre || (getArtistMetadata(resolved.artist).genre),
      country: resolved.country || (getArtistMetadata(resolved.artist).country),
      year: resolved.year || 2020
    };

    const comparison = compareSongdleGuess(room.songdleState.target, cleanGuess);
    if (!comparison) return;

    const guessEntry = {
      playerId: socket.id,
      playerName: player.name,
      playerAvatar: player.avatar,
      comparison,
      track: {
        title: cleanGuess.title,
        artist: cleanGuess.artist,
        artwork: cleanGuess.artwork,
        year: cleanGuess.year
      }
    };

    room.songdleState.guesses.unshift(guessEntry);

    // Check Victory (Rule 5)
    if (comparison.isVictory) {
      room.songdleState.status = 'won';
      room.songdleState.winner = {
        id: socket.id,
        name: player.name,
        avatar: player.avatar
      };

      // Award points & streak to the winner
      const hintCount = room.songdleState.unlockedHintCount || 0;
      const pts = Math.max(350, 1200 - (hintCount * 150));
      player.score = (player.score || 0) + pts;
      player.pointsEarned = pts;
      player.answered = true;
      player.streak = (player.streak || 0) + 1;
      player.typedAnswer = `${cleanGuess.title} - ${cleanGuess.artist}`;

      io.to(room.code).emit('songdle_update', sanitizeSongdleState(room.songdleState, room, true));
      io.to(room.code).emit('songdle_toast', {
        type: 'success',
        message: `🎉 ${player.name} ทายเพลงถูกต้องสมบูรณ์แบบ! (+${pts} แต้ม)`
      });

      // Auto-advance to Next Round / Leaderboard after 6 seconds (or Host clicks next)
      if (room.autoAdvanceTimeout) clearTimeout(room.autoAdvanceTimeout);
      room.autoAdvanceTimeout = setTimeout(() => {
        if (room.state === 'quiz') {
          endRound(room);
        }
      }, 6000);
    } else {
      // Wrong guess: Unlock next hint
      room.songdleState.unlockedHintCount++;

      // Check if all hints ran out (Rule 5: When hints exhausted without correct guess, reveal song and end round)
      if (room.songdleState.unlockedHintCount > 5) {
        room.songdleState.status = 'lost';
        io.to(room.code).emit('songdle_update', sanitizeSongdleState(room.songdleState, room, true));
        io.to(room.code).emit('songdle_toast', {
          type: 'info',
          message: '😢 คำใบ้หมดแล้ว! เฉลยเพลงปริศนาประจำรอบ'
        });

        // Auto-advance to Next Round / Leaderboard after 6 seconds
        if (room.autoAdvanceTimeout) clearTimeout(room.autoAdvanceTimeout);
        room.autoAdvanceTimeout = setTimeout(() => {
          if (room.state === 'quiz') {
            endRound(room);
          }
        }, 6000);
      } else {
        // In multiplayer: Pass turn to next player in sequence
        if (turnOrder.length > 1) {
          room.songdleState.currentTurnIndex = (room.songdleState.currentTurnIndex + 1) % turnOrder.length;
          const nextPid = turnOrder[room.songdleState.currentTurnIndex % turnOrder.length];
          const nextP = room.players.get(nextPid);
          io.to(room.code).emit('songdle_toast', {
            type: 'info',
            message: `❌ ${player.name} ทายผิด ปลดล็อคคำใบ้ที่ ${room.songdleState.unlockedHintCount} แล้ว! ถึงตาของ ${nextP ? nextP.name : 'คนถัดไป'}`
          });
        } else {
          io.to(room.code).emit('songdle_toast', {
            type: 'info',
            message: `❌ ยังไม่ถูกต้อง ปลดล็อคคำใบ้ที่ ${room.songdleState.unlockedHintCount} แล้ว ลองทายอีกครั้ง!`
          });
        }
        io.to(room.code).emit('songdle_update', sanitizeSongdleState(room.songdleState, room, false));
      }
    }
  });

  // Songdle Skip Turn (Multiplayer only - Rule 3)
  socket.on('songdle_skip_turn', () => {
    const room = rooms.get(socket.roomCode);
    if (!room || room.state !== 'quiz' || !room.songdleState) return;
    if (room.songdleState.status !== 'playing') return;

    const turnOrder = room.songdleState.turnOrder.filter(id => room.players.has(id));
    room.songdleState.turnOrder = turnOrder;
    if (turnOrder.length <= 1) return; // Only in multiplayer

    const activePlayerId = turnOrder[room.songdleState.currentTurnIndex % turnOrder.length];
    if (socket.id !== activePlayerId) {
      socket.emit('songdle_toast', { type: 'warning', message: '⚠️ ยังไม่ถึงตาของคุณ' });
      return;
    }

    const skippingPlayer = room.players.get(socket.id);
    room.songdleState.currentTurnIndex = (room.songdleState.currentTurnIndex + 1) % turnOrder.length;
    const nextPid = turnOrder[room.songdleState.currentTurnIndex % turnOrder.length];
    const nextPlayer = room.players.get(nextPid);

    io.to(room.code).emit('songdle_update', sanitizeSongdleState(room.songdleState, room, false));
    io.to(room.code).emit('songdle_toast', {
      type: 'info',
      message: `⏭️ ${skippingPlayer ? skippingPlayer.name : 'ผู้เล่น'} ได้กดข้ามตา! ถึงตาของ ${nextPlayer ? nextPlayer.name : 'ผู้เล่นคนถัดไป'}`
    });
  });

  // Songdle Change / New Song (Both single player and multiplayer - Rule 4)
  socket.on('songdle_new_song', () => {
    const room = rooms.get(socket.roomCode);
    if (!room || room.state !== 'quiz') return;

    // 3-second cooldown protection against button spam
    const now = Date.now();
    socket.lastSongdleNewSong = socket.lastSongdleNewSong || 0;
    if (now - socket.lastSongdleNewSong < 3000) {
      socket.emit('songdle_toast', { type: 'warning', message: '⏳ กรุณารอสักครู่ (คูลดาวน์ 3 วิ)' });
      return;
    }
    socket.lastSongdleNewSong = now;

    const catalog = getEnrichedCatalog() || [];
    if (catalog.length === 0) return;

    // Pick a new target song from worldwide catalog
    let pool = catalog;
    if (room.songdleState && room.songdleState.target) {
      pool = catalog.filter(t => t.id !== room.songdleState.target.id);
      if (pool.length === 0) pool = catalog;
    }
    const newTarget = pool[Math.floor(Math.random() * pool.length)];
    const hints = buildSongdleHints(newTarget);
    const playerIds = Array.from(room.players.keys());

    room.songdleState = {
      target: newTarget,
      hints,
      unlockedHintCount: 0,
      turnOrder: playerIds,
      currentTurnIndex: 0,
      guesses: [],
      status: 'playing',
      winner: null
    };

    // Synchronize current question object with newly randomized song
    const currentQ = room.questions[room.currentQuestionIndex];
    if (currentQ) {
      currentQ.correctTitle = newTarget.title;
      currentQ.correctArtist = newTarget.artist;
      currentQ.album = newTarget.album || '';
      currentQ.artwork = newTarget.artwork;
      currentQ.previewUrl = newTarget.previewUrl;
      currentQ.releaseYear = newTarget.year;
      currentQ.targetMetadata = newTarget;
    }

    // Reset player round answers for the newly randomized song
    for (const p of room.players.values()) {
      p.answered = false;
      p.typedAnswer = '';
      p.pointsEarned = 0;
      p.songdleGuesses = [];
    }

    const requestingPlayer = room.players.get(socket.id);
    io.to(room.code).emit('songdle_round_started', {
      songdleState: sanitizeSongdleState(room.songdleState, room, false),
      candidateSongs: room.candidateSongs || catalog.map(c => ({
        id: c.id,
        title: c.title,
        artist: c.artist,
        displayText: c.displayText || `${c.title} - ${c.artist}`,
        artwork: c.artwork,
        artistType: c.artistType,
        genre: c.genre,
        country: c.country,
        year: c.year
      }))
    });

    io.to(room.code).emit('songdle_toast', {
      type: 'success',
      message: `🔄 ${requestingPlayer ? requestingPlayer.name : 'มีผู้เล่น'} สุ่มเพลงปริศนาใหม่แล้ว! เริ่มต้นรอบใหม่`
    });
  });

  // Heardle guess in round
  socket.on('submit_heardle_guess', ({ typedAnswer, isSkip }) => {
    const room = rooms.get(socket.roomCode);
    if (!room || room.state !== 'quiz') return;

    const player = room.players.get(socket.id);
    if (!player || player.answered || player.isEliminated) return;

    const q = room.questions[room.currentQuestionIndex];
    if (q.mode !== 'heardle') return;

    if (!player.heardleAttempts) player.heardleAttempts = [];

    if (isSkip) {
      player.heardleAttempts.push({ text: 'ข้าม (Skipped)', isCorrect: false, isSkipped: true });
      socket.emit('heardle_attempt_result', {
        isCorrect: false,
        isSkipped: true,
        attemptsCount: player.heardleAttempts.length
      });
      return;
    }

    const isCorrect = isTypingAnswerCorrect(typedAnswer, q.correctTitle, q.correctArtist);
    player.heardleAttempts.push({ text: typedAnswer, isCorrect });

    socket.emit('heardle_attempt_result', {
      isCorrect,
      attemptsCount: player.heardleAttempts.length,
      guessText: typedAnswer
    });

    if (isCorrect) {
      player.answered = true;
      const now = Date.now();
      const elapsedMs = Math.max(0, now - room.roundStartTime);
      const timeLimitMs = room.settings.timePerRound * 1000;
      const remainingRatio = Math.max(0, 1 - (elapsedMs / timeLimitMs));
      const speedBonus = Math.round(400 * remainingRatio);
      const attemptBonus = Math.max(200, 600 - (player.heardleAttempts.length - 1) * 100);
      const points = attemptBonus + speedBonus;
      player.pointsEarned = points;
      player.score += points;
      player.streak++;

      socket.emit('answer_received', {
        mode: 'heardle',
        isCorrect: true,
        pointsEarned: points,
        streak: player.streak
      });

      broadcastProgress(room, player);
    }
  });

  // MV Guess in round (Rule-based: single player continuous, multiplayer turn-based)
  socket.on('submit_mv_guess', ({ typedAnswer, isSkipHint }) => {
    const room = rooms.get(socket.roomCode);
    if (!room || room.state !== 'quiz' || !room.mvState) return;
    if (room.mvState.status !== 'playing') return;

    const player = room.players.get(socket.id);
    if (!player || player.isEliminated) return;

    // 1. Check active turn in multiplayer
    const turnOrder = room.mvState.turnOrder.filter(id => room.players.has(id));
    room.mvState.turnOrder = turnOrder;
    if (turnOrder.length > 1) {
      const activePlayerId = turnOrder[room.mvState.currentTurnIndex % turnOrder.length];
      if (socket.id !== activePlayerId) {
        socket.emit('mv_toast', { type: 'warning', message: '⏳ ยังไม่ถึงตาของคุณ กรุณารอผู้เล่นคนอื่นทาย' });
        return;
      }
    }

    // 2. Handle Skip Hint (Consumes slot to unlock more MV time)
    if (isSkipHint) {
      room.mvState.history.push({
        playerId: socket.id,
        playerName: player.name,
        playerAvatar: player.avatar,
        text: 'ข้าม (+ ปลดล็อคเวลา MV)',
        isSkipped: true,
        isCorrect: false
      });

      room.mvState.unlockedLevel++;
      if (room.mvState.unlockedLevel > room.mvState.maxLevel) {
        room.mvState.status = 'lost';
        io.to(room.code).emit('mv_update', sanitizeMvState(room.mvState, room, true));
        io.to(room.code).emit('mv_toast', {
          type: 'info',
          message: '😢 ปลดล็อคเวลาจนครบ 6 ช่องแล้ว! เฉลย MV ประจำรอบ'
        });
      } else {
        if (turnOrder.length > 1) {
          room.mvState.currentTurnIndex = (room.mvState.currentTurnIndex + 1) % turnOrder.length;
          const nextPid = turnOrder[room.mvState.currentTurnIndex % turnOrder.length];
          const nextP = room.players.get(nextPid);
          const nextSec = MV_SNIPPET_DURATIONS[Math.min(room.mvState.unlockedLevel, room.mvState.maxLevel)];
          io.to(room.code).emit('mv_toast', {
            type: 'info',
            message: `⏩ ${player.name} สละสิทธิ์ ปลดล็อคเวลา MV เป็น ${nextSec.toFixed(1)}s! ถึงตาของ ${nextP ? nextP.name : 'คนถัดไป'}`
          });
        } else {
          const nextSec = MV_SNIPPET_DURATIONS[Math.min(room.mvState.unlockedLevel, room.mvState.maxLevel)];
          io.to(room.code).emit('mv_toast', {
            type: 'info',
            message: `⏩ ปลดล็อคเวลา MV เพิ่มเป็น ${nextSec.toFixed(1)} วินาทีแล้ว!`
          });
        }
        io.to(room.code).emit('mv_update', sanitizeMvState(room.mvState, room, false));
      }
      return;
    }

    // 3. Typed Answer (Rule 6: Empty input must NOT consume turn and must NOT unlock hint)
    const text = (typedAnswer || '').trim();
    if (!text) {
      socket.emit('mv_toast', {
        type: 'error',
        message: '⚠️ กรุณาพิมพ์ชื่อเพลงหรือศิลปินก่อนกดส่งคำตอบ (ไม่เสียตา)'
      });
      return;
    }

    const target = room.mvState.target;
    const isCorrect = isTypingAnswerCorrect(text, target.title, target.artist) ||
                      checkMusicVideoGuess(target.id, text).isCorrect;

    room.mvState.history.push({
      playerId: socket.id,
      playerName: player.name,
      playerAvatar: player.avatar,
      text,
      isCorrect,
      isSkipped: false
    });

    if (isCorrect) {
      room.mvState.status = 'won';
      room.mvState.winner = {
        id: socket.id,
        name: player.name,
        avatar: player.avatar
      };
      room.mvState.unlockedLevel = room.mvState.maxLevel; // Unlock full video clip!

      // Award points & streak to the winner
      const lvl = room.mvState.unlockedLevel || 0;
      const pts = Math.max(350, 1200 - (lvl * 150));
      player.score = (player.score || 0) + pts;
      player.pointsEarned = pts;
      player.answered = true;
      player.streak = (player.streak || 0) + 1;
      player.typedAnswer = text;

      io.to(room.code).emit('mv_update', sanitizeMvState(room.mvState, room, true));
      io.to(room.code).emit('mv_toast', {
        type: 'success',
        message: `🎉 ${player.name} ทายเพลงจาก MV ถูกต้องสมบูรณ์แบบ! (+${pts} แต้ม)`
      });

      // Auto-advance to Next Round / Leaderboard after 7 seconds (or Host clicks next)
      if (room.autoAdvanceTimeout) clearTimeout(room.autoAdvanceTimeout);
      room.autoAdvanceTimeout = setTimeout(() => {
        if (room.state === 'quiz') {
          endRound(room);
        }
      }, 7000);
    } else {
      // Wrong guess: Unlock next time snippet
      room.mvState.unlockedLevel++;
      if (room.mvState.unlockedLevel > room.mvState.maxLevel) {
        room.mvState.status = 'lost';
        io.to(room.code).emit('mv_update', sanitizeMvState(room.mvState, room, true));
        io.to(room.code).emit('mv_toast', {
          type: 'info',
          message: '😢 ครบ 6 ช่องแล้วยังไม่มีใครทายถูก! เฉลยเพลงจาก MV ประจำรอบ'
        });

        // Auto-advance to Next Round / Leaderboard after 7 seconds
        if (room.autoAdvanceTimeout) clearTimeout(room.autoAdvanceTimeout);
        room.autoAdvanceTimeout = setTimeout(() => {
          if (room.state === 'quiz') {
            endRound(room);
          }
        }, 7000);
      } else {
        const nextSec = MV_SNIPPET_DURATIONS[Math.min(room.mvState.unlockedLevel, room.mvState.maxLevel)];
        if (turnOrder.length > 1) {
          room.mvState.currentTurnIndex = (room.mvState.currentTurnIndex + 1) % turnOrder.length;
          const nextPid = turnOrder[room.mvState.currentTurnIndex % turnOrder.length];
          const nextP = room.players.get(nextPid);
          io.to(room.code).emit('mv_toast', {
            type: 'info',
            message: `❌ ${player.name} ทายไม่ถูก! ปลดล็อคเวลา MV เป็น ${nextSec.toFixed(1)}s ถึงตาของ ${nextP ? nextP.name : 'คนถัดไป'}`
          });
        } else {
          io.to(room.code).emit('mv_toast', {
            type: 'info',
            message: `❌ ยังไม่ถูกต้อง! ปลดล็อคเวลา MV เพิ่มเป็น ${nextSec.toFixed(1)}s ลองดูอีกครั้ง`
          });
        }
        io.to(room.code).emit('mv_update', sanitizeMvState(room.mvState, room, false));
      }
    }
  });

  // MV Skip Turn (Multiplayer only - Rule 3)
  socket.on('mv_skip_turn', () => {
    const room = rooms.get(socket.roomCode);
    if (!room || room.state !== 'quiz' || !room.mvState) return;
    if (room.mvState.status !== 'playing') return;

    const turnOrder = room.mvState.turnOrder.filter(id => room.players.has(id));
    room.mvState.turnOrder = turnOrder;
    if (turnOrder.length <= 1) return; // Only in multiplayer

    const activePlayerId = turnOrder[room.mvState.currentTurnIndex % turnOrder.length];
    if (socket.id !== activePlayerId) {
      socket.emit('mv_toast', { type: 'warning', message: '⚠️ ยังไม่ถึงตาของคุณ' });
      return;
    }

    const skippingPlayer = room.players.get(socket.id);
    room.mvState.currentTurnIndex = (room.mvState.currentTurnIndex + 1) % turnOrder.length;
    const nextPid = turnOrder[room.mvState.currentTurnIndex % turnOrder.length];
    const nextPlayer = room.players.get(nextPid);

    io.to(room.code).emit('mv_update', sanitizeMvState(room.mvState, room, false));
    io.to(room.code).emit('mv_toast', {
      type: 'info',
      message: `⏭️ ${skippingPlayer ? skippingPlayer.name : 'ผู้เล่น'} ได้กดข้ามตา! ถึงตาของ ${nextPlayer ? nextPlayer.name : 'ผู้เล่นคนถัดไป'}`
    });
  });

  // MV Change / New Song (Both single player and multiplayer - Rule 4)
  socket.on('mv_new_song', () => {
    const room = rooms.get(socket.roomCode);
    if (!room || room.state !== 'quiz') return;

    // 3-second cooldown protection against button spam
    const now = Date.now();
    socket.lastMvNewSong = socket.lastMvNewSong || 0;
    if (now - socket.lastMvNewSong < 3000) {
      socket.emit('mv_toast', { type: 'warning', message: '⏳ กรุณารอสักครู่ (คูลดาวน์ 3 วิ)' });
      return;
    }
    socket.lastMvNewSong = now;

    // Anti-repeat tracking: ensure songs do not repeat excessively
    room.playedMvIds = room.playedMvIds || new Set();
    if (room.mvState && room.mvState.target) {
      room.playedMvIds.add(room.mvState.target.id);
    }

    const pool = CURATED_MUSIC_VIDEOS;
    let unplayed = pool.filter(m => !room.playedMvIds.has(m.id));
    if (unplayed.length === 0) {
      room.playedMvIds.clear();
      if (room.mvState && room.mvState.target) {
        room.playedMvIds.add(room.mvState.target.id);
      }
      unplayed = pool.filter(m => !room.playedMvIds.has(m.id));
      if (unplayed.length === 0) unplayed = pool;
    }

    const newTarget = unplayed[Math.floor(Math.random() * unplayed.length)];
    room.playedMvIds.add(newTarget.id);
    const playerIds = Array.from(room.players.keys());

    room.mvState = {
      target: {
        id: newTarget.id,
        title: newTarget.title,
        artist: newTarget.artist,
        album: newTarget.album,
        year: newTarget.year,
        genre: newTarget.genre,
        country: newTarget.country,
        artwork: newTarget.artwork,
        videoUrl: newTarget.previewUrl
      },
      unlockedLevel: 0,
      maxLevel: 5,
      turnOrder: playerIds,
      currentTurnIndex: 0,
      history: [],
      status: 'playing',
      winner: null
    };

    // Synchronize current question object with newly randomized MV
    const currentQ = room.questions[room.currentQuestionIndex];
    if (currentQ) {
      currentQ.correctTitle = newTarget.title;
      currentQ.correctArtist = newTarget.artist;
      currentQ.album = newTarget.album || '';
      currentQ.artwork = newTarget.artwork;
      currentQ.previewUrl = newTarget.previewUrl;
      currentQ.videoUrl = newTarget.previewUrl;
      currentQ.releaseYear = newTarget.year;
      currentQ.category = `🎬 Music Video (${newTarget.country})`;
      currentQ.hints = [
        `แนวเพลง: ${newTarget.genre}`,
        `สัญชาติ: ${newTarget.country}`,
        `ปีที่ปล่อย: ${newTarget.year}`
      ];
    }

    // Reset player round answers for the newly randomized song
    for (const p of room.players.values()) {
      p.answered = false;
      p.typedAnswer = '';
      p.pointsEarned = 0;
      p.mvAttempts = [];
    }

    const requestingPlayer = room.players.get(socket.id);
    io.to(room.code).emit('mv_round_started', {
      mvState: sanitizeMvState(room.mvState, room, false),
      candidateSongs: room.candidateSongs
    });

    io.to(room.code).emit('mv_toast', {
      type: 'success',
      message: `🔄 ${requestingPlayer ? requestingPlayer.name : 'มีผู้เล่น'} สุ่ม MV ใหม่แล้ว! เริ่มต้นรอบใหม่`
    });
  });

  // Skip question during round
  socket.on('skip_question', () => {
    const room = rooms.get(socket.roomCode);
    if (!room || room.state !== 'quiz') return;

    const player = room.players.get(socket.id);
    if (!player || player.answered || player.isEliminated) return;

    player.answered = true;
    player.hasSkipped = true;
    player.pointsEarned = 0;
    player.streak = 0;

    socket.emit('answer_received', {
      hasSkipped: true,
      isCorrect: false,
      pointsEarned: 0,
      streak: 0
    });

    broadcastProgress(room, player);
  });

  // Host Skip / Fast-Forward remaining wait time
  socket.on('host_skip_timer', () => {
    const room = rooms.get(socket.roomCode);
    if (!room || room.hostId !== socket.id || room.state !== 'quiz') return;

    console.log(`[Room ${room.code}] Host skipped timer`);
    if (room.roundTimeout) clearTimeout(room.roundTimeout);
    endRound(room);
  });

  function broadcastProgress(room, player) {
    const q = room.questions[room.currentQuestionIndex];
    if (q && (q.mode === 'songdle' || q.mode === 'mv')) return;

    const isSurvival = room.settings && room.settings.gameMode === 'survival';
    const activePlayers = isSurvival
      ? Array.from(room.players.values()).filter(p => !p.isEliminated)
      : Array.from(room.players.values());

    const answeredCount = activePlayers.filter(p => p.answered).length;
    const totalActive = activePlayers.length || 1;

    io.to(room.code).emit('round_progress', {
      answeredCount,
      totalPlayers: totalActive,
      lastAnsweredPlayer: {
        id: player.id,
        name: player.name,
        avatar: player.avatar
      }
    });

    // If all active players have answered or skipped, end round immediately!
    if (answeredCount >= totalActive) {
      if (room.roundTimeout) clearTimeout(room.roundTimeout);
      setTimeout(() => {
        endRound(room);
      }, 500);
    }
  }

  // End round & reveal
  function endRound(room) {
    if (!rooms.has(room.code) || room.state !== 'quiz') return;
    room.state = 'reveal';
    if (room.roundTimeout) clearTimeout(room.roundTimeout);
    if (room.autoAdvanceTimeout) clearTimeout(room.autoAdvanceTimeout);

    const q = room.questions[room.currentQuestionIndex];
    if (!q) return;

    // Synchronize correct track info from active mode state (MV or Songdle or standard)
    let correctTitle = q.correctTitle;
    let correctArtist = q.correctArtist;
    let album = q.album || '';
    let artwork = q.artwork;
    let previewUrl = q.videoUrl || q.previewUrl;
    let releaseYear = q.releaseYear;

    if (q.mode === 'mv' && room.mvState && room.mvState.target) {
      correctTitle = room.mvState.target.title || correctTitle;
      correctArtist = room.mvState.target.artist || correctArtist;
      album = room.mvState.target.album || album;
      artwork = room.mvState.target.artwork || artwork;
      previewUrl = room.mvState.target.videoUrl || room.mvState.target.previewUrl || previewUrl;
      releaseYear = room.mvState.target.year || releaseYear;
    } else if (q.mode === 'songdle' && room.songdleState && room.songdleState.target) {
      correctTitle = room.songdleState.target.title || correctTitle;
      correctArtist = room.songdleState.target.artist || correctArtist;
      album = room.songdleState.target.album || album;
      artwork = room.songdleState.target.artwork || artwork;
      previewUrl = room.songdleState.target.previewUrl || previewUrl;
      releaseYear = room.songdleState.target.year || releaseYear;
    }

    // Keep q perfectly in sync
    q.correctTitle = correctTitle;
    q.correctArtist = correctArtist;
    q.album = album;
    q.artwork = artwork;
    q.previewUrl = previewUrl;
    q.releaseYear = releaseYear;

    const playerResults = Array.from(room.players.values()).map(p => {
      let isCorrect = false;
      let displayAnswer = p.typedAnswer;

      if (q.mode === 'mv') {
        const isWinner = room.mvState && room.mvState.winner && room.mvState.winner.id === p.id;
        const hasCorrectAttempt = room.mvState && room.mvState.history && room.mvState.history.some(h => h.playerId === p.id && h.isCorrect);
        isCorrect = isWinner || hasCorrectAttempt || (p.answered && p.pointsEarned > 0);
        if (room.mvState && room.mvState.history) {
          const userGuesses = room.mvState.history.filter(h => h.playerId === p.id);
          const winningGuess = userGuesses.find(h => h.isCorrect);
          if (winningGuess) {
            displayAnswer = winningGuess.text;
          } else if (userGuesses.length > 0) {
            displayAnswer = userGuesses[userGuesses.length - 1].text;
          }
        }
      } else if (q.mode === 'songdle') {
        const isWinner = room.songdleState && room.songdleState.winner && room.songdleState.winner.id === p.id;
        isCorrect = isWinner || (p.answered && p.pointsEarned > 0);
        if (room.songdleState && room.songdleState.guesses) {
          const userGuesses = room.songdleState.guesses.filter(g => g.playerId === p.id);
          const winningGuess = userGuesses.find(g => g.comparison && g.comparison.isVictory);
          if (winningGuess) {
            displayAnswer = winningGuess.track ? `${winningGuess.track.title} - ${winningGuess.track.artist}` : winningGuess.text;
          } else if (userGuesses.length > 0) {
            const last = userGuesses[0];
            displayAnswer = last.track ? `${last.track.title} - ${last.track.artist}` : last.text;
          }
        }
      } else if (q.mode === 'heardle') {
        const hasCorrect = p.heardleAttempts && p.heardleAttempts.some(a => a.isCorrect);
        isCorrect = hasCorrect || (p.answered && p.pointsEarned > 0);
        if (p.heardleAttempts && p.heardleAttempts.length > 0) {
          displayAnswer = p.heardleAttempts[p.heardleAttempts.length - 1].text;
        }
      } else if (q.mode === 'typing') {
        isCorrect = isTypingAnswerCorrect(p.typedAnswer, correctTitle, correctArtist);
      } else {
        isCorrect = p.answerIndex === q.correctIndex && p.answered && !p.hasSkipped;
      }

      return {
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        answered: p.answered || isCorrect,
        answerIndex: p.answerIndex,
        typedAnswer: displayAnswer || p.typedAnswer,
        hasSkipped: p.hasSkipped,
        isCorrect,
        pointsEarned: p.pointsEarned,
        score: p.score,
        streak: p.streak,
        lives: p.lives !== undefined ? p.lives : 3,
        isEliminated: !!p.isEliminated
      };
    });

    // Handle Survival Mode deduction
    if (room.settings && room.settings.gameMode === 'survival') {
      for (const pr of playerResults) {
        const p = room.players.get(pr.id);
        if (p && !p.isEliminated && !pr.isCorrect) {
          p.lives = Math.max(0, (p.lives !== undefined ? p.lives : 3) - 1);
          pr.lives = p.lives;
          if (p.lives === 0) {
            p.isEliminated = true;
            pr.isEliminated = true;
          }
        }
      }
    }

    const leaderboard = getLeaderboard(room);

    let isLastQuestion = room.currentQuestionIndex + 1 >= room.questions.length;
    if (room.settings && room.settings.gameMode === 'survival') {
      const aliveCount = Array.from(room.players.values()).filter(p => !p.isEliminated).length;
      if (room.players.size >= 2 && aliveCount <= 1) {
        isLastQuestion = true;
      } else if (aliveCount === 0) {
        isLastQuestion = true;
      }
    }

    io.to(room.code).emit('round_end', {
      mode: q.mode,
      correctIndex: q.correctIndex,
      options: q.options || [],
      trackInfo: {
        title: correctTitle,
        artist: correctArtist,
        album: album,
        artwork: artwork,
        previewUrl: previewUrl,
        releaseYear: releaseYear
      },
      playerResults,
      leaderboard,
      isLastQuestion
    });
  }

  // Next question triggered by Host
  socket.on('next_question', () => {
    const room = rooms.get(socket.roomCode);
    if (!room || room.hostId !== socket.id || room.state !== 'reveal') return;
    startNextRound(room);
  });

  // End game & podium
  function endGame(room) {
    room.state = 'podium';
    if (room.roundTimeout) clearTimeout(room.roundTimeout);
    if (room.autoAdvanceTimeout) clearTimeout(room.autoAdvanceTimeout);

    const leaderboard = getLeaderboard(room);
    io.to(room.code).emit('game_over', {
      leaderboard,
      totalQuestions: room.questions.length,
      topThree: leaderboard.slice(0, 3)
    });
  }

  // Restart room
  socket.on('restart_room', () => {
    const room = rooms.get(socket.roomCode);
    if (!room || room.hostId !== socket.id) return;

    room.state = 'lobby';
    room.currentQuestionIndex = -1;
    room.questions = [];
    for (const player of room.players.values()) {
      player.score = 0;
      player.streak = 0;
      player.answered = false;
      player.answerIndex = null;
      player.typedAnswer = '';
      player.hasSkipped = false;
      player.pointsEarned = 0;
      player.lives = 3;
      player.isEliminated = false;
    }

    io.to(room.code).emit('room_reset', {
      settings: room.settings,
      players: Array.from(room.players.values()).map(p => ({ ...p, isHost: p.id === room.hostId }))
    });
  });

  // Disconnect handler
  socket.on('disconnect', () => {
    const code = socket.roomCode;
    if (!code || !rooms.has(code)) return;

    const room = rooms.get(code);
    const leavingPlayer = room.players.get(socket.id);
    if (!leavingPlayer) return;

    room.players.delete(socket.id);
    console.log(`[Room ${code}] ${leavingPlayer.name} left. Remaining: ${room.players.size}`);

    if (room.players.size === 0) {
      if (room.roundTimeout) clearTimeout(room.roundTimeout);
      if (room.autoAdvanceTimeout) clearTimeout(room.autoAdvanceTimeout);
      rooms.delete(code);
      console.log(`[Room ${code}] Closed (empty)`);
      return;
    }

    if (room.hostId === socket.id) {
      const nextHost = room.players.values().next().value;
      if (nextHost) {
        room.hostId = nextHost.id;
        io.to(code).emit('host_changed', { newHostId: nextHost.id, newHostName: nextHost.name });
      }
    }

    io.to(code).emit('player_list_updated', {
      players: Array.from(room.players.values()).map(p => ({ ...p, isHost: p.id === room.hostId })),
      leftPlayer: leavingPlayer
    });

    if (room.state === 'quiz' && room.songdleState) {
      room.songdleState.turnOrder = room.songdleState.turnOrder.filter(id => id !== socket.id);
      if (room.songdleState.status === 'playing') {
        io.to(code).emit('songdle_update', sanitizeSongdleState(room.songdleState, room, false));
      }
    }

    if (room.state === 'quiz' && room.mvState) {
      room.mvState.turnOrder = room.mvState.turnOrder.filter(id => id !== socket.id);
      if (room.mvState.status === 'playing') {
        io.to(code).emit('mv_update', sanitizeMvState(room.mvState, room, false));
      }
    }

    const isUntimedMode = (room.songdleState && room.songdleState.status === 'playing') ||
                          (room.mvState && room.mvState.status === 'playing');

    if (room.state === 'quiz' && !isUntimedMode) {
      const answeredCount = Array.from(room.players.values()).filter(p => p.answered).length;
      if (answeredCount >= room.players.size) {
        if (room.roundTimeout) clearTimeout(room.roundTimeout);
        setTimeout(() => endRound(room), 500);
      }
    }
  });
});

// Dynamic Server Startup
function startServer(portToTry) {
  server.listen(portToTry, '0.0.0.0', () => {
    currentServerPort = portToTry;
    console.log(`===============================================`);
    console.log(`🎵 MUSIC QUIZ PARTY SERVER RUNNING`);
    console.log(`➡️  Local:   http://localhost:${portToTry}`);
    console.log(`➡️  Network: http://${localIP}:${portToTry}`);
    console.log(`===============================================`);
  });
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    const nextPort = currentServerPort + 1;
    console.warn(`Port ${currentServerPort} is in use, trying next port: ${nextPort}...`);
    currentServerPort = nextPort;
    setTimeout(() => startServer(nextPort), 500);
  } else {
    console.error('Server error:', err);
  }
});

startServer(PORT);
