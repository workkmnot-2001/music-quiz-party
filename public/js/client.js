// Music Quiz Party! Client Game Engine (v2.0 with Typing Mode, Hints, Dropdowns & Sidebar)

(function () {
  'use strict';

  // --- Socket.IO & State ---
  let socket = null;
  let myPlayer = {
    id: null,
    name: '',
    avatar: '🎧',
    isHost: false,
    score: 0,
    streak: 0
  };

  try {
    myPlayer.name = localStorage.getItem('musicQuiz_playerName') || '';
    myPlayer.avatar = localStorage.getItem('musicQuiz_playerAvatar') || '🎧';
  } catch (e) {}

  let currentRoom = {
    code: '',
    state: 'home',
    settings: {
      gameMode: 'choices',
      categories: ['mix'],
      questionCount: 10,
      timePerRound: 20
    },
    players: [],
    localIP: 'localhost',
    port: 3000
  };

  let mainCategoriesData = {};
  let currentRound = null;
  let hasAnsweredCurrentRound = false;
  let timerInterval = null;
  let isSoundMuted = false;
  let currentVolume = 0.8;
  let activeHintIndex = 1;
  let candidateSongsList = [];

  const AVATARS = ['🎧', '🎸', '🎤', '🎷', '🥁', '🎹', '🕶️', '🕺', '💃', '🐱', '🦊', '🦄', '👑', '🚀', '⚡', '🌟'];

  // 3-Second Action Cooldown Tracker (Spam Protection)
  const actionCooldowns = new Map();
  function canPerformAction(actionKey = 'global', delayMs = 3000) {
    const now = Date.now();
    const last = actionCooldowns.get(actionKey) || 0;
    if (now - last < delayMs) {
      const remaining = ((delayMs - (now - last)) / 1000).toFixed(1);
      showToast(`⏳ กรุณารอสักครู่ (คูลดาวน์ ${remaining} วิ)`);
      return false;
    }
    actionCooldowns.set(actionKey, now);
    return true;
  }

  // --- DOM Elements ---
  const screens = {
    home: document.getElementById('screen-home'),
    lobby: document.getElementById('screen-lobby'),
    countdown: document.getElementById('screen-countdown'),
    quiz: document.getElementById('screen-quiz'),
    reveal: document.getElementById('screen-reveal'),
    podium: document.getElementById('screen-podium')
  };

  const audioPlayer = document.getElementById('music-player');
  const soundToggleBtn = document.getElementById('btn-sound-toggle');
  const soundToggleMobileBtn = document.getElementById('btn-sound-toggle-mobile');
  const volumeSlider = document.getElementById('volume-slider');

  // Sidebar Elements
  const roomSidebar = document.getElementById('room-sidebar');
  const sidebarBackdrop = document.getElementById('sidebar-backdrop');
  const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
  const btnCloseSidebar = document.getElementById('btn-close-sidebar');
  const mobilePlayerCount = document.getElementById('mobile-player-count');
  const sidebarRoomInfo = document.getElementById('sidebar-room-info');
  const displayRoomCode = document.getElementById('display-room-code');
  const btnCopyLink = document.getElementById('btn-copy-link');
  const btnShowQr = document.getElementById('btn-show-qr');
  const displayNetworkUrl = document.getElementById('display-network-url');
  const sidebarSettingsBox = document.getElementById('sidebar-settings-box');
  const sidebarModeText = document.getElementById('sidebar-mode-text');
  const sidebarCatText = document.getElementById('sidebar-cat-text');
  const sidebarRoundText = document.getElementById('sidebar-round-text');
  const sidebarPlayerCount = document.getElementById('sidebar-player-count');
  const sidebarPlayersList = document.getElementById('sidebar-players-list');
  const btnLeaveRoom = document.getElementById('btn-leave-room');

  // Home Form Elements
  const tabCreate = document.getElementById('tab-create');
  const tabJoin = document.getElementById('tab-join');
  const createRoomPanel = document.getElementById('create-room-panel');
  const joinRoomPanel = document.getElementById('join-room-panel');
  const playerNameInput = document.getElementById('player-name-input');
  const avatarGrid = document.getElementById('avatar-grid');
  const gameModeBoxes = document.querySelectorAll('.game-mode-box');
  let selectedGameMode = 'choices';
  const mainCatBoxes = document.getElementById('main-cat-boxes');
  let selectedMainCategoryId = 'mix';
  const selectSubCategory = document.getElementById('select-sub-category');
  const subCategoryGroup = document.getElementById('sub-category-group');
  const selectQuestionCount = document.getElementById('select-question-count');
  const selectRoundTimer = document.getElementById('select-round-timer');
  const roomCodeInput = document.getElementById('room-code-input');
  const btnCreateRoom = document.getElementById('btn-create-room');
  const btnJoinRoom = document.getElementById('btn-join-room');

  // Search Elements (MusicBrainz + iTunes)
  const tabSearch = document.getElementById('tab-search');
  const searchMusicPanel = document.getElementById('search-music-panel');
  const compactProfileBox = document.querySelector('.compact-profile-box');
  const musicSearchForm = document.getElementById('music-search-form');
  const musicSearchInput = document.getElementById('music-search-input');
  const btnClearSearch = document.getElementById('btn-clear-search');
  const musicSearchCountry = document.getElementById('music-search-country');
  const btnSubmitSearch = document.getElementById('btn-submit-search');
  const searchFilterBar = document.getElementById('search-filter-bar');
  const searchStatusBanner = document.getElementById('search-status-banner');
  const searchLoadingState = document.getElementById('search-loading-state');
  const searchEmptyState = document.getElementById('search-empty-state');
  const searchIdleState = document.getElementById('search-idle-state');
  const searchResultsGrid = document.getElementById('search-results-grid');
  const countAll = document.getElementById('count-all');
  const countItunes = document.getElementById('count-itunes');
  const countDeezer = document.getElementById('count-deezer');
  const countMb = document.getElementById('count-mb');
  const countBoth = document.getElementById('count-both');
  let currentSearchResults = [];
  let currentSearchFilter = 'all';

  // Mini Games Elements (Heardle, Songdle, MV)
  const tabHeardle = document.getElementById('tab-heardle');
  const tabSongdle = document.getElementById('tab-songdle');
  const tabMv = document.getElementById('tab-mv');
  const heardlePanel = document.getElementById('heardle-panel');
  const songdlePanel = document.getElementById('songdle-panel');
  const mvPanel = document.getElementById('mv-panel');

  // Lobby Elements
  const btnTestSound = document.getElementById('btn-test-sound');
  const lobbySummaryMode = document.getElementById('lobby-summary-mode');
  const lobbySummaryCats = document.getElementById('lobby-summary-cats');
  const lobbySummaryRounds = document.getElementById('lobby-summary-rounds');
  const hostControls = document.getElementById('host-controls');
  const guestControls = document.getElementById('guest-controls');
  const btnStartGame = document.getElementById('btn-start-game');

  // Countdown Elements
  const countdownNumber = document.getElementById('countdown-number');

  // Quiz Elements
  const quizQuestionCounter = document.getElementById('quiz-question-counter');
  const quizCategoryBadge = document.getElementById('quiz-category-badge');
  const quizStreakBadge = document.getElementById('quiz-streak-badge');
  const timerBarFill = document.getElementById('timer-bar-fill');
  const vinylDisc = document.getElementById('vinyl-disc');
  const eqBars = document.getElementById('eq-bars');
  const audioStatusText = document.getElementById('audio-status-text');
  const quizQuestionText = document.getElementById('quiz-question-text');

  // Choices Mode
  const choicesGrid = document.getElementById('choices-grid');

  // Typing Mode & Hints
  const typingModeContainer = document.getElementById('typing-mode-container');
  const hint1 = document.getElementById('hint-1');
  const hint2 = document.getElementById('hint-2');
  const hint3 = document.getElementById('hint-3');
  const btnRequestHint = document.getElementById('btn-request-hint');
  const typingAnswerInput = document.getElementById('typing-answer-input');
  const btnSubmitTyping = document.getElementById('btn-submit-typing');
  const typingAutocompleteDropdown = document.getElementById('typing-autocomplete-dropdown');

  // New Quiz Mode Containers
  const heardleQuizContainer = document.getElementById('heardle-quiz-container');
  const songdleQuizContainer = document.getElementById('songdle-quiz-container');
  const mvQuizContainer = document.getElementById('mv-quiz-container');

  // Skip / Fast-Forward
  const btnSkipQuestion = document.getElementById('btn-skip-question');
  const btnHostSkipTimer = document.getElementById('btn-host-skip-timer');
  const answeredCountText = document.getElementById('answered-count-text');
  const answeredAvatarsRow = document.getElementById('answered-avatars-row');

  // Reveal Elements
  const revealArtwork = document.getElementById('reveal-artwork');
  const revealTitle = document.getElementById('reveal-title');
  const revealArtist = document.getElementById('reveal-artist');
  const revealAlbum = document.getElementById('reveal-album');
  const revealUserBanner = document.getElementById('reveal-user-banner');
  const revealCorrectText = document.getElementById('reveal-correct-text');
  const revealLeaderboard = document.getElementById('reveal-leaderboard');
  const revealHostControls = document.getElementById('reveal-host-controls');
  const revealGuestControls = document.getElementById('reveal-guest-controls');
  const btnNextQuestion = document.getElementById('btn-next-question');

  // Podium Elements
  const finalLeaderboard = document.getElementById('final-leaderboard');
  const btnPlayAgain = document.getElementById('btn-play-again');
  const btnGoHome = document.getElementById('btn-go-home');

  // QR Modal & Toast
  const modalQr = document.getElementById('modal-qr');
  const qrImage = document.getElementById('qr-image');
  const qrModalUrl = document.getElementById('qr-modal-url');
  const btnCloseQr = document.getElementById('btn-close-qr');
  const toastMsg = document.getElementById('toast-msg');

  // --- Initialize Application ---
  async function init() {
    generateRandomName();
    setupEventListeners();
    setupSocket();
    await loadCategoriesData();
    checkUrlParams();
    updateSidebarPlayers();
  }

  function generateRandomName() {
    if (!myPlayer.name) {
      const prefixes = ['ดีเจ', 'เซียน', 'กัปตัน', 'นักร้อง', 'เด็กแนว', 'น้อง', 'พี่', 'แชมป์'];
      const names = ['มิวสิค', 'โซดา', 'บอส', 'กาก้า', 'แพรว', 'นนท์', 'เบส', 'ป๊อป', 'โฟกัส'];
      const p = prefixes[Math.floor(Math.random() * prefixes.length)];
      const n = names[Math.floor(Math.random() * names.length)];
      myPlayer.name = `${p}${n}`;
      try {
        localStorage.setItem('musicQuiz_playerName', myPlayer.name);
      } catch (e) {}
    }
    if (playerNameInput) playerNameInput.value = myPlayer.name;
  }

  function openEditProfileModal() {
    if (currentRoom.code && currentRoom.state && currentRoom.state !== 'lobby') {
      showToast('⚠️ ไม่สามารถแก้ไขชื่อหรืออวาตาร์ระหว่างกำลังเล่นเกมได้');
      return;
    }
    window.soundFX?.playClick();
    const editModal = document.getElementById('modal-edit-profile');
    const editNameInput = document.getElementById('edit-name-input');
    const editAvatarGrid = document.getElementById('edit-avatar-grid');

    if (!editModal || !editNameInput || !editAvatarGrid) return;

    let selectedAvatar = myPlayer.avatar || '🎧';
    editNameInput.value = myPlayer.name || '';

    // Render avatar buttons inside modal
    editAvatarGrid.innerHTML = '';
    AVATARS.forEach((av) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `avatar-btn ${av === selectedAvatar ? 'selected' : ''}`;
      btn.textContent = av;
      btn.addEventListener('click', () => {
        editAvatarGrid.querySelectorAll('.avatar-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedAvatar = av;
        window.soundFX?.playClick();
      });
      editAvatarGrid.appendChild(btn);
    });

    editModal.classList.add('active');
    setTimeout(() => {
      editNameInput.focus();
      editNameInput.select();
    }, 150);

    const saveBtn = document.getElementById('btn-save-edit-profile');
    const cancelBtn = document.getElementById('btn-cancel-edit-profile');
    const closeBtn = document.getElementById('btn-close-edit-modal');

    const handleSave = () => {
      const newName = (editNameInput.value || '').trim();
      if (!newName) {
        showToast('⚠️ กรุณาระบุชื่อของคุณ');
        editNameInput.focus();
        return;
      }

      myPlayer.name = newName;
      myPlayer.avatar = selectedAvatar;

      try {
        localStorage.setItem('musicQuiz_playerName', newName);
        localStorage.setItem('musicQuiz_playerAvatar', selectedAvatar);
      } catch (e) {}

      // If in a room, emit update_profile to server
      if (currentRoom.code && socket) {
        socket.emit('update_profile', {
          name: newName,
          avatar: selectedAvatar
        });
      }

      updateSidebarPlayers();
      editModal.classList.remove('active');
      window.soundFX?.playCorrect();
      showToast(`✨ อัปเดตข้อมูลเป็น "${newName}" เรียบร้อย!`);
    };

    saveBtn.onclick = handleSave;
    cancelBtn.onclick = () => editModal.classList.remove('active');
    closeBtn.onclick = () => editModal.classList.remove('active');

    editNameInput.onkeydown = (e) => {
      if (e.key === 'Enter') handleSave();
    };
  }

  // Load Categories & Populate Selection Boxes
  async function loadCategoriesData() {
    try {
      const res = await fetch('/api/info');
      const data = await res.json();
      mainCategoriesData = data.mainCategories || {};
      populateCategoryBoxes();
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  }

  function populateCategoryBoxes() {
    if (!mainCatBoxes) return;
    mainCatBoxes.innerHTML = '';
    const categoriesList = Object.values(mainCategoriesData);
    if (categoriesList.length === 0) return;

    categoriesList.forEach((main) => {
      const box = document.createElement('div');
      box.className = `main-cat-box ${main.id === selectedMainCategoryId ? 'selected' : ''}`;
      box.dataset.id = main.id;

      // Extract Thai name and English subtitle from main.name
      const parenIndex = main.name.indexOf('(');
      let titleThai = main.name;
      let titleEn = '';
      if (parenIndex !== -1) {
        titleThai = main.name.substring(0, parenIndex).trim();
        titleEn = main.name.substring(parenIndex).trim();
      }

      box.innerHTML = `
        <div class="main-cat-top">
          <span class="main-cat-icon">${main.icon || '🎵'}</span>
        </div>
        <div class="main-cat-info">
          <div class="main-cat-name-th">${titleThai}</div>
          ${titleEn ? `<div class="main-cat-name-en">${titleEn}</div>` : ''}
        </div>
      `;

      box.addEventListener('click', () => {
        selectedMainCategoryId = main.id;
        document.querySelectorAll('.main-cat-box').forEach(b => b.classList.remove('selected'));
        box.classList.add('selected');
        window.soundFX?.playClick();
        updateSubCategoryDropdown();
      });

      mainCatBoxes.appendChild(box);
    });

    updateSubCategoryDropdown();
  }

  function updateSubCategoryDropdown() {
    if (!selectSubCategory) return;
    const mainId = selectedMainCategoryId || 'mix';
    const main = mainCategoriesData[mainId];

    selectSubCategory.innerHTML = '';

    if (!main || !main.subcategories || main.subcategories.length === 0) {
      if (subCategoryGroup) subCategoryGroup.style.display = 'none';
      const opt = document.createElement('option');
      opt.value = mainId;
      opt.textContent = '🌟 สุ่มรวมทุกแนวเพลง (All-Stars Mix)';
      selectSubCategory.appendChild(opt);
    } else {
      if (subCategoryGroup) subCategoryGroup.style.display = 'block';
      // First option: All subcategories in this main category
      const allOpt = document.createElement('option');
      allOpt.value = mainId;
      const cleanName = (main.name || '').replace(/^[^\s]+\s+/, '').replace(/\s*\(.*\)$/, '');
      allOpt.textContent = `🌟 เพลงทั้งหมดในหมวด ${cleanName} (All in category)`;
      selectSubCategory.appendChild(allOpt);

      main.subcategories.forEach(sub => {
        const opt = document.createElement('option');
        opt.value = sub.id;
        opt.textContent = `${sub.name}`;
        selectSubCategory.appendChild(opt);
      });
    }
  }

  function checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('room') || urlParams.get('join');
    if (code) {
      roomCodeInput.value = code.toUpperCase().trim();
      switchToTab('join');
      showToast(`🔑 ตรวจพบรหัสห้อง ${code.toUpperCase()}! ใส่ชื่อแล้วกดเข้าร่วมได้เลย`);
    }
  }

  function showScreen(name) {
    Object.keys(screens).forEach(key => {
      if (screens[key]) {
        screens[key].classList.toggle('active', key === name);
      }
    });
    currentRoom.state = name;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Close mobile sidebar automatically when transitioning
    closeMobileSidebar();
  }

  function showToast(text, duration = 3000) {
    toastMsg.textContent = text;
    toastMsg.classList.add('show');
    clearTimeout(toastMsg.toastTimer);
    toastMsg.toastTimer = setTimeout(() => {
      toastMsg.classList.remove('show');
    }, duration);
  }

  function switchToTab(tab) {
    tabCreate.classList.toggle('active', tab === 'create');
    tabJoin.classList.toggle('active', tab === 'join');
    if (tabSearch) tabSearch.classList.toggle('active', tab === 'search');

    // Hide panels
    createRoomPanel.style.display = 'none';
    joinRoomPanel.style.display = 'none';
    if (searchMusicPanel) searchMusicPanel.style.display = 'none';

    if (tab === 'create') {
      if (compactProfileBox) compactProfileBox.style.display = 'flex';
      createRoomPanel.style.display = 'block';
    } else if (tab === 'join') {
      if (compactProfileBox) compactProfileBox.style.display = 'flex';
      joinRoomPanel.style.display = 'block';
    } else if (tab === 'search') {
      if (compactProfileBox) compactProfileBox.style.display = 'none';
      if (searchMusicPanel) searchMusicPanel.style.display = 'block';
      setTimeout(() => musicSearchInput?.focus(), 150);
    }
    window.soundFX?.playClick();
  }

  // --- Sidebar Drawer Controls ---
  function openMobileSidebar() {
    roomSidebar.classList.add('open');
    sidebarBackdrop.classList.add('active');
  }

  function closeMobileSidebar() {
    roomSidebar.classList.remove('open');
    sidebarBackdrop.classList.remove('active');
  }

  // --- Event Listeners ---
  function setupEventListeners() {
    tabCreate.addEventListener('click', () => switchToTab('create'));
    tabJoin.addEventListener('click', () => switchToTab('join'));
    if (tabSearch) {
      tabSearch.addEventListener('click', () => switchToTab('search'));
    }
    setupSearchListeners();
    setupMiniGamesListeners();

    // Heardle Quiz controls
    const btnHeardleQuizPlay = document.getElementById('btn-heardle-quiz-play');
    if (btnHeardleQuizPlay) btnHeardleQuizPlay.addEventListener('click', playHeardleQuizSnippet);
    const btnHeardleQuizSkip = document.getElementById('btn-heardle-quiz-skip');
    if (btnHeardleQuizSkip) btnHeardleQuizSkip.addEventListener('click', () => {
      if (!canPerformAction('heardle_quiz_skip', 3000)) return;
      socket.emit('submit_heardle_guess', { isSkip: true });
    });
    const btnHeardleQuizSubmit = document.getElementById('btn-heardle-quiz-submit');
    const heardleQuizInput = document.getElementById('heardle-quiz-input');
    if (btnHeardleQuizSubmit) {
      btnHeardleQuizSubmit.addEventListener('click', () => {
        if (!canPerformAction('heardle_quiz_submit', 3000)) return;
        const val = heardleQuizInput ? heardleQuizInput.value.trim() : '';
        if (val) socket.emit('submit_heardle_guess', { typedAnswer: val, isSkip: false });
      });
    }
    if (heardleQuizInput) {
      heardleQuizInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          if (!canPerformAction('heardle_quiz_submit', 3000)) return;
          const val = heardleQuizInput.value.trim();
          if (val) socket.emit('submit_heardle_guess', { typedAnswer: val, isSkip: false });
        }
      });
    }

    // Songdle Quiz controls
    const btnSongdleQuizSubmit = document.getElementById('btn-songdle-quiz-submit');
    const songdleQuizInput = document.getElementById('songdle-quiz-input');
    const btnSongdleQuizSkipTurn = document.getElementById('btn-songdle-quiz-skip-turn');
    const btnSongdleQuizNewSong = document.getElementById('btn-songdle-quiz-new-song');

    if (btnSongdleQuizSubmit) btnSongdleQuizSubmit.addEventListener('click', handleSongdleQuizSubmit);
    if (songdleQuizInput) {
      songdleQuizInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleSongdleQuizSubmit();
      });
    }
    if (btnSongdleQuizSkipTurn) {
      btnSongdleQuizSkipTurn.addEventListener('click', () => {
        if (!canPerformAction('songdle_skip_turn', 3000)) return;
        window.soundFX?.playClick();
        socket.emit('songdle_skip_turn');
      });
    }
    if (btnSongdleQuizNewSong) {
      btnSongdleQuizNewSong.addEventListener('click', () => {
        if (!canPerformAction('songdle_new_song', 3000)) return;
        window.soundFX?.playClick();
        socket.emit('songdle_new_song');
      });
    }

    // Delegated click for .btn-songdle-restart inside result card and .songdle-hint-audio-btn
    document.addEventListener('click', (e) => {
      const restartBtn = e.target.closest('.btn-songdle-restart');
      if (restartBtn) {
        if (!canPerformAction('songdle_new_song', 3000)) return;
        window.soundFX?.playClick();
        socket.emit('songdle_new_song');
      }
      const audioBtn = e.target.closest('.songdle-hint-audio-btn');
      if (audioBtn) {
        const audioUrl = audioBtn.getAttribute('data-audio');
        if (audioUrl) playSongdleHintAudio(audioUrl, audioBtn);
      }
    });

    // MV Quiz controls
    const btnMvQuizPlay = document.getElementById('btn-mv-quiz-play');
    if (btnMvQuizPlay) btnMvQuizPlay.addEventListener('click', playMvQuizSnippet);

    const btnMvQuizSubmit = document.getElementById('btn-mv-quiz-submit');
    const mvQuizInput = document.getElementById('mv-quiz-input');
    if (btnMvQuizSubmit) btnMvQuizSubmit.addEventListener('click', handleMvQuizSubmit);
    if (mvQuizInput) {
      mvQuizInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleMvQuizSubmit();
      });
    }

    const btnMvQuizSkipHint = document.getElementById('btn-mv-quiz-skip-hint');
    if (btnMvQuizSkipHint) {
      btnMvQuizSkipHint.addEventListener('click', () => {
        if (!canPerformAction('mv_skip_hint', 3000)) return;
        window.soundFX?.playClick();
        socket.emit('submit_mv_guess', { isSkipHint: true });
      });
    }

    const btnMvQuizSkipTurn = document.getElementById('btn-mv-quiz-skip-turn');
    if (btnMvQuizSkipTurn) {
      btnMvQuizSkipTurn.addEventListener('click', () => {
        if (!canPerformAction('mv_skip_turn', 3000)) return;
        window.soundFX?.playClick();
        socket.emit('mv_skip_turn');
      });
    }

    const btnMvQuizNewSong = document.getElementById('btn-mv-quiz-new-song');
    if (btnMvQuizNewSong) {
      btnMvQuizNewSong.addEventListener('click', () => {
        if (!canPerformAction('mv_new_song', 3000)) return;
        window.soundFX?.playClick();
        socket.emit('mv_new_song');
      });
    }

    // Delegated click for .btn-mv-restart inside result card
    document.addEventListener('click', (e) => {
      const restartBtn = e.target.closest('.btn-mv-restart');
      if (restartBtn) {
        if (!canPerformAction('mv_new_song', 3000)) return;
        window.soundFX?.playClick();
        socket.emit('mv_new_song');
      }
    });

    // Sub-category dropdown change
    if (selectSubCategory) {
      selectSubCategory.addEventListener('change', () => {
        window.soundFX?.playClick();
      });
    }

    // Mobile Sidebar Drawer
    btnToggleSidebar.addEventListener('click', openMobileSidebar);
    btnCloseSidebar.addEventListener('click', closeMobileSidebar);
    sidebarBackdrop.addEventListener('click', closeMobileSidebar);

    // Sound Controls
    const toggleMute = () => {
      isSoundMuted = !isSoundMuted;
      window.soundFX?.setMuted(isSoundMuted);
      if (audioPlayer) audioPlayer.muted = isSoundMuted;
      soundToggleBtn.textContent = isSoundMuted ? '🔇' : '🔊';
      soundToggleMobileBtn.textContent = isSoundMuted ? '🔇' : '🔊';
      showToast(isSoundMuted ? 'ปิดเสียงแล้ว' : 'เปิดเสียงแล้ว');
    };

    soundToggleBtn.addEventListener('click', toggleMute);
    soundToggleMobileBtn.addEventListener('click', toggleMute);

    volumeSlider.addEventListener('input', (e) => {
      currentVolume = parseFloat(e.target.value);
      window.soundFX?.setVolume(currentVolume);
      if (audioPlayer) audioPlayer.volume = currentVolume;
    });

    btnTestSound.addEventListener('click', () => {
      window.soundFX?.init();
      window.soundFX?.playCorrect();
      showToast('🔊 ระบบเสียงพร้อมทำงาน 100%!');
    });

    // Game Mode Box selection
    gameModeBoxes.forEach(box => {
      box.addEventListener('click', () => {
        gameModeBoxes.forEach(b => b.classList.remove('selected'));
        box.classList.add('selected');
        selectedGameMode = box.dataset.mode || 'choices';
        window.soundFX?.playClick();
      });
    });

    // Room Actions
    btnCreateRoom.addEventListener('click', handleCreateRoom);
    btnJoinRoom.addEventListener('click', handleJoinRoom);
    btnStartGame.addEventListener('click', handleStartGame);
    btnNextQuestion.addEventListener('click', handleNextQuestion);
    btnPlayAgain.addEventListener('click', handlePlayAgain);
    btnGoHome.addEventListener('click', handleLeaveRoom);
    btnLeaveRoom.addEventListener('click', handleLeaveRoom);

    // Share & QR
    displayRoomCode.addEventListener('click', copyRoomCode);
    btnCopyLink.addEventListener('click', copyInviteLink);
    btnShowQr.addEventListener('click', showQrCodeModal);
    btnCloseQr.addEventListener('click', () => modalQr.classList.remove('active'));
    modalQr.addEventListener('click', (e) => {
      if (e.target === modalQr) modalQr.classList.remove('active');
    });

    const modalEditProfile = document.getElementById('modal-edit-profile');
    if (modalEditProfile) {
      modalEditProfile.addEventListener('click', (e) => {
        if (e.target === modalEditProfile) modalEditProfile.classList.remove('active');
      });
    }

    // Choices clicks
    choicesGrid.querySelectorAll('.choice-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.index, 10);
        handleSelectChoice(idx);
      });
    });

    // Typing Mode Submission & Autocomplete
    btnSubmitTyping.addEventListener('click', handleSubmitTypingAnswer);
    typingAnswerInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        handleSubmitTypingAnswer();
      }
    });

    typingAnswerInput.addEventListener('input', handleTypingAutocomplete);
    document.addEventListener('click', (e) => {
      if (!typingModeContainer.contains(e.target)) {
        typingAutocompleteDropdown.classList.remove('show');
      }
    });

    // Hint Unlock Button
    btnRequestHint.addEventListener('click', handleUnlockNextHint);

    // Skip Buttons
    btnSkipQuestion.addEventListener('click', handleSkipQuestion);
    btnHostSkipTimer.addEventListener('click', handleHostSkipTimer);

    // Keyboard Shortcuts (1, 2, 3, 4 for choices)
    window.addEventListener('keydown', (e) => {
      if (currentRoom.state !== 'quiz' || hasAnsweredCurrentRound) return;
      if (currentRound && currentRound.mode === 'choices') {
        if (e.key === '1') handleSelectChoice(0);
        else if (e.key === '2') handleSelectChoice(1);
        else if (e.key === '3') handleSelectChoice(2);
        else if (e.key === '4') handleSelectChoice(3);
      }
    });
  }

  // --- Copy & Share Helpers ---
  function getInviteUrl() {
    return `${window.location.origin}/?room=${currentRoom.code}`;
  }

  function getNetworkInviteUrl() {
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return getInviteUrl();
    }
    if (currentRoom.localIP && currentRoom.localIP !== 'localhost') {
      return `http://${currentRoom.localIP}:${currentRoom.port}/?room=${currentRoom.code}`;
    }
    return getInviteUrl();
  }

  function copyRoomCode() {
    if (!currentRoom.code) return;
    navigator.clipboard.writeText(currentRoom.code).then(() => {
      window.soundFX?.playClick();
      showToast(`📋 คัดลอกรหัส ${currentRoom.code} แล้ว!`);
    });
  }

  function copyInviteLink() {
    const link = getNetworkInviteUrl();
    navigator.clipboard.writeText(link).then(() => {
      window.soundFX?.playClick();
      showToast('🔗 คัดลอกลิงก์เชิญเรียบร้อย ส่งให้เพื่อนได้เลย!');
    });
  }

  async function showQrCodeModal() {
    const link = getNetworkInviteUrl();
    qrModalUrl.textContent = link;
    modalQr.classList.add('active');
    window.soundFX?.playClick();

    try {
      const res = await fetch(`/api/qr?text=${encodeURIComponent(link)}`);
      const data = await res.json();
      if (data.dataUrl) {
        qrImage.src = data.dataUrl;
      }
    } catch (err) {
      console.error('Failed to load QR code:', err);
    }
  }

  // --- Socket.IO Handling ---
  function setupSocket() {
    socket = io();

    socket.on('connect', () => {
      myPlayer.id = socket.id;
    });

    socket.on('disconnect', () => {
      showToast('⚠️ หลุดการเชื่อมต่อจากเซิร์ฟเวอร์ กำลังเชื่อมต่อใหม่...');
    });

    socket.on('error_message', (msg) => {
      showToast(`❌ ${msg}`);
      window.soundFX?.playWrong();
      if (btnStartGame) {
        btnStartGame.disabled = false;
        btnStartGame.textContent = '🚀 เริ่มเกมเลย! (เริ่มเพลงพร้อมกันทุกคน)';
      }
    });

    // Room Created
    socket.on('room_created', (data) => {
      currentRoom.code = data.roomCode;
      currentRoom.settings = data.settings;
      currentRoom.players = data.players;
      currentRoom.localIP = data.localIP;
      currentRoom.port = data.port;
      myPlayer = { ...data.player, isHost: true };

      updateSidebarUI();
      updateLobbyUI();
      showScreen('lobby');
      window.soundFX?.playCorrect();
      showToast(`🎉 สร้างห้อง ${data.roomCode} สำเร็จ!`);
    });

    // Room Joined
    socket.on('room_joined', (data) => {
      currentRoom.code = data.roomCode;
      currentRoom.settings = data.settings;
      currentRoom.players = data.players;
      currentRoom.localIP = data.localIP;
      currentRoom.port = data.port;
      myPlayer = { ...data.player, isHost: false };

      updateSidebarUI();
      updateLobbyUI();
      showScreen('lobby');
      window.soundFX?.playCorrect();
      showToast(`🎉 เข้าร่วมห้อง ${data.roomCode} แล้ว!`);
    });

    // Player List Updated
    socket.on('player_list_updated', ({ players, joinedPlayer, leftPlayer }) => {
      currentRoom.players = players;
      updateSidebarPlayers();

      if (joinedPlayer && joinedPlayer.id !== socket.id) {
        window.soundFX?.playClick();
        showToast(`👋 ${joinedPlayer.name} เข้าร่วมห้องแล้ว!`);
      } else if (leftPlayer) {
        showToast(`🚪 ${leftPlayer.name} ออกจากห้อง`);
      }
    });

    // Host Changed
    socket.on('host_changed', ({ newHostId, newHostName }) => {
      if (newHostId === socket.id) {
        myPlayer.isHost = true;
        showToast('👑 คุณได้รับการแต่งตั้งเป็นหัวหน้าห้อง!');
        // Update controls for newly appointed host on whichever screen is currently active
        if (screens.reveal && screens.reveal.classList.contains('active')) {
          revealHostControls.style.display = 'block';
          revealGuestControls.style.display = 'none';
        }
        if (screens.quiz && screens.quiz.classList.contains('active')) {
          btnHostSkipTimer.style.display = 'inline-flex';
        }
        if (screens.podium && screens.podium.classList.contains('active')) {
          btnPlayAgain.style.display = 'block';
        }
      } else {
        showToast(`👑 ${newHostName} เป็นหัวหน้าห้องคนใหม่`);
      }
      updateSidebarUI();
      updateLobbyUI();
    });

    // Settings Updated
    socket.on('settings_updated', (settings) => {
      currentRoom.settings = settings;
      updateSidebarSettings();
    });

    // Game Starting (3, 2, 1)
    socket.on('game_starting', ({ countdownSeconds }) => {
      const editModal = document.getElementById('modal-edit-profile');
      if (editModal) editModal.classList.remove('active');
      showScreen('countdown');
      let count = countdownSeconds;
      countdownNumber.textContent = count;
      window.soundFX?.playTick();

      const cdInterval = setInterval(() => {
        count--;
        if (count > 0) {
          countdownNumber.textContent = count;
          window.soundFX?.playTick();
        } else {
          countdownNumber.textContent = 'GO!';
          window.soundFX?.playGo();
          clearInterval(cdInterval);
        }
      }, 1000);
    });

    // Round Start (Music plays synchronously)
    socket.on('round_start', (roundData) => {
      currentRound = roundData;
      hasAnsweredCurrentRound = false;
      candidateSongsList = roundData.candidateSongs || [];
      activeHintIndex = 1;

      // Check if this player is eliminated in survival mode
      const isSurvival = currentRoom.settings && currentRoom.settings.gameMode === 'survival';
      const myState = currentRoom.players ? currentRoom.players.find(p => p.id === socket.id) : null;
      const isEliminated = myState ? myState.isEliminated : false;

      // Update Top Badges
      quizQuestionCounter.textContent = `ข้อ ${roundData.questionNumber} / ${roundData.totalQuestions}`;
      if (quizCategoryBadge) quizCategoryBadge.textContent = roundData.category;

      if (isSurvival) {
        if (isEliminated) {
          quizStreakBadge.textContent = '💀 ตกรอบ (รับชม)';
          quizStreakBadge.style.color = '#ef4444';
        } else {
          const lives = myState && myState.lives !== undefined ? myState.lives : 3;
          const hearts = '❤️'.repeat(lives) + '🖤'.repeat(Math.max(0, 3 - lives));
          quizStreakBadge.textContent = `${hearts} (${lives}/3)`;
          quizStreakBadge.style.color = '#f43f5e';
        }
      } else {
        quizStreakBadge.textContent = `🔥 Streak x${myPlayer.streak || 0}`;
        quizStreakBadge.style.color = '';
      }
      quizQuestionText.textContent = roundData.questionText;

      // Reset Skip Buttons
      btnSkipQuestion.disabled = false;
      btnSkipQuestion.textContent = '⏩ ข้ามข้อนี้ (ยอมแพ้)';
      btnSkipQuestion.style.display = isEliminated ? 'none' : 'inline-flex';

      if (myPlayer.isHost) {
        btnHostSkipTimer.style.display = 'inline-flex';
      } else {
        btnHostSkipTimer.style.display = 'none';
      }

      // Check Round Mode: Choices, Year, Typing, Heardle, Songdle, or MV
      choicesGrid.style.display = 'none';
      typingModeContainer.style.display = 'none';
      if (heardleQuizContainer) heardleQuizContainer.style.display = 'none';
      if (songdleQuizContainer) songdleQuizContainer.style.display = 'none';
      if (mvQuizContainer) mvQuizContainer.style.display = 'none';

      const quizTopInfo = document.querySelector('.quiz-top-info');
      const timerBarContainer = document.querySelector('.timer-bar-container');
      const questionPromptBox = document.querySelector('.question-prompt-box');
      const roundControlBar = document.querySelector('.round-control-bar');
      const turntableCard = document.getElementById('quiz-turntable-card') || document.querySelector('.turntable-card');

      if (roundData.mode === 'songdle') {
        // Strip question counter, streak, top progress bar, prompt and bottom bar as requested
        if (quizTopInfo) quizTopInfo.style.display = 'none';
        if (timerBarContainer) timerBarContainer.style.display = 'none';
        if (questionPromptBox) questionPromptBox.style.display = 'none';
        if (turntableCard) turntableCard.style.display = 'none';
        if (roundControlBar) roundControlBar.style.display = 'none';
        if (songdleQuizContainer) songdleQuizContainer.style.display = 'block';
        initSongdleQuizRound(roundData);
      } else if (roundData.mode === 'mv') {
        // Strip question counter, streak, top progress bar, prompt and bottom bar as requested
        if (quizTopInfo) quizTopInfo.style.display = 'none';
        if (timerBarContainer) timerBarContainer.style.display = 'none';
        if (questionPromptBox) questionPromptBox.style.display = 'none';
        if (turntableCard) turntableCard.style.display = 'none';
        if (roundControlBar) roundControlBar.style.display = 'none';
        if (mvQuizContainer) mvQuizContainer.style.display = 'block';
        initMvQuizRound(roundData);
      } else {
        if (quizTopInfo) quizTopInfo.style.display = 'flex';
        if (timerBarContainer) timerBarContainer.style.display = 'block';
        if (questionPromptBox) questionPromptBox.style.display = 'block';
        if (roundControlBar) roundControlBar.style.display = 'flex';

        if (roundData.mode === 'heardle') {
          if (turntableCard) turntableCard.style.display = 'none';
          if (heardleQuizContainer) heardleQuizContainer.style.display = 'block';
          initHeardleQuizRound(roundData);
        } else if (roundData.mode === 'typing') {
          if (turntableCard) turntableCard.style.display = 'block';
          typingModeContainer.style.display = 'block';

          // Reset Typing Input
          typingAnswerInput.value = '';
          typingAnswerInput.disabled = isEliminated;
          btnSubmitTyping.disabled = isEliminated;
          typingAutocompleteDropdown.innerHTML = '';
          typingAutocompleteDropdown.classList.remove('show');
          if (!isEliminated) {
            setTimeout(() => typingAnswerInput.focus(), 300);
          }

          // Setup Hints
          setupHintsUI(roundData.hints);
        } else {
          // Choices or Year mode
          if (turntableCard) turntableCard.style.display = 'block';
          choicesGrid.style.display = 'grid';

          // Reset Choice Buttons
          choicesGrid.querySelectorAll('.choice-btn').forEach((btn, idx) => {
            btn.disabled = isEliminated;
            btn.classList.remove('selected', 'correct-choice', 'wrong-choice');
            const textSpan = btn.querySelector('.choice-text');
            textSpan.textContent = roundData.options[idx] || '';
          });
        }
      }

      if (isEliminated) {
        showToast('💀 คุณตกรอบแล้ว กำลังรับชมเพื่อนๆ เล่น');
      }

      // Reset Answer Progress
      const totalCount = (currentRoom.players && currentRoom.players.length) || 1;
      answeredCountText.textContent = `0 / ${totalCount} คน`;
      answeredAvatarsRow.innerHTML = '';

      // Reset Sidebar player status dots
      updateSidebarPlayers();

      // Play audio preview for standard modes
      if (roundData.mode === 'choices' || roundData.mode === 'typing' || roundData.mode === 'year') {
        playAudio(roundData.previewUrl);
      } else {
        stopAudio();
      }

      // Start Countdown Bar (Do NOT start countdown for untimed Songdle and MV modes)
      if (roundData.mode === 'songdle' || roundData.mode === 'mv') {
        clearInterval(timerInterval);
        if (timerBarFill) timerBarFill.style.width = '0%';
      } else {
        startTimer(roundData.timeLimit);
      }

      showScreen('quiz');
    });

    // Answer Receipt
    socket.on('answer_received', ({ hasSkipped, isCorrect, pointsEarned, streak }) => {
      myPlayer.streak = streak;
      if (hasSkipped) {
        showToast('⏩ คุณเลือกข้ามข้อนี้แล้ว (0 แต้ม)');
      } else if (isCorrect) {
        window.soundFX?.playCorrect();
        showToast(`⚡ ถูกต้อง! +${pointsEarned} แต้ม (Streak x${streak})`);
      } else {
        window.soundFX?.playWrong();
        showToast('❌ ยังไม่ถูกต้อง สู้ใหม่ข้อหน้านะ!');
      }

      btnSkipQuestion.textContent = '✓ บันทึกคำตอบแล้ว';
      btnSkipQuestion.disabled = true;
    });

    // Room Progress Update
    socket.on('round_progress', ({ answeredCount, totalPlayers, lastAnsweredPlayer }) => {
      answeredCountText.textContent = `${answeredCount} / ${totalPlayers} คน`;
      if (lastAnsweredPlayer) {
        const dot = document.createElement('span');
        dot.title = lastAnsweredPlayer.name;
        dot.textContent = lastAnsweredPlayer.avatar;
        dot.style.fontSize = '1.2rem';
        answeredAvatarsRow.appendChild(dot);

        // Highlight player in sidebar
        const pElem = document.getElementById(`sidebar-p-${lastAnsweredPlayer.id}`);
        if (pElem) {
          const statusDot = pElem.querySelector('.sidebar-status-dot');
          if (statusDot) statusDot.classList.add('answered');
        }
      }
    });

    // Songdle Round State Listeners
    socket.on('songdle_update', (songdleState) => {
      renderSongdleState(songdleState);
    });

    socket.on('songdle_round_started', ({ songdleState, candidateSongs }) => {
      if (candidateSongs) candidateSongsList = candidateSongs;
      renderSongdleState(songdleState);
    });

    socket.on('songdle_toast', ({ type, message }) => {
      showToast(message);
    });

    // MV Round State Listeners
    socket.on('mv_update', (mvState) => {
      renderMvState(mvState);
    });

    socket.on('mv_round_started', ({ mvState, candidateSongs }) => {
      if (candidateSongs) candidateSongsList = candidateSongs;
      renderMvState(mvState);
    });

    socket.on('mv_toast', ({ type, message }) => {
      showToast(message);
    });

    // Heardle Attempt Result in Round
    socket.on('heardle_attempt_result', ({ isCorrect, isSkipped, attemptsCount, guessText }) => {
      handleHeardleQuizResult(isCorrect, isSkipped, attemptsCount, guessText);
    });

    // Round Ended (Reveal)
    socket.on('round_end', (revealData) => {
      clearInterval(timerInterval);

      // Stop media from any mode
      if (heardleQuizAudio) heardleQuizAudio.pause();
      clearInterval(heardleQuizTimer);
      const quizVideo = document.getElementById('mv-quiz-video');
      if (quizVideo) quizVideo.pause();
      clearInterval(mvQuizTimer);

      // Highlight Choices if in choice or year mode
      if (revealData.mode === 'choices' || revealData.mode === 'year') {
        choicesGrid.querySelectorAll('.choice-btn').forEach((btn, idx) => {
          btn.disabled = true;
          if (idx === revealData.correctIndex) {
            btn.classList.add('correct-choice');
          }
        });
      } else {
        typingAnswerInput.disabled = true;
        btnSubmitTyping.disabled = true;
        typingAutocompleteDropdown.classList.remove('show');
      }

      // Populate Reveal Screen with Artwork
      const fallbackArt = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80';
      revealArtwork.src = revealData.trackInfo.artwork || fallbackArt;
      revealArtwork.onerror = function () {
        this.src = fallbackArt;
      };
      revealTitle.textContent = revealData.trackInfo.title;
      revealArtist.textContent = revealData.trackInfo.artist;

      if (revealData.mode === 'year') {
        const yearVal = revealData.trackInfo.releaseYear || (revealData.options && revealData.options[revealData.correctIndex]) || '';
        revealAlbum.textContent = yearVal ? `ปีที่ปล่อยเพลง (Release Year): ค.ศ. ${yearVal}` : (revealData.trackInfo.album ? `อัลบั้ม (Album): ${revealData.trackInfo.album}` : '');
        revealCorrectText.textContent = `ค.ศ. ${yearVal} (${revealData.trackInfo.title} - ${revealData.trackInfo.artist})`;
      } else {
        revealAlbum.textContent = revealData.trackInfo.album ? `อัลบั้ม (Album): ${revealData.trackInfo.album}` : '';
        revealCorrectText.textContent = `${revealData.trackInfo.title} - ${revealData.trackInfo.artist}`;
      }

      // User Result Banner
      const isSurvival = currentRoom.settings && currentRoom.settings.gameMode === 'survival';
      const myResult = revealData.playerResults.find(p => p.id === socket.id);
      if (myResult) {
        const userAns = myResult.typedAnswer || (revealData.options && myResult.answerIndex !== null && revealData.options[myResult.answerIndex] ? `"${revealData.options[myResult.answerIndex]}"` : 'คำตอบที่คุณเลือก');
        if (myResult.isCorrect) {
          revealUserBanner.className = 'user-result-banner correct';
          const survivalText = isSurvival ? ` (❤️ เหลือ ${myResult.lives}/3 ชีวิต)` : '';
          revealUserBanner.innerHTML = `<span>🎉 ถูกต้อง! +${myResult.pointsEarned} แต้ม${survivalText}</span>`;
        } else if (myResult.hasSkipped) {
          revealUserBanner.className = 'user-result-banner wrong';
          const survivalText = isSurvival ? ` (💔 เสีย 1 ชีวิต! เหลือ ${myResult.lives}/3)` : '';
          revealUserBanner.innerHTML = `<span>⏩ คุณข้ามข้อนี้ไป${survivalText}</span>`;
        } else if (myResult.answered) {
          revealUserBanner.className = 'user-result-banner wrong';
          if (isSurvival && myResult.isEliminated && myResult.lives === 0) {
            revealUserBanner.innerHTML = `<span>💀 เสียชีวิตสุดท้าย! คุณตกรอบแล้ว (คุณตอบ: ${userAns})</span>`;
          } else {
            const survivalText = isSurvival ? ` (💔 เสีย 1 ชีวิต! เหลือ ${myResult.lives}/3)` : '';
            revealUserBanner.innerHTML = `<span>❌ ยังไม่ถูกต้อง (คุณตอบ: ${userAns})${survivalText}</span>`;
          }
        } else {
          revealUserBanner.className = 'user-result-banner wrong';
          const survivalText = isSurvival ? ` (💔 เสีย 1 ชีวิต! เหลือ ${myResult.lives}/3)` : '';
          revealUserBanner.innerHTML = `<span>⏳ หมดเวลาตอบ!${survivalText}</span>`;
        }
      }

      // Render Leaderboard & Update Sidebar
      renderLeaderboard(revealLeaderboard, revealData.leaderboard);
      currentRoom.players = revealData.leaderboard;
      updateSidebarPlayers();

      // Host controls
      if (myPlayer.isHost) {
        revealHostControls.style.display = 'block';
        revealGuestControls.style.display = 'none';
        btnNextQuestion.disabled = false;
        btnNextQuestion.textContent = revealData.isLastQuestion ? '🏆 ดูโพเดียมผู้ชนะ! ➡️' : 'ข้อถัดไป ➡️';
      } else {
        revealHostControls.style.display = 'none';
        revealGuestControls.style.display = 'block';
      }

      showScreen('reveal');
    });

    // Game Over & Podium
    socket.on('game_over', ({ leaderboard, topThree }) => {
      clearInterval(timerInterval);
      stopAudio();
      window.soundFX?.playFanfare();

      launchConfetti();
      populatePodium(topThree);
      renderLeaderboard(finalLeaderboard, leaderboard);

      btnPlayAgain.style.display = myPlayer.isHost ? 'block' : 'none';
      showScreen('podium');
    });

    // Room Reset
    socket.on('room_reset', ({ settings, players }) => {
      currentRoom.settings = settings;
      currentRoom.players = players;
      myPlayer.score = 0;
      myPlayer.streak = 0;
      updateSidebarUI();
      updateLobbyUI();
      showScreen('lobby');
      showToast('🔄 ห้องถูกรีเซ็ตพร้อมสำหรับรอบถัดไปแล้ว!');
    });
  }

  // --- Hints Logic ---
  function setupHintsUI(hints = []) {
    hint1.textContent = hints[0] ? `💡 คำใบ้ 1: ${hints[0]}` : '💡 คำใบ้ 1: ไม่มีคำใบ้เพิ่มเติม';
    hint1.className = 'hint-item active';

    hint2.textContent = '🔒 คำใบ้ 2: ปลดล็อคเมื่อเวลาผ่านไป หรือกดขอคำใบ้';
    hint2.className = 'hint-item';

    hint3.textContent = '🔒 คำใบ้ 3: ปลดล็อคเมื่อใกล้หมดเวลา หรือกดขอคำใบ้';
    hint3.className = 'hint-item';

    btnRequestHint.style.display = 'inline-block';
    btnRequestHint.disabled = false;
  }

  function handleUnlockNextHint() {
    if (!currentRound || !currentRound.hints) return;
    activeHintIndex++;

    if (activeHintIndex === 2 && currentRound.hints[1]) {
      hint2.textContent = `💡 คำใบ้ 2: ${currentRound.hints[1]}`;
      hint2.className = 'hint-item active';
      window.soundFX?.playClick();
      showToast('💡 ปลดล็อคคำใบ้ที่ 2 แล้ว!');
    } else if (activeHintIndex >= 3 && currentRound.hints[2]) {
      hint3.textContent = `💡 คำใบ้ 3: ${currentRound.hints[2]}`;
      hint3.className = 'hint-item active';
      btnRequestHint.style.display = 'none';
      window.soundFX?.playClick();
      showToast('💡 ปลดล็อคคำใบ้ที่ 3 แล้ว!');
    }
  }

  // --- Autocomplete Live Search Suggestions ---
  function handleTypingAutocomplete() {
    const query = typingAnswerInput.value.trim().toLowerCase();
    if (!query || query.length < 1) {
      typingAutocompleteDropdown.innerHTML = '';
      typingAutocompleteDropdown.classList.remove('show');
      return;
    }

    // Filter from candidate songs pool (expanded to top 15)
    const matches = candidateSongsList.filter(item => {
      const t = (item.title || '').toLowerCase();
      const a = (item.artist || '').toLowerCase();
      return t.includes(query) || a.includes(query);
    }).slice(0, 15);

    if (matches.length === 0) {
      typingAutocompleteDropdown.innerHTML = '';
      typingAutocompleteDropdown.classList.remove('show');
      return;
    }

    typingAutocompleteDropdown.innerHTML = '';
    matches.forEach(item => {
      const row = document.createElement('div');
      row.className = 'autocomplete-item';
      row.innerHTML = `<span>🎵 <strong>${item.title}</strong></span> <span style="color:var(--text-secondary); font-size:0.8rem;">— 👤 ${item.artist}</span>`;
      row.addEventListener('click', () => {
        // Typing either song title or artist is accepted
        typingAnswerInput.value = item.title;
        typingAutocompleteDropdown.classList.remove('show');
        handleSubmitTypingAnswer();
      });
      typingAutocompleteDropdown.appendChild(row);
    });

    typingAutocompleteDropdown.classList.add('show');
  }

  // --- Audio Player Handlers ---
  function playAudio(url) {
    if (!audioPlayer) return;
    audioPlayer.src = url;
    audioPlayer.volume = currentVolume;
    audioPlayer.muted = isSoundMuted;

    vinylDisc.classList.remove('paused');
    eqBars.style.opacity = '1';
    audioStatusText.textContent = 'เพลงกำลังเล่น... ฟังแล้วทายเลย!';

    const promise = audioPlayer.play();
    if (promise !== undefined) {
      promise.catch(err => {
        console.warn('Autoplay prevented:', err);
        audioStatusText.innerHTML = '⚠️ แตะที่นี่เพื่อเปิดเสียง <button id="btn-manual-play" style="padding:2px 8px; font-size:0.8rem;">เปิดเสียง</button>';
        const btnManual = document.getElementById('btn-manual-play');
        if (btnManual) {
          btnManual.onclick = () => {
            audioPlayer.play();
            audioStatusText.textContent = 'เพลงกำลังเล่น...';
          };
        }
      });
    }
  }

  function stopAudio() {
    if (!audioPlayer) return;
    audioPlayer.pause();
    vinylDisc.classList.add('paused');
    eqBars.style.opacity = '0.3';
  }

  // --- Timer Handling ---
  function startTimer(seconds) {
    clearInterval(timerInterval);
    const startTime = Date.now();
    const durationMs = seconds * 1000;
    timerBarFill.style.width = '100%';

    timerInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, durationMs - elapsed);
      const pct = (remaining / durationMs) * 100;
      timerBarFill.style.width = `${pct}%`;

      // Auto unlock hint 2 at 1/3 elapsed, hint 3 at 2/3 elapsed
      if (currentRound && currentRound.mode === 'typing') {
        if (elapsed > durationMs * 0.35 && activeHintIndex < 2) {
          handleUnlockNextHint();
        }
        if (elapsed > durationMs * 0.70 && activeHintIndex < 3) {
          handleUnlockNextHint();
        }
      }

      if (remaining <= 0) {
        clearInterval(timerInterval);
        if (!hasAnsweredCurrentRound) {
          choicesGrid.querySelectorAll('.choice-btn').forEach(b => b.disabled = true);
          typingAnswerInput.disabled = true;
          btnSubmitTyping.disabled = true;
        }
      }
    }, 50);
  }

  // --- Actions ---
  function handleCreateRoom() {
    const name = myPlayer.name || (playerNameInput ? playerNameInput.value.trim() : '') || 'หัวหน้าห้อง';
    window.soundFX?.init();
    window.soundFX?.playClick();

    // Collect settings from UI
    const gameMode = selectedGameMode || 'choices';
    const mainCat = selectedMainCategoryId || 'mix';
    const subCat = selectSubCategory ? selectSubCategory.value : mainCat;
    const categorySelection = (subCat === mainCat || !subCat) ? [mainCat] : [subCat];

    const questionCount = parseInt(selectQuestionCount.value, 10);
    const timePerRound = parseInt(selectRoundTimer.value, 10);

    socket.emit('create_room', {
      name,
      avatar: myPlayer.avatar,
      settings: {
        gameMode,
        categories: categorySelection,
        questionCount,
        timePerRound
      }
    });
  }

  function handleJoinRoom() {
    const name = myPlayer.name || (playerNameInput ? playerNameInput.value.trim() : '') || 'ผู้เล่น';
    const code = roomCodeInput.value.trim().toUpperCase();

    if (!code) {
      showToast('⚠️ กรุณากรอกรหัสห้อง');
      return;
    }

    window.soundFX?.init();
    window.soundFX?.playClick();

    socket.emit('join_room', {
      roomCode: code,
      name,
      avatar: myPlayer.avatar
    });
  }

  function handleStartGame() {
    window.soundFX?.init();
    window.soundFX?.playClick();
    btnStartGame.disabled = true;
    btnStartGame.textContent = '⏳ กำลังดึงเพลงจาก API...';
    socket.emit('start_game');

    setTimeout(() => {
      btnStartGame.disabled = false;
      btnStartGame.textContent = '🚀 เริ่มเกมเลย! (เริ่มเพลงพร้อมกันทุกคน)';
    }, 5000);
  }

  function handleSelectChoice(index) {
    if (hasAnsweredCurrentRound || currentRoom.state !== 'quiz') return;
    hasAnsweredCurrentRound = true;

    window.soundFX?.playLock();

    choicesGrid.querySelectorAll('.choice-btn').forEach((btn, idx) => {
      if (idx === index) {
        btn.classList.add('selected');
      } else {
        btn.disabled = true;
      }
    });

    socket.emit('submit_answer', { optionIndex: index });
  }

  function handleSubmitTypingAnswer() {
    if (hasAnsweredCurrentRound || currentRoom.state !== 'quiz') return;
    const answer = typingAnswerInput.value.trim();
    if (!answer) {
      showToast('⚠️ กรุณาพิมพ์คำตอบ');
      return;
    }

    hasAnsweredCurrentRound = true;
    window.soundFX?.playLock();

    typingAnswerInput.disabled = true;
    btnSubmitTyping.disabled = true;
    typingAutocompleteDropdown.classList.remove('show');

    socket.emit('submit_answer', { typedAnswer: answer });
  }

  function handleSkipQuestion() {
    if (hasAnsweredCurrentRound || currentRoom.state !== 'quiz') return;
    hasAnsweredCurrentRound = true;

    window.soundFX?.playClick();
    socket.emit('skip_question');
  }

  function handleHostSkipTimer() {
    if (!myPlayer.isHost || currentRoom.state !== 'quiz') return;
    window.soundFX?.playClick();
    btnHostSkipTimer.disabled = true;
    socket.emit('host_skip_timer');
  }

  function handleNextQuestion() {
    btnNextQuestion.disabled = true;
    window.soundFX?.playClick();
    socket.emit('next_question');
  }

  function handlePlayAgain() {
    window.soundFX?.playClick();
    socket.emit('restart_room');
  }

  function handleLeaveRoom() {
    window.location.href = window.location.pathname;
  }

  // =========================================================================
  // 🔍 MUSIC SEARCH (MUSICBRAINZ + ITUNES) CLIENT LOGIC
  // =========================================================================

  function setupSearchListeners() {
    if (musicSearchForm) {
      musicSearchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        performMusicSearch();
      });
    }

    if (btnSubmitSearch) {
      btnSubmitSearch.addEventListener('click', performMusicSearch);
    }

    if (musicSearchInput) {
      musicSearchInput.addEventListener('input', () => {
        if (btnClearSearch) {
          btnClearSearch.style.display = musicSearchInput.value ? 'flex' : 'none';
        }
      });
      musicSearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          performMusicSearch();
        }
      });
    }

    if (btnClearSearch) {
      btnClearSearch.addEventListener('click', () => {
        musicSearchInput.value = '';
        btnClearSearch.style.display = 'none';
        musicSearchInput.focus();
      });
    }

    // Quick tag pills
    document.querySelectorAll('.search-tag-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const query = pill.dataset.query;
        if (query && musicSearchInput) {
          musicSearchInput.value = query;
          if (btnClearSearch) btnClearSearch.style.display = 'flex';
          performMusicSearch();
        }
      });
    });

    // Filter chips
    document.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        currentSearchFilter = chip.dataset.filter || 'all';
        renderSearchResults();
        window.soundFX?.playClick();
      });
    });

    // Country change
    if (musicSearchCountry) {
      musicSearchCountry.addEventListener('change', () => {
        if (musicSearchInput && musicSearchInput.value.trim()) {
          performMusicSearch();
        }
      });
    }
  }

  async function performMusicSearch() {
    const query = (musicSearchInput?.value || '').trim();
    if (!query) {
      showToast('⚠️ กรุณาพิมพ์ชื่อเพลง ศิลปิน หรืออัลบั้มที่ต้องการค้นหา');
      musicSearchInput?.focus();
      return;
    }

    const country = musicSearchCountry ? musicSearchCountry.value : 'TH';

    // Set UI to loading state
    if (searchIdleState) searchIdleState.style.display = 'none';
    if (searchEmptyState) searchEmptyState.style.display = 'none';
    if (searchResultsGrid) searchResultsGrid.style.display = 'none';
    if (searchStatusBanner) searchStatusBanner.style.display = 'none';
    if (searchLoadingState) searchLoadingState.style.display = 'block';

    if (btnSubmitSearch) {
      btnSubmitSearch.disabled = true;
      btnSubmitSearch.innerHTML = '<span>กำลังค้นหา...</span> ⏳';
    }

    window.soundFX?.playClick();

    try {
      const url = `/api/search?q=${encodeURIComponent(query)}&country=${encodeURIComponent(country)}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      currentSearchResults = data.results || [];

      // Update counters
      const itunesCount = currentSearchResults.filter(r => r.sources.includes('itunes')).length;
      const deezerCount = currentSearchResults.filter(r => r.sources.includes('deezer')).length;
      const mbCount = currentSearchResults.filter(r => r.sources.includes('musicbrainz')).length;
      const bothCount = currentSearchResults.filter(r => r.sources.length > 1).length;

      if (countAll) countAll.textContent = currentSearchResults.length;
      if (countItunes) countItunes.textContent = itunesCount;
      if (countDeezer) countDeezer.textContent = deezerCount;
      if (countMb) countMb.textContent = mbCount;
      if (countBoth) countBoth.textContent = bothCount;

      // Handle Partial Failure & Failover Notifications
      handleSearchStatusNotices(data.sources, country);

      if (searchLoadingState) searchLoadingState.style.display = 'none';

      if (currentSearchResults.length === 0) {
        if (searchFilterBar) searchFilterBar.style.display = 'none';
        if (searchEmptyState) searchEmptyState.style.display = 'block';
      } else {
        if (searchFilterBar) searchFilterBar.style.display = 'flex';
        renderSearchResults();
      }
    } catch (err) {
      console.error('Search request failed:', err);
      if (searchLoadingState) searchLoadingState.style.display = 'none';
      if (searchEmptyState) searchEmptyState.style.display = 'block';
      if (searchStatusBanner) {
        searchStatusBanner.className = 'search-status-banner error';
        searchStatusBanner.innerHTML = `⚠️ เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง (${err.message})`;
        searchStatusBanner.style.display = 'flex';
      }
    } finally {
      if (btnSubmitSearch) {
        btnSubmitSearch.disabled = false;
        btnSubmitSearch.innerHTML = '<span>ค้นหา</span> 🚀';
      }
    }
  }

  function handleSearchStatusNotices(sources, country) {
    if (!searchStatusBanner || !sources) return;

    const failed = [];
    const active = [];
    if (sources.itunes?.status === 'ok') active.push('Apple Music');
    else if (sources.itunes?.status === 'error') failed.push('Apple Music');

    if (sources.deezer?.status === 'ok') active.push('Deezer');
    else if (sources.deezer?.status === 'error') failed.push('Deezer');

    if (sources.musicbrainz?.status === 'ok') active.push('MusicBrainz');
    else if (sources.musicbrainz?.status === 'error') failed.push('MusicBrainz');

    if (failed.length > 0 && active.length > 0) {
      searchStatusBanner.className = 'search-status-banner warning';
      searchStatusBanner.innerHTML = `⚡ ${failed.join(', ')} ติดลิมิตหรือไม่ตอบสนองชั่วคราว — ระบบสลับมาดึงข้อมูลร่วมจาก ${active.join(' + ')} ให้อัตโนมัติ เพลงไม่หาย`;
      searchStatusBanner.style.display = 'flex';
    } else if (failed.length > 0 && active.length === 0) {
      searchStatusBanner.className = 'search-status-banner error';
      searchStatusBanner.innerHTML = `❌ ไม่สามารถดึงข้อมูลได้จาก API ทั้งหมด กรุณาลองใหม่อีกครั้งในภายหลัง`;
      searchStatusBanner.style.display = 'flex';
    } else {
      searchStatusBanner.style.display = 'none';
    }
  }

  function renderSearchResults() {
    if (!searchResultsGrid) return;
    searchResultsGrid.innerHTML = '';

    // Filter by currentSearchFilter
    const filtered = currentSearchResults.filter(item => {
      if (currentSearchFilter === 'all') return true;
      if (currentSearchFilter === 'itunes') return item.sources.includes('itunes');
      if (currentSearchFilter === 'deezer') return item.sources.includes('deezer');
      if (currentSearchFilter === 'musicbrainz') return item.sources.includes('musicbrainz');
      if (currentSearchFilter === 'both') return item.sources.length > 1;
      return true;
    });

    if (filtered.length === 0) {
      if (searchEmptyState) searchEmptyState.style.display = 'block';
      searchResultsGrid.style.display = 'none';
      return;
    }

    if (searchEmptyState) searchEmptyState.style.display = 'none';
    searchResultsGrid.style.display = 'grid';

    filtered.forEach(item => {
      const card = document.createElement('div');
      card.className = 'search-card';

      // Badges
      let badgesHtml = '';
      if (item.sources.length > 1) {
        badgesHtml += `<span class="badge-source badge-both">✨ รวม ${item.sources.length} แหล่ง</span>`;
      }
      if (item.sources.includes('itunes')) {
        badgesHtml += `<span class="badge-source badge-apple">🍎 Apple Music</span>`;
      }
      if (item.sources.includes('deezer')) {
        badgesHtml += `<span class="badge-source badge-deezer">🎧 Deezer</span>`;
      }
      if (item.sources.includes('musicbrainz')) {
        badgesHtml += `<span class="badge-source badge-mb">🎼 MusicBrainz</span>`;
      }

      // External Links
      let actionsHtml = '';
      if (item.appleMusicUrl) {
        actionsHtml += `
          <a href="${item.appleMusicUrl}" target="_blank" rel="noopener noreferrer" class="btn-external-link btn-apple" title="เปิดฟังเพลงบน Apple Music">
            🍎 ฟังบน Apple Music ↗
          </a>
        `;
      }
      if (item.deezerUrl) {
        actionsHtml += `
          <a href="${item.deezerUrl}" target="_blank" rel="noopener noreferrer" class="btn-external-link btn-deezer" title="เปิดฟังเพลงบน Deezer">
            🎧 ฟังบน Deezer ↗
          </a>
        `;
      }
      if (item.musicBrainzUrl) {
        actionsHtml += `
          <a href="${item.musicBrainzUrl}" target="_blank" rel="noopener noreferrer" class="btn-external-link btn-mb" title="ดูข้อมูลบันทึกเพลงบน MusicBrainz">
            📖 ข้อมูล MusicBrainz ↗
          </a>
        `;
      }

      // Artwork with fallback
      const artworkSrc = item.artwork || '';

      card.innerHTML = `
        <div class="search-card-thumb-box">
          ${artworkSrc ? `
            <img src="${artworkSrc}" alt="${item.title}" class="search-card-img" loading="lazy" onerror="this.onerror=null; this.parentElement.innerHTML='<span class=\\'search-card-fallback-icon\\'>🎵</span>';">
          ` : `
            <span class="search-card-fallback-icon">🎵</span>
          `}
        </div>
        <div class="search-card-info">
          <div class="search-card-title" title="${item.title}">${item.title}</div>
          <div class="search-card-artist" title="${item.artist}">👤 ${item.artist}</div>
          <div class="search-card-meta">
            ${item.album ? `<span>💿 ${item.album}</span>` : ''}
            ${item.releaseDate ? `<span>• 📅 ${item.releaseDate}</span>` : ''}
          </div>
          <div class="search-card-badges">
            ${badgesHtml}
          </div>
          <div class="search-card-actions">
            ${actionsHtml}
          </div>
        </div>
      `;

      searchResultsGrid.appendChild(card);
    });
  }

  // --- UI Updates for Sidebar & Lobby ---
  function updateSidebarUI() {
    sidebarRoomInfo.style.display = 'block';
    sidebarSettingsBox.style.display = 'flex';
    btnLeaveRoom.style.display = 'block';

    displayRoomCode.textContent = currentRoom.code;
    displayNetworkUrl.textContent = getNetworkInviteUrl();

    updateSidebarSettings();
    updateSidebarPlayers();
  }

  function getCategoryFriendlyName(catId) {
    if (!catId || catId === 'mix') return '🔀 มิกซ์รวมทุกหมวด (All-Stars Mix)';
    if (mainCategoriesData[catId]) {
      return mainCategoriesData[catId].name;
    }
    for (const main of Object.values(mainCategoriesData)) {
      if (main.subcategories) {
        const sub = main.subcategories.find(s => s.id === catId);
        if (sub) return `${main.icon || '🎵'} ${sub.name}`;
      }
    }
    return catId;
  }

  function updateSidebarSettings() {
    const s = currentRoom.settings;
    const modeNames = {
      choices: '🔘 ช้อยส์ (Choices)',
      typing: '✍️ พิมพ์ตอบ (Typing)',
      mixed: '🔀 ผสมผสาน (Mixed)',
      survival: '💀 เซอร์ไววัล (Survival)',
      heardle: '🎧 Heardle (ฟังเสียงสั้น)',
      songdle: '🟩 Songdle (สุ่มเพลงทั่วโลก)',
      mv: '🎬 ทายจาก MV (Video)'
    };
    sidebarModeText.textContent = modeNames[s.gameMode] || s.gameMode;

    const cats = s.categories || ['mix'];
    sidebarCatText.textContent = cats.map(getCategoryFriendlyName).join(', ');
    sidebarRoundText.textContent = `${s.questionCount} ข้อ / ${s.timePerRound}วิ`;
  }

  function updateSidebarPlayers() {
    const players = currentRoom.players || [];
    sidebarPlayerCount.textContent = `${players.length} คน`;
    mobilePlayerCount.textContent = `${players.length}`;

    sidebarPlayersList.innerHTML = '';

    if (!currentRoom.code || players.length === 0) {
      // Pre-join: show player's own profile card with pencil icon
      const prejoin = document.createElement('div');
      prejoin.className = 'sidebar-prejoin-card';
      prejoin.innerHTML = `
        <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:0.4rem;">👤 โพรไฟล์ของคุณ:</div>
        <div style="display:flex; align-items:center; justify-content:space-between; gap:0.5rem;">
          <div style="display:flex; align-items:center; gap:0.5rem; min-width:0;">
            <span style="font-size: 1.35rem;">${myPlayer.avatar}</span>
            <span class="sidebar-player-name" style="max-width:110px;">${myPlayer.name}</span>
          </div>
          <button type="button" class="btn-pencil-edit" id="btn-prejoin-pencil" title="แก้ไขชื่อและอวาตาร์">✏️</button>
        </div>
      `;
      const pBtn = prejoin.querySelector('#btn-prejoin-pencil');
      if (pBtn) {
        pBtn.addEventListener('click', openEditProfileModal);
      }
      sidebarPlayersList.appendChild(prejoin);
      return;
    }

    const isSurvival = currentRoom.settings && currentRoom.settings.gameMode === 'survival';

    players.forEach(p => {
      const item = document.createElement('div');
      item.id = `sidebar-p-${p.id}`;
      item.className = `sidebar-player-item ${p.id === socket.id ? 'is-you' : ''} ${p.isEliminated ? 'is-eliminated' : ''}`;
      
      const isYou = (p.id === socket.id);

      let scoreDisplay = `${(p.score || 0).toLocaleString()} pts`;
      if (isSurvival) {
        if (p.isEliminated) {
          scoreDisplay += ` · <span style="color:#ef4444; font-weight:700;">💀 ตกรอบ</span>`;
        } else {
          const lives = p.lives !== undefined ? p.lives : 3;
          const hearts = '❤️'.repeat(lives) + '🖤'.repeat(Math.max(0, 3 - lives));
          scoreDisplay += ` · <span style="font-size:0.75rem;">${hearts}</span>`;
        }
      }

      item.innerHTML = `
        <div class="sidebar-player-left">
          <span style="font-size: 1.3rem;">${p.avatar}</span>
          <div style="min-width:0;">
            <div style="display:flex; align-items:center; gap:4px;">
              <span class="sidebar-player-name">
                ${p.name} ${p.isHost ? '👑' : ''} ${isYou ? '<span class="you-badge">(คุณ)</span>' : ''}
              </span>
              ${isYou && (!currentRoom.state || currentRoom.state === 'lobby') ? '<button type="button" class="btn-pencil-edit" id="btn-room-pencil" title="แก้ไขชื่อและอวาตาร์">✏️</button>' : ''}
            </div>
            <div class="sidebar-player-score">${scoreDisplay}</div>
          </div>
        </div>
        <div class="sidebar-status-dot ${p.answered ? 'answered' : ''}" title="${p.answered ? 'ตอบแล้ว' : 'กำลังคิด'}"></div>
      `;

      if (isYou) {
        const editBtn = item.querySelector('#btn-room-pencil');
        if (editBtn) {
          editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openEditProfileModal();
          });
        }
      }

      sidebarPlayersList.appendChild(item);
    });
  }

  function updateLobbyUI() {
    const s = currentRoom.settings;
    const modeNames = {
      choices: '🔘 ช้อยส์ 4 ตัวเลือก (Multiple Choice)',
      typing: '✍️ พิมพ์ตอบ + มีคำใบ้ & ค้นหาเพลง (Type-in Mode)',
      mixed: '🔀 ผสมผสาน (Mixed Mode)',
      survival: '💀 เซอร์ไววัล 3 ชีวิต (Survival Mode)',
      heardle: '🎧 Heardle 5 ระดับ (ฟังเสียงสั้น ค่อยๆ เพิ่มเวลา)',
      songdle: '🟩 Songdle (สุ่มเพลงทั่วโลก ทายด้วยตารางคำใบ้สี)',
      mv: '🎬 ทายจาก MV (ดูคลิป MV สั้นๆ เพิ่มเวลาเรื่อยๆ)'
    };
    lobbySummaryMode.textContent = modeNames[s.gameMode] || s.gameMode;
    lobbySummaryCats.textContent = (s.categories || ['mix']).map(getCategoryFriendlyName).join(', ');
    lobbySummaryRounds.textContent = `${s.questionCount} ข้อ (${s.timePerRound} วินาที/ข้อ)`;

    if (myPlayer.isHost) {
      hostControls.style.display = 'block';
      guestControls.style.display = 'none';
    } else {
      hostControls.style.display = 'none';
      guestControls.style.display = 'block';
    }
  }

  function renderLeaderboard(container, leaderboard) {
    container.innerHTML = '';
    const isSurvival = currentRoom.settings && currentRoom.settings.gameMode === 'survival';

    leaderboard.forEach(item => {
      const row = document.createElement('div');
      row.className = `leaderboard-item ${item.rank <= 3 ? 'is-top' : ''} ${item.id === socket.id ? 'is-you' : ''}`;

      let rankText = item.rank;
      if (item.rank === 1) rankText = '🥇';
      else if (item.rank === 2) rankText = '🥈';
      else if (item.rank === 3) rankText = '🥉';

      let deltaText = '';
      if (isSurvival) {
        if (item.isEliminated) {
          deltaText = `<div class="score-delta" style="color:#ef4444; font-weight:700;">💀 ตกรอบ</div>`;
        } else {
          const lives = item.lives !== undefined ? item.lives : 3;
          const hearts = '❤️'.repeat(lives) + '🖤'.repeat(Math.max(0, 3 - lives));
          deltaText = `<div class="score-delta" style="color:#f43f5e;">${hearts} (${lives}/3)</div>`;
        }
      } else if (item.streak > 1) {
        deltaText = `<div class="score-delta">🔥 Streak x${item.streak}</div>`;
      }

      row.innerHTML = `
        <div class="player-rank-col">
          <span class="rank-badge">${rankText}</span>
          <span style="font-size: 1.3rem;">${item.avatar}</span>
          <strong style="color: #fff;">${item.name} ${item.id === socket.id ? '(คุณ)' : ''}</strong>
        </div>
        <div class="player-score-col">
          <div class="score-num">${item.score.toLocaleString()} pts</div>
          ${deltaText}
        </div>
      `;
      container.appendChild(row);
    });
  }

  function populatePodium(topThree) {
    const isSurvival = currentRoom.settings && currentRoom.settings.gameMode === 'survival';

    if (topThree[0]) {
      document.getElementById('podium-1-avatar').textContent = topThree[0].avatar;
      document.getElementById('podium-1-name').textContent = topThree[0].name;
      const survivorBadge = isSurvival ? (!topThree[0].isEliminated ? ' 👑 ผู้รอดชีวิต!' : '') : '';
      document.getElementById('podium-1-score').textContent = `${topThree[0].score.toLocaleString()} pts${survivorBadge}`;
      document.getElementById('podium-1').style.display = 'flex';
    } else {
      document.getElementById('podium-1').style.display = 'none';
    }

    if (topThree[1]) {
      document.getElementById('podium-2-avatar').textContent = topThree[1].avatar;
      document.getElementById('podium-2-name').textContent = topThree[1].name;
      document.getElementById('podium-2-score').textContent = `${topThree[1].score.toLocaleString()} pts`;
      document.getElementById('podium-2').style.display = 'flex';
    } else {
      document.getElementById('podium-2').style.display = 'none';
    }

    if (topThree[2]) {
      document.getElementById('podium-3-avatar').textContent = topThree[2].avatar;
      document.getElementById('podium-3-name').textContent = topThree[2].name;
      document.getElementById('podium-3-score').textContent = `${topThree[2].score.toLocaleString()} pts`;
      document.getElementById('podium-3').style.display = 'flex';
    } else {
      document.getElementById('podium-3').style.display = 'none';
    }
  }

  // --- Confetti Particle Engine ---
  function launchConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const colors = ['#f43f5e', '#ec4899', '#a855f7', '#3b82f6', '#06b6d4', '#10b981', '#fbbf24'];

    for (let i = 0; i < 120; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        w: Math.random() * 10 + 6,
        h: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 4 + 3,
        rot: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 6
      });
    }

    let frameCount = 0;
    function render() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frameCount++;

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.rotSpeed;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });

      if (frameCount < 220) {
        requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    render();
  }

  // ========================================================
  // SONGDLE QUIZ MODE (LOL-DLE STYLE - WORLDWIDE POOL)
  // ========================================================
  let currentSongdleState = null;
  let selectedSongdleGuess = null;
  let songdleHintAudio = new Audio();
  let songdleHintTimer = null;

  function playSongdleHintAudio(url, btnElem) {
    if (!url) return;
    try {
      if (songdleHintAudio) {
        songdleHintAudio.pause();
        songdleHintAudio.currentTime = 0;
      }
      clearInterval(songdleHintTimer);

      songdleHintAudio.src = url;
      songdleHintAudio.volume = currentVolume;
      songdleHintAudio.play().then(() => {
        if (btnElem) btnElem.textContent = '🔊 กำลังเล่น (5วิ)...';
        let remaining = 5;
        songdleHintTimer = setInterval(() => {
          remaining--;
          if (remaining <= 0) {
            clearInterval(songdleHintTimer);
            if (songdleHintAudio) songdleHintAudio.pause();
            if (btnElem) btnElem.textContent = '🔊 ฟังเสียง 5 วิ';
          }
        }, 1000);
      }).catch(err => {
        console.warn('Audio play error:', err);
      });
    } catch (e) {
      console.warn('Audio error:', e);
    }
  }

  function initSongdleQuizRound(roundData) {
    const input = document.getElementById('songdle-quiz-input');
    const dropdown = document.getElementById('songdle-quiz-dropdown');

    if (input) {
      input.value = '';
    }
    selectedSongdleGuess = null;

    if (roundData.candidateSongs) {
      candidateSongsList = roundData.candidateSongs;
    }

    bindAutocomplete(input, dropdown, () => candidateSongsList, (item) => {
      selectedSongdleGuess = item;
      if (input) input.value = item.displayText || `${item.title} - ${item.artist}`;
    });

    if (roundData.songdleState) {
      renderSongdleState(roundData.songdleState);
    }
  }

  function renderSongdleState(state) {
    if (!state) return;
    currentSongdleState = state;

    const myPlayerId = socket.id;
    const isSingle = state.isSinglePlayer;
    const activePlayer = state.activePlayer;
    const isMyTurn = isSingle || (activePlayer && activePlayer.id === myPlayerId);

    // 1. Turn Banner
    const turnBanner = document.getElementById('songdle-turn-banner');
    const turnAvatar = document.getElementById('songdle-turn-avatar');
    const turnTitle = document.getElementById('songdle-turn-title');
    const turnDesc = document.getElementById('songdle-turn-desc');
    const skipTurnBtn = document.getElementById('btn-songdle-quiz-skip-turn');
    const input = document.getElementById('songdle-quiz-input');
    const submitBtn = document.getElementById('btn-songdle-quiz-submit');
    const inputCard = document.getElementById('songdle-quiz-input-card');
    const resultCard = document.getElementById('songdle-quiz-result-card');

    if (turnBanner) {
      if (state.status !== 'playing') {
        turnBanner.classList.remove('my-turn');
        if (turnAvatar) turnAvatar.textContent = state.status === 'won' ? '🎉' : '😢';
        if (turnTitle) turnTitle.textContent = state.status === 'won' ? 'จบรอบแล้ว: ทายถูกต้อง!' : 'จบรอบแล้ว: คำใบ้หมดแล้ว';
        if (turnDesc) turnDesc.textContent = 'กด "เปลี่ยนเพลงใหม่" เพื่อเริ่มเล่นรอบถัดไป';
        if (skipTurnBtn) skipTurnBtn.style.display = 'none';
      } else if (isSingle) {
        turnBanner.classList.remove('my-turn');
        if (turnAvatar) turnAvatar.textContent = '🎯';
        if (turnTitle) turnTitle.textContent = 'โหมดเล่นคนเดียว';
        if (turnDesc) turnDesc.textContent = 'ส่งคำตอบได้เรื่อยๆ ทุกครั้งที่ตอบผิดจะเปิดคำใบ้เพิ่ม!';
        if (skipTurnBtn) skipTurnBtn.style.display = 'none';
      } else {
        // Multiplayer
        if (isMyTurn) {
          turnBanner.classList.add('my-turn');
          if (turnAvatar) turnAvatar.textContent = (activePlayer && activePlayer.avatar) || '✨';
          if (turnTitle) turnTitle.textContent = '✨ ถึงตาของคุณแล้ว!';
          if (turnDesc) turnDesc.textContent = 'ทายชื่อเพลงที่คิดว่าใช่ หรือกด "ข้ามตาของฉัน" เพื่อส่งต่อให้เพื่อน';
          if (skipTurnBtn) {
            skipTurnBtn.style.display = 'inline-flex';
            skipTurnBtn.disabled = false;
          }
        } else {
          turnBanner.classList.remove('my-turn');
          if (turnAvatar) turnAvatar.textContent = (activePlayer && activePlayer.avatar) || '⏳';
          if (turnTitle) turnTitle.textContent = `⏳ ตาของ ${activePlayer ? activePlayer.name : 'ผู้เล่นอื่น'}`;
          if (turnDesc) turnDesc.textContent = `กำลังรอให้ ${activePlayer ? activePlayer.name : 'ผู้เล่น'} ทายเพลงปริศนา...`;
          if (skipTurnBtn) skipTurnBtn.style.display = 'none';
        }
      }
    }

    // Input & Submit state
    if (input && submitBtn) {
      if (state.status !== 'playing') {
        input.disabled = true;
        submitBtn.disabled = true;
        submitBtn.textContent = 'จบรอบแล้ว';
      } else if (isMyTurn) {
        input.disabled = false;
        input.placeholder = isSingle
          ? '🔎 พิมพ์ชื่อเพลงหรือศิลปินที่ต้องการทาย (สุ่มจากเพลงทั่วโลก)...'
          : '🔎 พิมพ์ชื่อเพลงหรือศิลปินที่ต้องการทาย (ตาของคุณ)...';
        submitBtn.disabled = false;
        submitBtn.textContent = '🎯 ทายเพลงนี้!';
      } else {
        input.disabled = true;
        input.placeholder = `⏳ รอตาของคุณ (${activePlayer ? activePlayer.name : 'ผู้เล่นอื่น'} กำลังเล่น)...`;
        submitBtn.disabled = true;
        submitBtn.textContent = '⏳ รอตาของคุณ...';
      }
    }

    // 2. Hints Deck
    const hintsBadge = document.getElementById('songdle-hints-count-badge');
    if (hintsBadge) {
      hintsBadge.textContent = `เปิดแล้ว ${state.unlockedHintCount} / ${state.maxHints || 5} ข้อ`;
    }

    const hintsGrid = document.getElementById('songdle-hints-grid');
    if (hintsGrid && state.hints) {
      hintsGrid.innerHTML = state.hints.map(h => {
        if (h.isUnlocked) {
          return `
            <div class="songdle-hint-card unlocked">
              <div class="songdle-hint-icon">${h.icon || '💡'}</div>
              <div class="songdle-hint-info">
                <div class="songdle-hint-title">${h.title}</div>
                <div class="songdle-hint-val" title="${h.value}">${h.value}</div>
                ${h.previewUrl ? `<button type="button" class="songdle-hint-audio-btn" data-audio="${h.previewUrl}">🔊 ฟังเสียง 5 วิ</button>` : ''}
              </div>
            </div>
          `;
        } else {
          return `
            <div class="songdle-hint-card locked">
              <div class="songdle-hint-icon">🔒</div>
              <div class="songdle-hint-info">
                <div class="songdle-hint-title">${h.title}</div>
                <div class="songdle-hint-val" style="font-size:0.75rem; color:var(--text-muted); font-weight:normal;">
                  ตอบผิดเพื่อปลดล็อค (ข้อ ${h.index})
                </div>
              </div>
            </div>
          `;
        }
      }).join('');
    }

    // 3. Guesses Table
    const tbody = document.getElementById('songdle-quiz-tbody');
    const emptyHint = document.getElementById('songdle-quiz-empty-hint');
    if (tbody) {
      tbody.innerHTML = '';
      if (state.guesses && state.guesses.length > 0) {
        if (emptyHint) emptyHint.style.display = 'none';
        state.guesses.forEach(g => {
          const row = document.createElement('tr');
          row.className = 'songdle-row';
          const comp = g.comparison;
          const yearArrow = comp.year.direction === 'up'
            ? '<span class="cell-arrow-icon">⬆️ (ใหม่กว่า)</span>'
            : (comp.year.direction === 'down' ? '<span class="cell-arrow-icon">⬇️ (เก่ากว่า)</span>' : '');

          row.innerHTML = `
            <td>
              <div class="songdle-cell cell-${comp.song.status} songdle-cell-song">
                <img src="${(g.track && g.track.artwork) || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100'}" class="cell-art" alt="">
                <div style="min-width:0; text-align:left;">
                  <div class="cell-val" style="font-size:0.82rem; font-weight:800;">${comp.song.value}</div>
                  ${!isSingle ? `<div style="font-size:0.68rem; color:rgba(255,255,255,0.7);">${g.playerAvatar || '🎧'} ${g.playerName || 'ผู้เล่น'}</div>` : ''}
                </div>
              </div>
            </td>
            <td>
              <div class="songdle-cell cell-${comp.artist.status}">
                <span class="cell-val">${comp.artist.value}</span>
              </div>
            </td>
            <td>
              <div class="songdle-cell cell-${comp.artistType.status}">
                <span class="cell-val">${comp.artistType.value}</span>
              </div>
            </td>
            <td>
              <div class="songdle-cell cell-${comp.genre.status}">
                <span class="cell-val">${comp.genre.value}</span>
              </div>
            </td>
            <td>
              <div class="songdle-cell cell-${comp.country.status}">
                <span class="cell-val">${comp.country.value}</span>
              </div>
            </td>
            <td>
              <div class="songdle-cell cell-${comp.year.status}">
                <span class="cell-val">${comp.year.value}</span>
                ${yearArrow}
              </div>
            </td>
          `;
          tbody.appendChild(row);
        });
      } else {
        if (emptyHint) emptyHint.style.display = 'block';
      }
    }

    // 4. Result Card (Won or Lost)
    if (resultCard) {
      if (state.status === 'won') {
        resultCard.style.display = 'block';
        resultCard.className = 'songdle-result-card won';
        if (inputCard) inputCard.style.display = 'none';

        const winnerLabel = state.winner
          ? `${state.winner.avatar} <strong>${state.winner.name}</strong> ทายถูกต้องสมบูรณ์แบบ!`
          : '🎉 ทายถูกต้องสมบูรณ์แบบ!';

        resultCard.innerHTML = `
          <div style="font-size:1.35rem; font-weight:900; color:var(--accent-green); margin-bottom:0.75rem;">
            ${winnerLabel}
          </div>
          ${state.fullTrack ? `
            <div style="display:flex; justify-content:center; margin-bottom:0.85rem;">
              <img src="${state.fullTrack.artwork || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300'}" style="width:130px; height:130px; border-radius:12px; object-fit:cover; display:block; box-shadow:0 8px 30px rgba(0,0,0,0.6);" alt="">
            </div>
            <div style="font-size:1.25rem; font-weight:900; color:#fff;">${state.fullTrack.title}</div>
            <div style="font-size:0.95rem; color:var(--text-secondary); margin-bottom:0.75rem;">
              โดย ${state.fullTrack.artist} (${state.fullTrack.year}) • ${state.fullTrack.genre} • ${state.fullTrack.country}
            </div>
            ${state.fullTrack.previewUrl ? `
              <div style="margin: 0.85rem 0;">
                <audio controls autoplay src="${state.fullTrack.previewUrl}" style="width:100%; max-width:380px; border-radius:8px;"></audio>
              </div>
            ` : ''}
          ` : ''}
          <button type="button" class="btn-primary btn-songdle-restart" style="margin-top:0.6rem; padding:0.75rem 2rem;">
            🔄 สุ่มเพลงปริศนาใหม่ ➡️
          </button>
        `;
        window.soundFX?.playCorrect();
        launchConfetti();
      } else if (state.status === 'lost') {
        resultCard.style.display = 'block';
        resultCard.className = 'songdle-result-card lost';
        if (inputCard) inputCard.style.display = 'none';

        resultCard.innerHTML = `
          <div style="font-size:1.35rem; font-weight:900; color:#ef4444; margin-bottom:0.5rem;">
            😢 คำใบ้หมดแล้ว! ยังไม่มีใครทายถูก
          </div>
          <div style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:0.85rem;">
            เฉลยเพลงปริศนาประจำรอบคือ:
          </div>
          ${state.fullTrack ? `
            <div style="display:flex; justify-content:center; margin-bottom:0.85rem;">
              <img src="${state.fullTrack.artwork || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300'}" style="width:130px; height:130px; border-radius:12px; object-fit:cover; display:block; box-shadow:0 8px 30px rgba(0,0,0,0.6);" alt="">
            </div>
            <div style="font-size:1.25rem; font-weight:900; color:#fff;">${state.fullTrack.title}</div>
            <div style="font-size:0.95rem; color:var(--text-secondary); margin-bottom:0.75rem;">
              โดย ${state.fullTrack.artist} (${state.fullTrack.year}) • ${state.fullTrack.genre} • ${state.fullTrack.country}
            </div>
            ${state.fullTrack.previewUrl ? `
              <div style="margin: 0.85rem 0;">
                <audio controls autoplay src="${state.fullTrack.previewUrl}" style="width:100%; max-width:380px; border-radius:8px;"></audio>
              </div>
            ` : ''}
          ` : ''}
          <button type="button" class="btn-primary btn-songdle-restart" style="margin-top:0.6rem; padding:0.75rem 2rem;">
            🔄 สุ่มเพลงปริศนาใหม่ ➡️
          </button>
        `;
      } else {
        resultCard.style.display = 'none';
        if (inputCard) inputCard.style.display = 'block';
      }
    }
  }

  function handleSongdleQuizSubmit() {
    if (!currentSongdleState || currentSongdleState.status !== 'playing') return;

    // Rule 2: In multiplayer, check if it's my turn
    if (!currentSongdleState.isSinglePlayer) {
      if (!currentSongdleState.activePlayer || currentSongdleState.activePlayer.id !== socket.id) {
        showToast('⏳ ยังไม่ถึงตาของคุณ กรุณารอผู้เล่นคนอื่นทาย');
        return;
      }
    }

    const input = document.getElementById('songdle-quiz-input');
    const text = input ? input.value.trim() : '';

    // Rule 6: Empty or invalid input must NOT consume turn or open hints!
    if (!text) {
      showToast('⚠️ กรุณาพิมพ์ชื่อเพลงหรือศิลปินก่อนกดทาย');
      return;
    }

    if (!canPerformAction('songdle_guess', 3000)) return;

    let guessTrack = selectedSongdleGuess;
    if (!guessTrack) {
      const lower = text.toLowerCase();
      guessTrack = candidateSongsList.find(c =>
        (c.displayText && c.displayText.toLowerCase() === lower) ||
        (c.title && c.title.toLowerCase() === lower)
      );
      if (!guessTrack) {
        guessTrack = candidateSongsList.find(c =>
          (c.displayText && c.displayText.toLowerCase().includes(lower)) ||
          (c.title && c.title.toLowerCase().includes(lower))
        );
      }
    }

    if (!guessTrack) {
      showToast('⚠️ ไม่พบเพลงนี้ในรายการแนะนำ กรุณาเลือกจากระบบ (ไม่เสียตา)');
      return;
    }

    socket.emit('submit_songdle_guess', { guessTrack });
    if (input) input.value = '';
    selectedSongdleGuess = null;
  }

  // ========================================================
  // HEARDLE QUIZ MODE
  // ========================================================
  const HEARDLE_QUIZ_SNIPPETS = [1.5, 3.0, 5.0, 9.0, 16.0, 30.0];
  let heardleQuizIndex = 0;
  let heardleQuizAudio = new Audio();
  let heardleQuizPlaying = false;
  let heardleQuizTimer = null;
  const heardleQuizHistory = [];

  function initHeardleQuizRound(roundData) {
    heardleQuizIndex = 0;
    heardleQuizHistory.length = 0;
    if (heardleQuizAudio) {
      heardleQuizAudio.pause();
      heardleQuizAudio.currentTime = 0;
    }
    heardleQuizAudio.src = roundData.previewUrl;
    heardleQuizAudio.volume = currentVolume;
    heardleQuizPlaying = false;
    clearInterval(heardleQuizTimer);

    updateHeardleQuizUI();

    const input = document.getElementById('heardle-quiz-input');
    const dropdown = document.getElementById('heardle-quiz-dropdown');
    if (input) {
      input.value = '';
      input.disabled = false;
      setTimeout(() => input.focus(), 300);
    }
    const submitBtn = document.getElementById('btn-heardle-quiz-submit');
    const skipBtn = document.getElementById('btn-heardle-quiz-skip');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = '🎯 ส่งคำตอบ';
    }
    if (skipBtn) skipBtn.disabled = false;

    bindAutocomplete(input, dropdown, () => candidateSongsList, (item) => {
      if (input) input.value = item.displayText || `${item.title} - ${item.artist}`;
    });

    playHeardleQuizSnippet();
  }

  function updateHeardleQuizUI() {
    const allowed = HEARDLE_QUIZ_SNIPPETS[Math.min(heardleQuizIndex, 5)];
    const allowedEl = document.getElementById('heardle-quiz-allowed-time');
    const playLabel = document.getElementById('heardle-quiz-play-label');
    if (allowedEl) allowedEl.textContent = `🔊 ฟังได้: ${allowed.toFixed(1)} วินาที`;
    if (playLabel) playLabel.textContent = `ฟังเสียงตัวอย่าง (${allowed.toFixed(1)} วินาที)`;

    const track = document.getElementById('heardle-quiz-waveform');
    if (track) {
      const segs = track.querySelectorAll('.heardle-track-segment');
      segs.forEach((seg, idx) => {
        seg.classList.toggle('active', idx <= heardleQuizIndex);
      });
    }

    renderHeardleQuizSlots();
  }

  function renderHeardleQuizSlots() {
    const list = document.getElementById('heardle-quiz-attempts-list');
    if (!list) return;
    list.innerHTML = '';
    for (let i = 0; i < 6; i++) {
      const slot = document.createElement('div');
      slot.className = 'heardle-slot';
      const h = heardleQuizHistory[i];
      if (h) {
        if (h.isCorrect) {
          slot.className = 'heardle-slot correct';
          slot.innerHTML = `<span>🎉 ${h.text}</span><span>🟩 ถูกต้อง!</span>`;
        } else if (h.isSkipped) {
          slot.className = 'heardle-slot skipped';
          slot.innerHTML = `<span>⏭️ ข้ามครั้งที่ ${i + 1}</span><span>(+ ปลดล็อคเสียงเพิ่ม)</span>`;
        } else {
          slot.className = 'heardle-slot wrong';
          slot.innerHTML = `<span>❌ ${h.text}</span><span>ไม่ถูกต้อง</span>`;
        }
      } else {
        slot.innerHTML = `<span>ช่องที่ ${i + 1}</span><span>${i === heardleQuizIndex && !hasAnsweredCurrentRound ? 'กำลังทาย...' : '🔒'}</span>`;
      }
      list.appendChild(slot);
    }
  }

  function playHeardleQuizSnippet() {
    if (!heardleQuizAudio || !currentRound || !currentRound.previewUrl) return;
    const allowed = HEARDLE_QUIZ_SNIPPETS[Math.min(heardleQuizIndex, 5)];
    heardleQuizAudio.currentTime = 0;
    heardleQuizAudio.play().then(() => {
      heardleQuizPlaying = true;
      const playIcon = document.getElementById('heardle-quiz-play-icon');
      if (playIcon) playIcon.textContent = '⏸️';
    }).catch(e => console.log('Audio snippet prevented:', e));

    clearInterval(heardleQuizTimer);
    heardleQuizTimer = setInterval(() => {
      if (heardleQuizAudio.currentTime >= allowed) {
        heardleQuizAudio.pause();
        heardleQuizPlaying = false;
        clearInterval(heardleQuizTimer);
        const playIcon = document.getElementById('heardle-quiz-play-icon');
        if (playIcon) playIcon.textContent = '▶️';
      }
      const curTime = document.getElementById('heardle-quiz-current-time');
      if (curTime) curTime.textContent = `${heardleQuizAudio.currentTime.toFixed(1)}s`;
    }, 100);
  }

  function handleHeardleQuizResult(isCorrect, isSkipped, attemptsCount, guessText) {
    if (isCorrect) {
      hasAnsweredCurrentRound = true;
      heardleQuizHistory.push({ text: guessText || 'ถูกต้อง', isCorrect: true });
      renderHeardleQuizSlots();
      window.soundFX?.playCorrect();
      launchConfetti();
      showToast('🎉 ถูกต้องยอดเยี่ยม!');
      const submitBtn = document.getElementById('btn-heardle-quiz-submit');
      const skipBtn = document.getElementById('btn-heardle-quiz-skip');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '✓ ทายถูกต้องแล้ว!';
      }
      if (skipBtn) skipBtn.disabled = true;
      if (heardleQuizAudio) {
        clearInterval(heardleQuizTimer);
        heardleQuizAudio.currentTime = 0;
        heardleQuizAudio.play();
      }
    } else if (isSkipped) {
      heardleQuizHistory.push({ text: 'ข้าม', isSkipped: true });
      heardleQuizIndex = Math.min(5, heardleQuizIndex + 1);
      updateHeardleQuizUI();
      playHeardleQuizSnippet();
      window.soundFX?.playClick();
      showToast(`⏩ ข้ามแล้ว! ปลดล็อคเสียงเป็น ${HEARDLE_QUIZ_SNIPPETS[heardleQuizIndex].toFixed(1)}s`);
    } else {
      heardleQuizHistory.push({ text: guessText || 'ยังไม่ถูก', isCorrect: false });
      heardleQuizIndex = Math.min(5, heardleQuizIndex + 1);
      updateHeardleQuizUI();
      playHeardleQuizSnippet();
      window.soundFX?.playWrong();
      showToast(`❌ ยังไม่ถูก! ปลดล็อคเสียงเพิ่มเป็น ${HEARDLE_QUIZ_SNIPPETS[heardleQuizIndex].toFixed(1)}s`);
    }
  }

  // ========================================================
  // MUSIC VIDEO (MV) QUIZ MODE
  // ========================================================
  const MV_QUIZ_SNIPPETS = [1.5, 3.0, 5.0, 9.0, 16.0, 30.0];
  let currentMvState = null;
  let mvQuizTimer = null;
  let selectedMvGuess = null;

  function initMvQuizRound(roundData) {
    const input = document.getElementById('mv-quiz-input');
    const dropdown = document.getElementById('mv-quiz-dropdown');

    if (input) {
      input.value = '';
    }
    selectedMvGuess = null;

    if (roundData.candidateSongs) {
      candidateSongsList = roundData.candidateSongs;
    }

    const video = document.getElementById('mv-quiz-video');
    if (video) {
      video.pause();
      video.currentTime = 0;
      video.src = roundData.videoUrl || roundData.previewUrl;
      video.volume = currentVolume;
    }

    bindAutocomplete(input, dropdown, () => candidateSongsList, (item) => {
      selectedMvGuess = item;
      if (input) input.value = item.displayText || `${item.title} - ${item.artist}`;
    });

    if (roundData.mvState) {
      renderMvState(roundData.mvState);
    }
  }

  function renderMvState(state) {
    if (!state) return;
    currentMvState = state;

    const myPlayerId = socket.id;
    const isSingle = state.isSinglePlayer;
    const activePlayer = state.activePlayer;
    const isMyTurn = isSingle || (activePlayer && activePlayer.id === myPlayerId);

    // 1. Turn Banner
    const turnBanner = document.getElementById('mv-turn-banner');
    const turnAvatar = document.getElementById('mv-turn-avatar');
    const turnTitle = document.getElementById('mv-turn-title');
    const turnDesc = document.getElementById('mv-turn-desc');
    const skipTurnBtn = document.getElementById('btn-mv-quiz-skip-turn');
    const skipHintBtn = document.getElementById('btn-mv-quiz-skip-hint');
    const input = document.getElementById('mv-quiz-input');
    const submitBtn = document.getElementById('btn-mv-quiz-submit');
    const inputCard = document.getElementById('mv-quiz-input-card');
    const resultCard = document.getElementById('mv-quiz-result-card');

    if (turnBanner) {
      if (state.status !== 'playing') {
        turnBanner.classList.remove('my-turn');
        if (turnAvatar) turnAvatar.textContent = state.status === 'won' ? '🎉' : '😢';
        if (turnTitle) turnTitle.textContent = state.status === 'won' ? 'จบรอบแล้ว: ทายถูกต้อง!' : 'จบรอบแล้ว: ปลดล็อคจนครบแล้ว';
        if (turnDesc) turnDesc.textContent = 'กด "เปลี่ยน MV ใหม่" เพื่อเริ่มเล่นเพลงถัดไป';
        if (skipTurnBtn) skipTurnBtn.style.display = 'none';
      } else if (isSingle) {
        turnBanner.classList.remove('my-turn');
        if (turnAvatar) turnAvatar.textContent = '🎬';
        if (turnTitle) turnTitle.textContent = 'โหมดเล่นคนเดียว';
        if (turnDesc) turnDesc.textContent = 'ดูคลิปและส่งคำตอบได้เรื่อยๆ ตอบผิดจะเปิดความยาว MV เพิ่ม!';
        if (skipTurnBtn) skipTurnBtn.style.display = 'none';
      } else {
        // Multiplayer
        if (isMyTurn) {
          turnBanner.classList.add('my-turn');
          if (turnAvatar) turnAvatar.textContent = (activePlayer && activePlayer.avatar) || '✨';
          if (turnTitle) turnTitle.textContent = '✨ ถึงตาของคุณแล้ว!';
          if (turnDesc) turnDesc.textContent = 'ทายชื่อเพลงที่คิดว่าใช่ หรือกด "ข้ามตาของฉัน" เพื่อส่งต่อให้เพื่อน';
          if (skipTurnBtn) {
            skipTurnBtn.style.display = 'inline-flex';
            skipTurnBtn.disabled = false;
          }
        } else {
          turnBanner.classList.remove('my-turn');
          if (turnAvatar) turnAvatar.textContent = (activePlayer && activePlayer.avatar) || '⏳';
          if (turnTitle) turnTitle.textContent = `⏳ ตาของ ${activePlayer ? activePlayer.name : 'ผู้เล่นอื่น'}`;
          if (turnDesc) turnDesc.textContent = `กำลังรอให้ ${activePlayer ? activePlayer.name : 'ผู้เล่น'} ทายชื่อเพลงจาก MV...`;
          if (skipTurnBtn) skipTurnBtn.style.display = 'none';
        }
      }
    }

    // Input & Buttons state
    if (input && submitBtn) {
      if (state.status !== 'playing') {
        input.disabled = true;
        submitBtn.disabled = true;
        submitBtn.textContent = 'จบรอบแล้ว';
        if (skipHintBtn) skipHintBtn.disabled = true;
      } else if (isMyTurn) {
        input.disabled = false;
        input.placeholder = isSingle
          ? '🔎 พิมพ์ชื่อเพลง หรือ ศิลปินของ MV นี้...'
          : '🔎 พิมพ์ชื่อเพลง หรือ ศิลปินของ MV นี้ (ตาของคุณ)...';
        submitBtn.disabled = false;
        submitBtn.textContent = '🎯 ส่งคำตอบ';
        if (skipHintBtn) skipHintBtn.disabled = false;
      } else {
        input.disabled = true;
        input.placeholder = `⏳ รอตาของคุณ (${activePlayer ? activePlayer.name : 'ผู้เล่นอื่น'} กำลังเล่น)...`;
        submitBtn.disabled = true;
        submitBtn.textContent = '⏳ รอตาของคุณ...';
        if (skipHintBtn) skipHintBtn.disabled = true;
      }
    }

    // 2. Video Player & Timeline
    const allowed = state.allowedSeconds || 1.5;
    const allowedBadge = document.getElementById('mv-quiz-allowed-badge');
    const timeLabel = document.getElementById('mv-quiz-time-label');
    const playLabel = document.getElementById('mv-quiz-play-label');
    const video = document.getElementById('mv-quiz-video');

    if (allowedBadge) allowedBadge.textContent = `🎬 คลิป MV: ${allowed.toFixed(1)} วินาที`;
    if (timeLabel) timeLabel.textContent = `⏱️ ปลดล็อคแล้ว: ${allowed.toFixed(1)} วินาที (ครั้งที่ ${Math.min(state.unlockedLevel + 1, 6)}/6)`;
    if (playLabel) playLabel.textContent = `ดูคลิป MV (${allowed.toFixed(1)} วินาที)`;

    if (video && state.videoUrl && video.src !== state.videoUrl) {
      video.src = state.videoUrl;
    }

    // 3. Attempts / Slots Tracker
    const list = document.getElementById('mv-quiz-attempts-list');
    if (list) {
      list.innerHTML = '';
      for (let i = 0; i < 6; i++) {
        const slot = document.createElement('div');
        const h = state.history && state.history[i];
        if (h) {
          if (h.isCorrect) {
            slot.className = 'heardle-slot correct';
            slot.innerHTML = `<span>🎉 ${h.text}</span><span>${!isSingle ? `${h.playerAvatar} ${h.playerName} ` : ''}🟩 ถูกต้อง!</span>`;
          } else if (h.isSkipped) {
            slot.className = 'heardle-slot skipped';
            slot.innerHTML = `<span>⏭️ ข้าม</span><span>${!isSingle ? `${h.playerAvatar} ${h.playerName} ` : ''}(+เพิ่มเวลา)</span>`;
          } else {
            slot.className = 'heardle-slot wrong';
            slot.innerHTML = `<span>❌ ${h.text}</span><span>${!isSingle ? `${h.playerAvatar} ${h.playerName} ` : ''}ไม่ถูกต้อง</span>`;
          }
        } else {
          slot.className = 'heardle-slot';
          slot.innerHTML = `<span>ช่องที่ ${i + 1} (${MV_QUIZ_SNIPPETS[i].toFixed(1)}s)</span><span>${i === state.unlockedLevel && state.status === 'playing' ? 'กำลังทาย...' : '🔒'}</span>`;
        }
        list.appendChild(slot);
      }
    }

    // 4. Result Card (Won / Lost)
    if (resultCard) {
      if (state.status === 'won') {
        resultCard.style.display = 'block';
        resultCard.className = 'songdle-result-card won';
        if (inputCard) inputCard.style.display = 'none';

        const winnerLabel = state.winner
          ? `${state.winner.avatar} <strong>${state.winner.name}</strong> ทายเพลงจาก MV ถูกต้องสมบูรณ์แบบ!`
          : '🎉 ทายเพลงจาก MV ถูกต้องสมบูรณ์แบบ!';

        resultCard.innerHTML = `
          <div style="font-size:1.35rem; font-weight:900; color:var(--accent-green); margin-bottom:0.75rem;">
            ${winnerLabel}
          </div>
          ${state.fullTrack ? `
            <div style="display:flex; justify-content:center; margin-bottom:0.85rem;">
              <img src="${state.fullTrack.artwork || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300'}" style="width:130px; height:130px; border-radius:12px; object-fit:cover; display:block; box-shadow:0 8px 30px rgba(0,0,0,0.6);" alt="">
            </div>
            <div style="font-size:1.3rem; font-weight:900; color:#fff;">${state.fullTrack.title}</div>
            <div style="font-size:0.95rem; color:var(--text-secondary); margin-bottom:0.75rem;">
              โดย ${state.fullTrack.artist} (${state.fullTrack.year || ''}) • ${state.fullTrack.genre || ''} • ${state.fullTrack.country || ''}
            </div>
          ` : ''}
          <button type="button" class="btn-primary btn-mv-restart" style="margin-top:0.6rem; padding:0.75rem 2rem;">
            🔄 สุ่ม MV ปริศนาใหม่ ➡️
          </button>
        `;

        // Autoplay video in full
        if (video) {
          clearInterval(mvQuizTimer);
          video.currentTime = 0;
          video.play().catch(e => console.log('Video play error:', e));
        }
        window.soundFX?.playCorrect();
        launchConfetti();
      } else if (state.status === 'lost') {
        resultCard.style.display = 'block';
        resultCard.className = 'songdle-result-card lost';
        if (inputCard) inputCard.style.display = 'none';

        resultCard.innerHTML = `
          <div style="font-size:1.35rem; font-weight:900; color:#ef4444; margin-bottom:0.5rem;">
            😢 ครบ 6 ช่องแล้วยังไม่มีใครทายถูก!
          </div>
          <div style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:0.85rem;">
            เฉลยเพลงจาก Music Video ประจำรอบคือ:
          </div>
          ${state.fullTrack ? `
            <div style="display:flex; justify-content:center; margin-bottom:0.85rem;">
              <img src="${state.fullTrack.artwork || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300'}" style="width:130px; height:130px; border-radius:12px; object-fit:cover; display:block; box-shadow:0 8px 30px rgba(0,0,0,0.6);" alt="">
            </div>
            <div style="font-size:1.3rem; font-weight:900; color:#fff;">${state.fullTrack.title}</div>
            <div style="font-size:0.95rem; color:var(--text-secondary); margin-bottom:0.75rem;">
              โดย ${state.fullTrack.artist} (${state.fullTrack.year || ''}) • ${state.fullTrack.genre || ''} • ${state.fullTrack.country || ''}
            </div>
          ` : ''}
          <button type="button" class="btn-primary btn-mv-restart" style="margin-top:0.6rem; padding:0.75rem 2rem;">
            🔄 สุ่ม MV ปริศนาใหม่ ➡️
          </button>
        `;

        if (video) {
          clearInterval(mvQuizTimer);
          video.currentTime = 0;
          video.play().catch(e => console.log('Video play error:', e));
        }
      } else {
        resultCard.style.display = 'none';
        if (inputCard) inputCard.style.display = 'block';
        // Auto play the current allowed snippet on turn / load
        playMvQuizSnippet();
      }
    }
  }

  function playMvQuizSnippet() {
    const video = document.getElementById('mv-quiz-video');
    if (!video) return;
    const allowed = (currentMvState && currentMvState.allowedSeconds) || MV_QUIZ_SNIPPETS[0];
    video.currentTime = 0;
    video.play().catch(e => console.log('Video snippet prevented:', e));

    clearInterval(mvQuizTimer);
    mvQuizTimer = setInterval(() => {
      if (video.currentTime >= allowed) {
        video.pause();
        clearInterval(mvQuizTimer);
      }
      const fill = document.getElementById('mv-quiz-progress-fill');
      if (fill) {
        fill.style.width = `${Math.min(100, (video.currentTime / 30) * 100)}%`;
      }
    }, 100);
  }

  function handleMvQuizSubmit() {
    if (!currentMvState || currentMvState.status !== 'playing') return;

    // Rule 2: In multiplayer, check active turn
    if (!currentMvState.isSinglePlayer) {
      if (!currentMvState.activePlayer || currentMvState.activePlayer.id !== socket.id) {
        showToast('⏳ ยังไม่ถึงตาของคุณ กรุณารอผู้เล่นคนอื่นทาย');
        return;
      }
    }

    const input = document.getElementById('mv-quiz-input');
    const text = input ? input.value.trim() : '';

    // Rule 6: Empty input must NOT consume turn and must NOT unlock hint!
    if (!text) {
      showToast('⚠️ กรุณาพิมพ์ชื่อเพลงหรือศิลปินก่อนกดส่งคำตอบ');
      return;
    }

    if (!canPerformAction('mv_guess', 3000)) return;

    socket.emit('submit_mv_guess', { typedAnswer: text, isSkipHint: false });
    if (input) input.value = '';
    selectedMvGuess = null;
  }

  // ========================================================
  // REUSABLE AUTOCOMPLETE BINDER
  // ========================================================
  function bindAutocomplete(input, dropdown, getItemsFn, onSelectFn) {
    if (!input || !dropdown) return;

    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      if (!q || q.length < 1) {
        dropdown.innerHTML = '';
        dropdown.classList.remove('show');
        return;
      }

      const items = getItemsFn();
      const matches = items.filter(item => {
        const text = (item.displayText || `${item.title} ${item.artist}`).toLowerCase();
        return text.includes(q);
      }).slice(0, 15);

      if (matches.length === 0) {
        dropdown.innerHTML = '';
        dropdown.classList.remove('show');
        return;
      }

      dropdown.innerHTML = '';
      matches.forEach(item => {
        const row = document.createElement('div');
        row.className = 'autocomplete-item';
        row.innerHTML = `<span>🎵 <strong>${item.title}</strong></span> <span style="color:var(--text-secondary); font-size:0.8rem;">— 👤 ${item.artist}</span>`;
        row.addEventListener('click', () => {
          input.value = item.displayText || `${item.title} - ${item.artist}`;
          dropdown.classList.remove('show');
          onSelectFn(item);
        });
        dropdown.appendChild(row);
      });
      dropdown.classList.add('show');
    });

    document.addEventListener('click', (e) => {
      if (!input.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.remove('show');
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        dropdown.classList.remove('show');
      }
    });
  }

  // ========================================================
  // MINI GAME 1: HEARDLE (5 DIFFICULTY LEVELS)
  // ========================================================
  const HEARDLE_DIFFICULTIES = {
    easy: [2.0, 4.0, 7.0, 11.0, 16.0, 30.0],
    medium: [1.5, 3.0, 6.0, 10.0, 15.0, 22.0],
    hard: [1.0, 2.0, 4.0, 7.0, 11.0, 16.0],
    expert: [0.5, 1.0, 2.0, 3.5, 5.5, 8.0],
    impossible: [0.2, 0.4, 0.8, 1.5, 2.5, 4.0]
  };

  let heardleCurrentDiff = 'medium';
  let heardleAttempt = 0;
  let heardleTrack = null;
  let heardleCandidates = [];
  let heardleAudio = new Audio();
  let heardleIsPlaying = false;
  let heardleGameOver = false;
  let heardlePlayInterval = null;
  let heardleGuesses = [];

  function stopHeardleAudio() {
    if (heardleAudio) {
      heardleAudio.pause();
      heardleAudio.currentTime = 0;
    }
    heardleIsPlaying = false;
    clearInterval(heardlePlayInterval);
    const playBtn = document.getElementById('btn-heardle-play');
    if (playBtn) {
      playBtn.classList.remove('playing');
      const icon = document.getElementById('heardle-play-icon');
      if (icon) icon.textContent = '▶️';
    }
    const playhead = document.getElementById('heardle-playhead');
    if (playhead) playhead.style.left = '0%';
  }

  async function initHeardleGame() {
    stopHeardleAudio();
    heardleAttempt = 0;
    heardleGuesses = [];
    heardleGameOver = false;

    renderHeardleSlots();
    updateHeardleWaveform();

    const inputCard = document.getElementById('heardle-input-card');
    const resultCard = document.getElementById('heardle-result-card');
    if (inputCard) inputCard.style.display = 'block';
    if (resultCard) resultCard.style.display = 'none';

    const searchInput = document.getElementById('heardle-search-input');
    if (searchInput) searchInput.value = '';

    try {
      const res = await fetch('/api/games/heardle/random');
      const data = await res.json();
      heardleTrack = data.track;
      heardleCandidates = data.candidateSongs || [];
      heardleAudio.src = heardleTrack.previewUrl;
      heardleAudio.volume = currentVolume;
    } catch (err) {
      console.error('Failed to load Heardle track:', err);
    }
  }

  function renderHeardleSlots() {
    const list = document.getElementById('heardle-attempts-list');
    if (!list) return;
    list.innerHTML = '';

    for (let i = 0; i < 6; i++) {
      const slot = document.createElement('div');
      slot.className = 'heardle-slot';
      if (i === heardleAttempt && !heardleGameOver) {
        slot.classList.add('active-target');
      }

      const g = heardleGuesses[i];
      if (g) {
        if (g.isCorrect) {
          slot.className = 'heardle-slot correct';
          slot.innerHTML = `<span>🎉 ${g.text}</span><span>🟩 ถูกต้อง!</span>`;
        } else if (g.isSkipped) {
          slot.className = 'heardle-slot skipped';
          slot.innerHTML = `<span>⏩ ข้ามรอบที่ ${i + 1}</span><span>(+ ปลดล็อคเสียงเพิ่ม)</span>`;
        } else {
          slot.className = 'heardle-slot wrong';
          slot.innerHTML = `<span>❌ ${g.text}</span><span>ไม่ถูกต้อง</span>`;
        }
      } else {
        slot.innerHTML = `<span>ช่องที่ ${i + 1}</span><span>${i === heardleAttempt && !heardleGameOver ? 'กำลังทาย...' : '🔒'}</span>`;
      }
      list.appendChild(slot);
    }
  }

  function updateHeardleWaveform() {
    const steps = HEARDLE_DIFFICULTIES[heardleCurrentDiff] || HEARDLE_DIFFICULTIES.medium;
    const allowed = steps[Math.min(heardleAttempt, steps.length - 1)];

    const allowedLabel = document.getElementById('heardle-allowed-time');
    if (allowedLabel) allowedLabel.textContent = `🔊 ฟังได้: ${allowed.toFixed(1)} วินาที`;

    const playLabel = document.getElementById('heardle-play-label');
    if (playLabel) playLabel.textContent = `ฟังเสียงตัวอย่าง (${allowed.toFixed(1)} วินาที)`;

    const segments = document.querySelectorAll('.heardle-track-segment');
    segments.forEach((seg, idx) => {
      seg.classList.remove('active', 'unlocked');
      if (idx <= heardleAttempt) {
        seg.classList.add('active');
      } else {
        seg.classList.add('unlocked');
      }
    });
  }

  function toggleHeardlePlayback() {
    if (heardleIsPlaying) {
      stopHeardleAudio();
      return;
    }

    if (!heardleTrack || !heardleTrack.previewUrl) return;

    const steps = HEARDLE_DIFFICULTIES[heardleCurrentDiff] || HEARDLE_DIFFICULTIES.medium;
    const maxSec = steps[Math.min(heardleAttempt, steps.length - 1)];

    heardleAudio.currentTime = 0;
    heardleAudio.volume = currentVolume;
    heardleAudio.play().then(() => {
      heardleIsPlaying = true;
      const playBtn = document.getElementById('btn-heardle-play');
      const icon = document.getElementById('heardle-play-icon');
      if (playBtn) playBtn.classList.add('playing');
      if (icon) icon.textContent = '⏸️';

      const playhead = document.getElementById('heardle-playhead');
      const curTimeLabel = document.getElementById('heardle-current-time');

      clearInterval(heardlePlayInterval);
      heardlePlayInterval = setInterval(() => {
        const cur = heardleAudio.currentTime;
        if (curTimeLabel) curTimeLabel.textContent = `${cur.toFixed(1)}s`;
        if (playhead) {
          playhead.style.left = `${Math.min(100, (cur / 30) * 100)}%`;
        }

        if (cur >= maxSec || heardleAudio.ended) {
          stopHeardleAudio();
          if (curTimeLabel) curTimeLabel.textContent = '0.0s';
        }
      }, 50);
    }).catch(err => console.error('Audio play error:', err));
  }

  function handleHeardleSubmit() {
    if (!canPerformAction('heardle_submit', 3000)) return;
    if (heardleGameOver || !heardleTrack) return;
    const searchInput = document.getElementById('heardle-search-input');
    const guessText = (searchInput?.value || '').trim();
    if (!guessText) {
      showToast('กรุณาพิมพ์ชื่อเพลงหรือศิลปิน');
      return;
    }

    const clean = s => (s || '').toLowerCase().replace(/[\s\-_.,'"!?:;()\[\]]/g, '');
    const gClean = clean(guessText);
    const titleClean = clean(heardleTrack.title);
    const artistClean = clean(heardleTrack.artist);
    const comboClean1 = clean(`${heardleTrack.title}${heardleTrack.artist}`);
    const comboClean2 = clean(`${heardleTrack.artist}${heardleTrack.title}`);

    const isMatch = (
      gClean === titleClean ||
      gClean === artistClean ||
      gClean === comboClean1 ||
      gClean === comboClean2 ||
      (gClean.length >= 4 && (titleClean.includes(gClean) || comboClean1.includes(gClean)))
    );

    if (isMatch) {
      heardleGuesses.push({ text: guessText, isCorrect: true });
      heardleGameOver = true;
      renderHeardleSlots();
      window.soundFX?.playFanfare();
      launchConfetti();
      renderHeardleResult(true);
    } else {
      heardleGuesses.push({ text: guessText, isCorrect: false });
      heardleAttempt++;
      searchInput.value = '';

      if (heardleAttempt >= 6) {
        heardleGameOver = true;
        renderHeardleSlots();
        renderHeardleResult(false);
      } else {
        renderHeardleSlots();
        updateHeardleWaveform();
        window.soundFX?.playWrong?.();
        showToast(`❌ ยังไม่ถูกต้อง! ปลดล็อคเสียงเพิ่มเป็น ${HEARDLE_DIFFICULTIES[heardleCurrentDiff][heardleAttempt].toFixed(1)} วินาที`);
      }
    }
  }

  function handleHeardleSkip() {
    if (!canPerformAction('heardle_skip', 3000)) return;
    if (heardleGameOver || !heardleTrack) return;

    heardleGuesses.push({ text: 'ข้าม', isSkipped: true });
    heardleAttempt++;

    if (heardleAttempt >= 6) {
      heardleGameOver = true;
      renderHeardleSlots();
      renderHeardleResult(false);
    } else {
      renderHeardleSlots();
      updateHeardleWaveform();
      window.soundFX?.playClick();
      showToast(`⏩ ข้ามข้อนี้! ปลดล็อคเสียงเพิ่มเป็น ${HEARDLE_DIFFICULTIES[heardleCurrentDiff][heardleAttempt].toFixed(1)} วินาที`);
    }
  }

  function renderHeardleResult(isWin) {
    stopHeardleAudio();
    const inputCard = document.getElementById('heardle-input-card');
    const resultCard = document.getElementById('heardle-result-card');
    if (inputCard) inputCard.style.display = 'none';
    if (!resultCard || !heardleTrack) return;

    resultCard.style.display = 'block';
    resultCard.innerHTML = `
      <div class="result-message-banner ${isWin ? 'win' : 'lose'}">
        ${isWin ? `🎉 ยอดเยี่ยมมาก! คุณทายถูกในครั้งที่ ${heardleGuesses.length} (${HEARDLE_DIFFICULTIES[heardleCurrentDiff][heardleAttempt].toFixed(1)}s)` : '❌ เสียดายจัง! หมดโควตาทายแล้ว'}
      </div>
      <div class="result-art-wrapper">
        <img src="${heardleTrack.artwork || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300'}" alt="">
      </div>
      <div class="result-song-title">${heardleTrack.title}</div>
      <div class="result-song-artist">โดย ${heardleTrack.artist} (${heardleTrack.year || ''})</div>
      <div style="margin: 1rem 0;">
        <audio controls src="${heardleTrack.previewUrl}" style="width: 100%; border-radius: 8px;"></audio>
      </div>
      <button type="button" class="btn-primary" id="btn-heardle-next" style="width: 100%; margin-top: 0.5rem;">
        🎵 เล่นเพลงถัดไป ➡️
      </button>
    `;

    const nextBtn = document.getElementById('btn-heardle-next');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        window.soundFX?.playClick();
        initHeardleGame();
      });
    }
  }

  // ========================================================
  // MINI GAME 2: SONGDLE (LOL-DLE DAILY MUSIC STYLE)
  // ========================================================
  let songdleToken = null;
  let songdleCandidates = [];
  let songdleGuesses = [];
  let songdleGameOver = false;

  async function initSongdleGame() {
    songdleGuesses = [];
    songdleGameOver = false;

    const tbody = document.getElementById('songdle-tbody');
    if (tbody) tbody.innerHTML = '';
    const notice = document.getElementById('songdle-empty-notice');
    if (notice) notice.style.display = 'block';
    const inputCard = document.getElementById('songdle-input-card');
    if (inputCard) inputCard.style.display = 'block';
    const resultCard = document.getElementById('songdle-result-card');
    if (resultCard) resultCard.style.display = 'none';

    const searchInput = document.getElementById('songdle-search-input');
    if (searchInput) searchInput.value = '';

    try {
      const res = await fetch('/api/games/songdle/new');
      const data = await res.json();
      songdleToken = data.token;
      songdleCandidates = data.candidateSongs || [];
    } catch (err) {
      console.error('Failed to init Songdle:', err);
    }
  }

  async function submitSongdleGuess(guessIdOrText) {
    if (!canPerformAction('songdle_solo_submit', 3000)) return;
    if (songdleGameOver || !songdleToken) return;

    let targetCandidate = songdleCandidates.find(c => c.id === guessIdOrText || (c.displayText || '').toLowerCase() === (guessIdOrText || '').toLowerCase().trim());
    if (!targetCandidate) {
      targetCandidate = songdleCandidates.find(c =>
        c.title.toLowerCase().includes((guessIdOrText || '').toLowerCase().trim()) ||
        c.artist.toLowerCase().includes((guessIdOrText || '').toLowerCase().trim())
      );
    }

    const finalGuessId = targetCandidate ? targetCandidate.id : guessIdOrText;

    try {
      const res = await fetch('/api/games/songdle/guess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: songdleToken, guessId: finalGuessId })
      });
      const data = await res.json();
      if (data.error) {
        showToast(data.message || 'เกิดข้อผิดพลาดในการทาย');
        return;
      }

      addSongdleRow(data);
      if (data.isVictory) {
        songdleGameOver = true;
        window.soundFX?.playFanfare();
        launchConfetti();
        renderSongdleWin(data);
      } else {
        window.soundFX?.playClick();
      }
    } catch (err) {
      console.error('Songdle guess error:', err);
    }
  }

  function addSongdleRow(res) {
    const notice = document.getElementById('songdle-empty-notice');
    if (notice) notice.style.display = 'none';

    const tbody = document.getElementById('songdle-tbody');
    if (!tbody) return;

    const tr = document.createElement('tr');
    const yearIcon = res.year.direction === 'up' ? ' ⬆️' : (res.year.direction === 'down' ? ' ⬇️' : ' 🟩');

    tr.innerHTML = `
      <td>
        <div class="songdle-cell ${res.song.status === 'green' ? 'cell-green' : 'cell-red'} songdle-cell-song">
          <img src="${res.song.artwork || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100'}" alt="">
          <span style="font-size:0.8rem; line-height:1.2;">${res.song.value}</span>
        </div>
      </td>
      <td>
        <div class="songdle-cell ${res.artist.status === 'green' ? 'cell-green' : (res.artist.status === 'orange' ? 'cell-orange' : 'cell-red')}">
          ${res.artist.value}
        </div>
      </td>
      <td>
        <div class="songdle-cell ${res.artistType.status === 'green' ? 'cell-green' : 'cell-red'}">
          ${res.artistType.value}
        </div>
      </td>
      <td>
        <div class="songdle-cell ${res.genre.status === 'green' ? 'cell-green' : (res.genre.status === 'orange' ? 'cell-orange' : 'cell-red')}">
          ${res.genre.value}
        </div>
      </td>
      <td>
        <div class="songdle-cell ${res.country.status === 'green' ? 'cell-green' : 'cell-red'}">
          ${res.country.value}
        </div>
      </td>
      <td>
        <div class="songdle-cell ${res.year.status === 'green' ? 'cell-green' : 'cell-red'}">
          <span>${res.year.value}</span>
          <span class="cell-arrow-icon">${yearIcon}</span>
        </div>
      </td>
    `;

    tbody.insertBefore(tr, tbody.firstChild);
  }

  function renderSongdleWin(data) {
    const inputCard = document.getElementById('songdle-input-card');
    const resultCard = document.getElementById('songdle-result-card');
    if (inputCard) inputCard.style.display = 'none';
    if (!resultCard || !data.fullTrack) return;

    const track = data.fullTrack;
    resultCard.style.display = 'block';
    resultCard.innerHTML = `
      <div class="result-message-banner win">
        🎉 ชนะแล้ว! คุณทายเพลงปริศนาถูกต้องเป็นสีเขียวทั้งหมด!
      </div>
      <div class="result-art-wrapper">
        <img src="${track.artwork || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300'}" alt="">
      </div>
      <div class="result-song-title">${track.title}</div>
      <div class="result-song-artist">โดย ${track.artist} (${track.year || ''})</div>
      <div style="margin: 1rem 0;">
        <audio controls src="${track.previewUrl}" style="width: 100%; border-radius: 8px;"></audio>
      </div>
      <button type="button" class="btn-primary" id="btn-songdle-next" style="width: 100%; margin-top: 0.5rem;">
        🎵 สุ่มเพลงปริศนาใหม่ ➡️
      </button>
    `;

    const nextBtn = document.getElementById('btn-songdle-next');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        window.soundFX?.playClick();
        initSongdleGame();
      });
    }
  }

  // ========================================================
  // MINI GAME 3: MUSIC VIDEO GUESS
  // ========================================================
  const MV_STEP_SECONDS = [1.0, 2.0, 4.0, 8.0, 15.0, 25.0];
  let mvAttempt = 0;
  let mvTrack = null;
  let mvCandidates = [];
  let mvVideo = null;
  let mvIsPlaying = false;
  let mvGameOver = false;
  let mvGuesses = [];
  const soloPlayedMvIds = new Set();

  function stopMvVideo() {
    if (mvVideo) {
      mvVideo.pause();
      mvVideo.currentTime = 0;
    }
    mvIsPlaying = false;
    const playBtn = document.getElementById('btn-mv-play');
    if (playBtn) {
      playBtn.classList.remove('playing');
      const icon = document.getElementById('mv-play-icon');
      if (icon) icon.textContent = '▶️';
    }
  }

  async function initMusicVideoGame() {
    stopMvVideo();
    mvAttempt = 0;
    mvGuesses = [];
    mvGameOver = false;
    mvVideo = document.getElementById('mv-video-player');

    renderMvSlots();
    updateMvTimeline();

    const inputCard = document.getElementById('mv-input-card');
    const resultCard = document.getElementById('mv-result-card');
    if (inputCard) inputCard.style.display = 'block';
    if (resultCard) resultCard.style.display = 'none';

    const searchInput = document.getElementById('mv-search-input');
    if (searchInput) searchInput.value = '';

    try {
      const excludeParam = Array.from(soloPlayedMvIds).join(',');
      const res = await fetch(`/api/games/mv/random?exclude=${encodeURIComponent(excludeParam)}`);
      const data = await res.json();
      mvTrack = data.video;
      if (mvTrack && mvTrack.id) {
        soloPlayedMvIds.add(mvTrack.id);
      }
      mvCandidates = data.candidateSongs || [];
      if (mvVideo) {
        mvVideo.src = mvTrack.previewUrl;
        mvVideo.currentTime = 0;
        mvVideo.muted = isSoundMuted;
        mvVideo.volume = currentVolume;
      }
    } catch (err) {
      console.error('Failed to init MV game:', err);
    }
  }

  function renderMvSlots() {
    const list = document.getElementById('mv-attempts-list');
    if (!list) return;
    list.innerHTML = '';

    for (let i = 0; i < 6; i++) {
      const slot = document.createElement('div');
      slot.className = 'heardle-slot';
      if (i === mvAttempt && !mvGameOver) {
        slot.classList.add('active-target');
      }

      const sec = MV_STEP_SECONDS[i] || 25;
      const g = mvGuesses[i];
      if (g) {
        if (g.isCorrect) {
          slot.className = 'heardle-slot correct';
          slot.innerHTML = `<span>🎉 ${g.text}</span><span>🟩 ถูกต้อง! (${sec}s)</span>`;
        } else if (g.isSkipped) {
          slot.className = 'heardle-slot skipped';
          slot.innerHTML = `<span>⏩ ข้าม (${sec}s)</span><span>(+ เพิ่มเวลา MV)</span>`;
        } else {
          slot.className = 'heardle-slot wrong';
          slot.innerHTML = `<span>❌ ${g.text}</span><span>ไม่ถูกต้อง (${sec}s)</span>`;
        }
      } else {
        slot.innerHTML = `<span>ครั้งที่ ${i + 1} (${sec} วินาที)</span><span>${i === mvAttempt && !mvGameOver ? 'กำลังทาย...' : '🔒'}</span>`;
      }
      list.appendChild(slot);
    }
  }

  function updateMvTimeline() {
    const sec = MV_STEP_SECONDS[Math.min(mvAttempt, MV_STEP_SECONDS.length - 1)];
    const pct = Math.min(100, (sec / 25.0) * 100);

    const fill = document.getElementById('mv-progress-fill');
    if (fill) fill.style.width = `${pct}%`;

    const label = document.getElementById('mv-time-label');
    if (label) label.textContent = `⏱️ ปลดล็อคแล้ว: ${sec.toFixed(1)} วินาที`;

    const badge = document.getElementById('mv-overlay-badge');
    if (badge) badge.textContent = `🎬 คลิป MV: ${sec.toFixed(1)} วินาที`;

    const playLabel = document.getElementById('mv-play-label');
    if (playLabel) playLabel.textContent = `ดูคลิป MV (${sec.toFixed(1)} วินาที)`;
  }

  function toggleMvPlayback() {
    if (!mvVideo || !mvTrack || !mvTrack.previewUrl) return;

    if (mvIsPlaying) {
      stopMvVideo();
      return;
    }

    const sec = MV_STEP_SECONDS[Math.min(mvAttempt, MV_STEP_SECONDS.length - 1)];
    mvVideo.currentTime = 0;
    mvVideo.muted = isSoundMuted;
    mvVideo.volume = currentVolume;
    mvVideo.play().then(() => {
      mvIsPlaying = true;
      const playBtn = document.getElementById('btn-mv-play');
      const icon = document.getElementById('mv-play-icon');
      if (playBtn) playBtn.classList.add('playing');
      if (icon) icon.textContent = '⏸️';

      mvVideo.ontimeupdate = () => {
        if (mvVideo.currentTime >= sec) {
          stopMvVideo();
          mvVideo.ontimeupdate = null;
        }
      };
    }).catch(err => console.error('Video play error:', err));
  }

  async function handleMvSubmit() {
    if (!canPerformAction('mv_solo_submit', 3000)) return;
    if (mvGameOver || !mvTrack) return;
    const searchInput = document.getElementById('mv-search-input');
    const guessText = (searchInput?.value || '').trim();
    if (!guessText) {
      showToast('กรุณาพิมพ์ชื่อเพลงหรือศิลปินของ MV');
      return;
    }

    try {
      const res = await fetch('/api/games/mv/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mvId: mvTrack.id, typedAnswer: guessText })
      });
      const data = await res.json();

      if (data.isCorrect) {
        mvGuesses.push({ text: guessText, isCorrect: true });
        mvGameOver = true;
        renderMvSlots();
        window.soundFX?.playFanfare();
        launchConfetti();
        renderMvResult(true);
      } else {
        mvGuesses.push({ text: guessText, isCorrect: false });
        mvAttempt++;
        searchInput.value = '';

        if (mvAttempt >= 6) {
          mvGameOver = true;
          renderMvSlots();
          renderMvResult(false);
        } else {
          renderMvSlots();
          updateMvTimeline();
          window.soundFX?.playWrong?.();
          showToast(`❌ ยังไม่ถูกต้อง! เพิ่มความยาว MV เป็น ${MV_STEP_SECONDS[mvAttempt]} วินาที`);
        }
      }
    } catch (err) {
      console.error('MV check error:', err);
    }
  }

  function handleMvSkip() {
    if (!canPerformAction('mv_solo_skip', 3000)) return;
    if (mvGameOver || !mvTrack) return;

    mvGuesses.push({ text: 'ข้าม', isSkipped: true });
    mvAttempt++;

    if (mvAttempt >= 6) {
      mvGameOver = true;
      renderMvSlots();
      renderMvResult(false);
    } else {
      renderMvSlots();
      updateMvTimeline();
      window.soundFX?.playClick();
      showToast(`⏩ ข้ามข้อนี้! เพิ่มความยาว MV เป็น ${MV_STEP_SECONDS[mvAttempt]} วินาที`);
    }
  }

  function renderMvResult(isWin) {
    stopMvVideo();
    const inputCard = document.getElementById('mv-input-card');
    const resultCard = document.getElementById('mv-result-card');
    if (inputCard) inputCard.style.display = 'none';
    if (!resultCard || !mvTrack) return;

    // Play full video in unmuted format
    if (mvVideo) {
      mvVideo.currentTime = 0;
      mvVideo.muted = false;
      mvVideo.ontimeupdate = null;
      mvVideo.play().catch(() => {});
    }

    resultCard.style.display = 'block';
    resultCard.innerHTML = `
      <div class="result-message-banner ${isWin ? 'win' : 'lose'}">
        ${isWin ? `🎉 ถูกต้องแล้ว! คุณทายถูกในคลิปความยาว ${MV_STEP_SECONDS[mvAttempt]} วินาที!` : '❌ เสียดายจัง! เฉลยคลิป MV เพลงนี้คือ:'}
      </div>
      <div class="result-song-title">${mvTrack.title}</div>
      <div class="result-song-artist">โดย ${mvTrack.artist} (${mvTrack.year || ''})</div>
      <button type="button" class="btn-primary" id="btn-mv-next" style="width: 100%; margin-top: 1rem;">
        🎬 ทาย MV เพลงถัดไป ➡️
      </button>
    `;

    const nextBtn = document.getElementById('btn-mv-next');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        window.soundFX?.playClick();
        initMusicVideoGame();
      });
    }
  }

  // ========================================================
  // SETUP MINI GAMES LISTENERS
  // ========================================================
  function setupMiniGamesListeners() {
    // 1. Heardle Listeners
    const heardleDiffBtns = document.querySelectorAll('#heardle-difficulty-tabs .diff-btn');
    heardleDiffBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        heardleDiffBtns.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        heardleCurrentDiff = btn.dataset.diff || 'medium';
        window.soundFX?.playClick();
        initHeardleGame();
      });
    });

    const btnHeardlePlay = document.getElementById('btn-heardle-play');
    if (btnHeardlePlay) btnHeardlePlay.addEventListener('click', toggleHeardlePlayback);

    const btnHeardleSubmit = document.getElementById('btn-heardle-submit');
    if (btnHeardleSubmit) btnHeardleSubmit.addEventListener('click', handleHeardleSubmit);

    const btnHeardleSkip = document.getElementById('btn-heardle-skip');
    if (btnHeardleSkip) btnHeardleSkip.addEventListener('click', handleHeardleSkip);

    const heardleInput = document.getElementById('heardle-search-input');
    const heardleDropdown = document.getElementById('heardle-dropdown');
    bindAutocomplete(heardleInput, heardleDropdown, () => heardleCandidates, (selected) => {
      handleHeardleSubmit();
    });

    // 2. Songdle Listeners
    const btnSongdleSubmit = document.getElementById('btn-songdle-submit');
    const songdleInput = document.getElementById('songdle-search-input');
    const songdleDropdown = document.getElementById('songdle-dropdown');

    if (btnSongdleSubmit) {
      btnSongdleSubmit.addEventListener('click', () => {
        const val = songdleInput?.value.trim();
        if (val) submitSongdleGuess(val);
      });
    }

    const btnSongdleNew = document.getElementById('btn-songdle-new');
    if (btnSongdleNew) {
      btnSongdleNew.addEventListener('click', () => {
        window.soundFX?.playClick();
        initSongdleGame();
      });
    }

    bindAutocomplete(songdleInput, songdleDropdown, () => songdleCandidates, (selected) => {
      submitSongdleGuess(selected.id);
    });

    // 3. MV Listeners
    const btnMvPlay = document.getElementById('btn-mv-play');
    if (btnMvPlay) btnMvPlay.addEventListener('click', toggleMvPlayback);

    const btnMvSubmit = document.getElementById('btn-mv-submit');
    if (btnMvSubmit) btnMvSubmit.addEventListener('click', handleMvSubmit);

    const btnMvSkip = document.getElementById('btn-mv-skip');
    if (btnMvSkip) btnMvSkip.addEventListener('click', handleMvSkip);

    const mvInput = document.getElementById('mv-search-input');
    const mvDropdown = document.getElementById('mv-dropdown');
    bindAutocomplete(mvInput, mvDropdown, () => mvCandidates, (selected) => {
      handleMvSubmit();
    });
  }

  // Boot
  document.addEventListener('DOMContentLoaded', init);
})();
