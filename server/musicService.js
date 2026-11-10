// Music Service using iTunes Search API with massive song pool, in-memory caching and clean track formatting
const { getArtistMetadata, CURATED_MUSIC_VIDEOS, compareSongdleGuess } = require('./gameModesService');

const MAIN_CATEGORIES = {
  mix: {
    id: 'mix',
    name: '🔀 มิกซ์รวมทุกหมวด (All-Stars Mix)',
    icon: '🔀',
    desc: 'สุ่มเพลงจากทุกหมวดหมู่และหมวดหมู่ย่อย ทั้งไทย สากล เคป๊อป การ์ตูน ลูกทุ่ง',
    subcategories: []
  },
  thai: {
    id: 'thai',
    name: '🇹🇭 เพลงไทย (Thai Music)',
    icon: '🇹🇭',
    desc: 'รวมเพลงไทยทุกยุคสมัย ป๊อป ร็อก ลูกทุ่ง ทีป๊อป ไวรัล อินดี้',
    subcategories: [
      {
        id: 'thai_all',
        name: '🌟 เพลงไทยทั้งหมด (All Thai Hits)',
        queries: [
          'Bodyslam', 'Potato', 'Tattoo Colour', 'Palmy', '4EVE', 'มนต์แคน แก่นคูน',
          'ทรงอย่างแบด', 'Cocktail', 'Getsunova', 'Labanoon', 'Three Man Down', 'Tilly Birds',
          'BOWKYLION', 'NONT TANONT', 'Jeff Satur', 'Billkin', 'Scrubb', 'Loso'
        ],
        country: 'th'
      },
      {
        id: 'thai_poprock',
        name: '🎸 ป๊อป & ร็อกคลาสสิก (Thai Pop & Rock)',
        queries: [
          'Bodyslam', 'Potato', 'Tattoo Colour', 'Labanoon', 'Palmy', 'Klear',
          'Big Ass', 'Cocktail', 'Getsunova', 'Clash', 'Silly Fools', 'Loso',
          'Paradox', 'Slot Machine', 'Modern Dog', 'Blackhead', 'Zeal', 'Musketeers',
          '25hours', 'Sweet Mullet', 'Retrospect', 'No One Else', 'Fellow Fellow', 'Mirrr'
        ],
        country: 'th'
      },
      {
        id: 'tpop',
        name: '💫 T-Pop ไอดอล (T-Pop & Idols)',
        queries: [
          '4EVE', 'PROXIE', 'PIXXIE', 'BUS', 'ATLAS',
          'PERSES', 'QRRA', 'LYKN', 'PRETZELLE', 'DICE', 'ALALA', 'VIIS',
          'MXFRUIT', 'Billkin', 'PP Krit', 'Gemini Fourth', 'BNK48', 'Trinity'
        ],
        country: 'th'
      },
      {
        id: 'thai_rap',
        name: '🎤 แร็ป & ฮิปฮอปไทย (Thai Rap & Hip-Hop)',
        queries: [
          'YOUNGOHM', 'F.HERO', 'SARAN', 'SPRITE', '1MILL',
          'OG-ANIC', 'URBOYTJ', 'TWOPEE', 'ILLSLICK', 'DIAMOND MQT',
          'D GERRARD', 'MAIYARAP', 'MILLI', 'RachYO', 'Lazyloxy',
          'P-HOT', 'DABOYWAY', 'TIMETHAI', 'Guygeegee', 'FIIXD', '19HUNNID'
        ],
        country: 'th'
      },
      {
        id: 'lukthung',
        name: '🌾 ลูกทุ่ง & เพื่อชีวิต (Thai Country & Luk Thung)',
        queries: [
          'มนต์แคน แก่นคูน', 'ไผ่ พงศธร', 'ต่าย อรทัย', 'ลำไย ไหทองคำ', 'ก้อง ห้วยไร่',
          'ไมค์ ภิรมย์พร', 'เบิ้ล ปทุมราช', 'หญิงลี', 'ตั๊กแตน ชลดา', 'แซ็ค ชุมแพ',
          'จินตหรา พูนลาภ', 'สุนารี ราชสีมา', 'แอ๊ด คาราบาว', 'พงษ์สิทธิ์ คำภีร์',
          'คาราบาว', 'มาลีฮวนน่า', 'พี สะเดิด', 'ครูเต้ย อภิวัฒน์'
        ],
        country: 'th'
      },
      {
        id: 'thai_viral',
        name: '📱 ไวรัล TikTok ไทย (Viral TikTok Hits)',
        queries: [
          'Paper Planes', 'เอิ้ก ชาลิสา', 'BOWKYLION', 'NONT TANONT',
          'เบล วริศรา', 'โจอี้ ภูวศิษฐ์', 'จือปาก', 'กิตติพงษ์',
          'D Gerrard', 'Safeplanet', 'Jeff Satur', 'fellow fellow', 'No One Else'
        ],
        country: 'th'
      },
      {
        id: 'thai_indie',
        name: '🌿 อินดี้ & อัลเทอร์เนทีฟ (Indie & Alternative)',
        queries: [
          'Scrubb', 'Safeplanet', 'Anatomy Rabbit', 'Dept', 'Moving and Cut',
          'Television off', 'Whal & Dolph', 'Yented', 'Solitude is Bliss',
          'Polycat', 'LANDOKMAI', 'Zweed n Roll', 'TaitosmitH', 'คณะขวัญใจ', 'T_047'
        ],
        country: 'th'
      }
    ]
  },
  inter: {
    id: 'inter',
    name: '🌍 เพลงสากล (International / Global Hits)',
    icon: '🌍',
    desc: 'เพลงฮิตระดับโลก ติดชาร์ต Billboard & Spotify Global',
    subcategories: [
      {
        id: 'inter_all',
        name: '🌟 เพลงสากลทั้งหมด (All Global Hits)',
        queries: [
          'Taylor Swift', 'Bruno Mars', 'Sabrina Carpenter', 'Coldplay', 'The Weeknd',
          'Billie Eilish', 'Ed Sheeran', 'Ariana Grande', 'Dua Lipa', 'Maroon 5',
          'Justin Bieber', 'Adele', 'Queen', 'Imagine Dragons', 'Post Malone'
        ],
        country: 'us'
      },
      {
        id: 'inter_pop',
        name: '🌟 Global Pop Hits (สากลป๊อปยอดนิยม)',
        queries: [
          'Taylor Swift', 'Bruno Mars', 'Sabrina Carpenter', 'Ariana Grande', 'Billie Eilish',
          'Dua Lipa', 'Ed Sheeran', 'Justin Bieber', 'Adele', 'Olivia Rodrigo',
          'Lady Gaga', 'Katy Perry', 'Rihanna', 'Shawn Mendes', 'Charlie Puth', 'Harry Styles'
        ],
        country: 'us'
      },
      {
        id: 'inter_rock',
        name: '🎸 Rock & Legends (สากลร็อก & คลาสสิก)',
        queries: [
          'Coldplay', 'Maroon 5', 'Queen', 'Imagine Dragons', 'OneRepublic',
          'Linkin Park', 'The Beatles', 'Bon Jovi', 'Green Day', 'Nirvana',
          'Red Hot Chili Peppers', 'Oasis', 'Guns N Roses', 'The Killers'
        ],
        country: 'us'
      },
      {
        id: 'inter_hiphop',
        name: '🎧 Hip-Hop & R&B (ฮิปฮอป & อาร์แอนด์บี)',
        queries: [
          'The Weeknd', 'Drake', 'Post Malone', 'Kendrick Lamar', 'SZA',
          'Eminem', 'Travis Scott', 'Doja Cat', 'Nicki Minaj', 'Kanye West',
          'Jack Harlow', 'Lil Nas X', 'Juice WRLD'
        ],
        country: 'us'
      }
    ]
  },
  anime: {
    id: 'anime',
    name: '🎌 เพลงการ์ตูน & อนิเมะ (Anime & J-Pop)',
    icon: '🎌',
    desc: 'เพลงเปิดอนิเมะในตำนาน และเพลงการ์ตูนยอดฮิตจากญี่ปุ่น',
    subcategories: [
      {
        id: 'anime_all',
        name: '🌟 การ์ตูน & อนิเมะทั้งหมด (All Anime & J-Pop)',
        queries: [
          'YOASOBI', 'LiSA', 'Doraemon theme', 'Dragon Ball Cha-La',
          'Radwimps', 'Aimer', 'Kenshi Yonezu',
          'Butter-Fly Digimon', 'One Piece We Are', 'Official HIGE DANdism'
        ],
        country: 'us'
      },
      {
        id: 'anime_modern',
        name: '🗡️ อนิเมะยุคใหม่ (Modern Anime Themes)',
        queries: [
          'YOASOBI', 'LiSA', 'Aimer', 'Kenshi Yonezu',
          'Eve', 'Creepy Nuts', 'King Gnu',
          'Chainsaw Man', 'Jujutsu Kaisen', 'Demon Slayer', 'Oshi no Ko'
        ],
        country: 'us'
      },
      {
        id: 'anime_classic',
        name: '🐉 อนิเมะในตำนาน (Classic Anime Themes)',
        queries: [
          'Doraemon theme', 'Dragon Ball Cha-La', 'Butter-Fly Digimon', 'Detective Conan',
          'One Piece We Are', 'Naruto Blue Bird', 'Evangelion Cruel Angel',
          'Pokemon Theme', 'Sailor Moon theme', 'Slam Dunk theme', 'Shin-chan'
        ],
        country: 'us'
      },
      {
        id: 'jpop_hits',
        name: '🌸 J-Pop ยอดนิยม (Popular J-Pop)',
        queries: [
          'Official HIGE DANdism', 'Radwimps', 'Fujii Kaze',
          'Vaundy', 'Mrs GREEN APPLE', 'Utada Hikaru', 'Aimyon',
          'Yuuri', 'Back Number', 'Spitz'
        ],
        country: 'us'
      }
    ]
  },
  kpop: {
    id: 'kpop',
    name: '✨ เพลง K-Pop (Korean Pop)',
    icon: '✨',
    desc: 'เคป๊อปสุดปัง ทั้งบอยแบนด์ เกิร์ลกรุ๊ปตัวท็อป',
    subcategories: [
      {
        id: 'kpop_all',
        name: '🌟 K-Pop ทั้งหมด (All K-Pop Hits)',
        queries: [
          'BLACKPINK', 'BTS', 'NewJeans', 'TWICE', 'aespa',
          'PSY', 'IVE', 'LE SSERAFIM', 'Stray Kids', 'SEVENTEEN',
          'BIGBANG', 'EXO', 'ITZY', 'ILLIT', 'BABYMONSTER', 'TXT', 'ENHYPEN', 'Red Velvet'
        ],
        country: 'th'
      },
      {
        id: 'kpop_gg',
        name: '💃 เกิร์ลกรุ๊ป (Girl Groups)',
        queries: [
          'BLACKPINK', 'NewJeans', 'TWICE', 'aespa', 'IVE',
          'LE SSERAFIM', 'ITZY', 'ILLIT', 'BABYMONSTER', '(G)I-DLE',
          'Red Velvet', 'MAMAMOO', 'STAYC', 'NMIXX', 'KARA', 'Girls Generation', '2NE1'
        ],
        country: 'th'
      },
      {
        id: 'kpop_bg',
        name: '🕺 บอยแบนด์ (Boy Groups)',
        queries: [
          'BTS', 'Stray Kids', 'SEVENTEEN', 'BIGBANG', 'EXO',
          'NCT DREAM', 'NCT 127', 'TXT', 'ENHYPEN', 'ATEEZ', 'RIIZE', 'SHINee', 'Super Junior'
        ],
        country: 'th'
      },
      {
        id: 'kpop_classic',
        name: '📼 K-Pop ในตำนาน (K-Pop Legends Gen 2)',
        queries: [
          'PSY', 'Girls Generation', 'Super Junior', '2NE1', 'Wonder Girls',
          'BIGBANG', 'T-ARA', 'SISTAR', 'KARA', 'SHINee', 'Rain', 'TVXQ'
        ],
        country: 'th'
      }
    ]
  },
  latest: {
    id: 'latest',
    name: '🔥 เพลงฮิตล่าสุด 2024-2026 (Latest Trending Hits)',
    icon: '🔥',
    desc: 'เพลงไทยและสากลกระแสแรง ติดเทรนด์สดๆ ร้อนๆ',
    subcategories: [
      {
        id: 'latest_all',
        name: '🌟 เพลงฮิตล่าสุดทั้งหมด (All Latest Hits)',
        queries: [
          'Jeff Satur', 'NONT TANONT', 'ROSE Bruno Mars', 'Sabrina Carpenter',
          'Three Man Down', 'Billkin', 'PP Krit', 'Tilly Birds', 'BUS', '4EVE'
        ],
        country: 'th'
      },
      {
        id: 'latest_thai',
        name: '🇹🇭 เพลงไทยล่าสุด (Latest Thai Hits)',
        queries: [
          'Jeff Satur', 'NONT TANONT', 'BOWKYLION', 'Three Man Down', 'Billkin',
          'PP Krit', 'Tilly Birds', 'Tattoo Colour', 'Cocktail', 'BUS', '4EVE', 'PiXXiE'
        ],
        country: 'th'
      },
      {
        id: 'latest_inter',
        name: '🌍 สากลล่าสุด & TikTok Hits (Latest Global Hits)',
        queries: [
          'ROSE Bruno Mars', 'Sabrina Carpenter', 'Lady Gaga Bruno Mars',
          'Billie Eilish', 'Benson Boone', 'Chappell Roan', 'Teddy Swims', 'Taylor Swift'
        ],
        country: 'us'
      }
    ]
  }
};

// Flatten all subcategories for direct lookup
const ALL_SUBCATEGORIES = {};
Object.values(MAIN_CATEGORIES).forEach(main => {
  main.subcategories.forEach(sub => {
    ALL_SUBCATEGORIES[sub.id] = { ...sub, mainId: main.id, mainName: main.name, mainIcon: main.icon };
  });
});

// Global in-memory track cache and large catalog for autocomplete
const trackCache = new Map();
const globalCatalogMap = new Map();

// Clean up track title by removing clutter, live tags, and tour tags
let seedData = {};
try {
  seedData = require('./seedData.json');
} catch (e) {
  seedData = { kpop: [], thai: [], inter: [], anime: [] };
}

// =========================================================================
// 🌐 ROMANIZATION & TRANSLATION ENGINE (Preserving Thai, Converting CJK to English)
// =========================================================================

const HANGUL_INITIALS = ['g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h'];
const HANGUL_VOWELS = ['a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i'];
const HANGUL_FINALS = ['', 'k', 'kk', 'ks', 'n', 'nj', 'nh', 't', 'l', 'lg', 'lm', 'lb', 'ls', 'lt', 'lp', 'lh', 'm', 'p', 'bs', 's', 'ss', 'ng', 'j', 'ch', 'k', 't', 'p', 'h'];

const KANA_MAP = {
  'ア': 'A', 'イ': 'I', 'ウ': 'U', 'エ': 'E', 'オ': 'O',
  'カ': 'Ka', 'キ': 'Ki', 'ク': 'Ku', 'ケ': 'Ke', 'コ': 'Ko',
  'サ': 'Sa', 'シ': 'Shi', 'ス': 'Su', 'セ': 'Se', 'ソ': 'So',
  'タ': 'Ta', 'チ': 'Chi', 'ツ': 'Tsu', 'テ': 'Te', 'ト': 'To',
  'ナ': 'Na', 'ニ': 'Ni', 'ヌ': 'Nu', 'ネ': 'Ne', 'ノ': 'No',
  'ハ': 'Ha', 'ヒ': 'Hi', 'フ': 'Fu', 'ヘ': 'He', 'ホ': 'Ho',
  'マ': 'Ma', 'ミ': 'Mi', 'ム': 'Mu', 'メ': 'Me', 'モ': 'Mo',
  'ヤ': 'Ya', 'ユ': 'Yu', 'ヨ': 'Yo',
  'ラ': 'Ra', 'リ': 'Ri', 'ル': 'Ru', 'レ': 'Re', 'ロ': 'Ro',
  'ワ': 'Wa', 'ヲ': 'Wo', 'ン': 'N',
  'ガ': 'Ga', 'ギ': 'Gi', 'グ': 'Gu', 'ゲ': 'Ge', 'ゴ': 'Go',
  'ザ': 'Za', 'ジ': 'Ji', 'ズ': 'Zu', 'ゼ': 'Ze', 'ゾ': 'Zo',
  'ダ': 'Da', 'ヂ': 'Ji', 'ヅ': 'Zu', 'デ': 'De', 'ド': 'Do',
  'バ': 'Ba', 'ビ': 'Bi', 'ブ': 'Bu', 'ベ': 'Be', 'ボ': 'Bo',
  'パ': 'Pa', 'ピ': 'Pi', 'プ': 'Pu', 'ペ': 'Pe', 'ポ': 'Po',
  'キャ': 'Kya', 'キュ': 'Kyu', 'キョ': 'Kyo',
  'シャ': 'Sha', 'シュ': 'Shu', 'ショ': 'Sho',
  'チャ': 'Cha', 'チュ': 'Chu', 'チョ': 'Cho',
  'ニャ': 'Nya', 'ニュ': 'Nyu', 'ニョ': 'Nyo',
  'ヒャ': 'Hya', 'ヒュ': 'Hyu', 'ヒョ': 'Hyo',
  'ミャ': 'Mya', 'ミュ': 'Myu', 'ミョ': 'Myo',
  'リャ': 'Rya', 'リュ': 'Ryu', 'リョ': 'Ryo',
  'ギャ': 'Gya', 'ギュ': 'Gyu', 'ギョ': 'Gyo',
  'ジャ': 'Ja', 'ジュ': 'Ju', 'ジョ': 'Jo',
  'ビャ': 'Bya', 'ビュ': 'Byu', 'ビョ': 'Byo',
  'ピャ': 'Pya', 'ピュ': 'Pyu', 'ピョ': 'Pyo',
  'ー': '-'
};

for (const [k, v] of Object.entries({ ...KANA_MAP })) {
  if (k.length === 1 && k >= 'ア' && k <= 'ン') {
    const h = String.fromCharCode(k.charCodeAt(0) - 0x60);
    KANA_MAP[h] = v.toLowerCase();
  }
}

const KNOWN_TRANSLATIONS = {
  // Artists
  '紅蓮華': 'Gurenge',
  '米津玄師': 'Kenshi Yonezu',
  '宇多田ヒカル': 'Hikaru Utada',
  '藤井 風': 'Fujii Kaze',
  '藤井風': 'Fujii Kaze',
  'スピッツ': 'Spitz',
  'あいみょん': 'Aimyon',
  '緑黄色社会': 'Ryokuoushoku Shakai',
  'ずとまよ': 'ZUTOMAYO',
  'ずっと真夜中でいいのに。': 'ZUTOMAYO',
  'ヨルシカ': 'Yorushika',
  '美波': 'Minami',
  '大野克夫': 'Katsuo Ohno',
  '和田光司': 'Koji Wada',
  '影山ヒロノブ': 'Hironobu Kageyama',
  '高橋洋子': 'Yoko Takahashi',
  'Official髭男dism': 'Official HIGE DANdism',
  'ポルノグラフィティ': 'Porno Graffitti',
  'アンディ': 'Andy',
  '藍井エイル': 'Eir Aoi',
  '菅田将暉': 'Masaki Suda',

  // Titles
  '炎': 'Homura',
  '残響散歌': 'Zankyou Sanka',
  '夜に駆ける': 'Racing into the Night',
  'アイドル': 'Idol',
  '怪物': 'Monster',
  '群青': 'Gunjou',
  '祝福': 'The Blessing',
  '勇者': 'The Brave',
  'ハルジオン': 'Halzion',
  'たぶん': 'Probably',
  'アンコール': 'Encore',
  'ハルカ': 'Haruka',
  '三原色': 'RGB',
  'もう少しだけ': 'Just a Little Step',
  '怪獣の花唄': 'Kaiju no Hanauta',
  '踊り子': 'Odoriko',
  '不可幸力': 'Fukakouryoku',
  '東京フラッシュ': 'Tokyo Flash',
  '丸の内サディスティック': 'Marunouchi Sadistic',
  'きらり': 'Kirari',
  '死ぬのがいいわ': 'Shinunoga E-Wa',
  'まつり': 'Matsuri',
  '何なんw': 'Nan-Nan',
  'キツネノボタン': 'Kitsune no Botan',
  'ロビンソン': 'Robinson',
  'チェリー': 'Cherry',
  '空も飛べるはず': 'Sora mo Toberuhazu',
  '青のすみか': 'Where Our Blue Is',
  '廻廻奇譚': 'Kaikai Kitan',
  '心臓を捧げよ': 'Shinzou wo Sasageyo',
  '紅蓮の弓矢': 'Guren no Yumiya',
  '打上花火': 'Uchiage Hanabi',
  'ピースサイン': 'Peace Sign',
  '前前前世': 'Zenzenzense',
  'スパークル': 'Sparkle',
  'なんでもないや': 'Nandemonaiya',
  '残酷な天使のテーゼ': 'Cruel Angel\'s Thesis',
  '名探偵コナン メイン・テーマ': 'Detective Conan Main Theme',
  'ブルーアンバー': 'Blue Amber',
  '水平線': 'Suiheisen',
  '高嶺の花子さん': 'Takane no Hanako-san',
  'クリスマスソング': 'Christmas Song',
  'ハッピーエンド': 'Happy End',
  'ドライフラワー': 'Dry Flower',
  'ベテルギウス': 'Betelgeuse',
  'マリーゴールド': 'Marigold',
  '君はロックを聴かない': 'Kimi Wa Rock Wo Kikanai',
  '愛を伝えたいだとか': 'Ai Wo Tsutaetaidatoka',
  '春の日': 'Spring Day',
  '봄날': 'Spring Day',
  '피 땀 눈물': 'Blood Sweat & Tears',
  '불타오르네': 'FIRE',
  '작은 것들을 위한 시': 'Boy With Luv',
  '뚜두뚜두': 'DDU-DU DDU-DU',
  '마지막처럼': 'As If It\'s Your Last',
  '휘파람': 'WHISTLE',
  '붐바야': 'BOOMBAYAH',
  '러브 다이브': 'LOVE DIVE',
  '일레븐': 'ELEVEN',
  '애프터 라이크': 'After LIKE',
  '디토': 'Ditto',
  '하입보이': 'Hype Boy',
  '어텐션': 'Attention',
  '오마이갓': 'Oh My God',
  '톰보이': 'TOMBOY',
  '퀸카': 'Queencard',
  '쏘왓': 'So What',
  '아이엠': 'I AM',
  '배드보이': 'Bad Boy',
  '사이코': 'Psycho',
  '빨간 맛': 'Red Flavor',
  '뱅뱅뱅': 'BANG BANG BANG',
  '하루하루': 'Haru Haru',
  '거짓말': 'Lies',
  '마지막 인사': 'Last Farewell',
  '판타스틱 베이비': 'Fantastic Baby',
  '소원을 말해봐': 'Genie',
  '다시 만난 세계': 'Into the New World',
  '주문': 'Mirotic',
  '내가 제일 잘 나가': 'I Am the Best',
  '롤리폴리': 'Roly-Poly',
  '보핍보핍': 'Bo Peep Bo Peep',
  '방탄소년단': 'BTS',
  '블랙핑크': 'BLACKPINK',
  '트와이스': 'TWICE',
  '빅뱅': 'BIGBANG',
  '엑소': 'EXO',
  '세븐틴': 'SEVENTEEN',
  '동방신기': 'TVXQ!',
  '슈퍼주니어': 'Super Junior',
  '샤이니': 'SHINee',
  '아이유': 'IU',
  '뉴진스': 'NewJeans',
  '소녀시대': 'Girls\' Generation'
};

function romanizeHangul(text) {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code >= 0xAC00 && code <= 0xD7A3) {
      const offset = code - 0xAC00;
      const initial = Math.floor(offset / 588);
      const vowel = Math.floor((offset % 588) / 28);
      const final = offset % 28;
      result += HANGUL_INITIALS[initial] + HANGUL_VOWELS[vowel] + HANGUL_FINALS[final];
    } else {
      result += text[i];
    }
  }
  return result;
}

function romanizeKana(text) {
  let result = '';
  let i = 0;
  while (i < text.length) {
    if (i + 1 < text.length && KANA_MAP[text.substr(i, 2)]) {
      result += KANA_MAP[text.substr(i, 2)];
      i += 2;
    } else if (KANA_MAP[text[i]]) {
      result += KANA_MAP[text[i]];
      i++;
    } else {
      result += text[i];
      i++;
    }
  }
  return result;
}

// Convert non-Thai foreign text (Japanese / Korean / Chinese) to English / Romaji
function convertToEnglishIfNeeded(text) {
  if (!text || typeof text !== 'string') return '';
  const trimmed = text.trim();

  // RULE: Besides Thai, keep Thai unchanged ("นอกจากไทย ไว้คงเดิม")
  const hasThai = /[\u0E00-\u0E7F]/.test(trimmed);
  if (hasThai) {
    return trimmed;
  }

  // Check if text contains CJK / Japanese / Korean
  const hasCJK = /[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\uAC00-\uD7AF\u1100-\u11FF]/.test(trimmed);
  if (!hasCJK) {
    return trimmed;
  }

  // 1. Direct dictionary match
  if (KNOWN_TRANSLATIONS[trimmed]) {
    return KNOWN_TRANSLATIONS[trimmed];
  }

  // 2. Check if text contains a parenthesized English/Romaji subtitle
  const parenMatch = trimmed.match(/[(\[]([a-zA-Z0-9\s,'\-_!.]+)[)\]]/);
  if (parenMatch && parenMatch[1].trim().length >= 3) {
    return parenMatch[1].trim();
  }

  // 3. Partial dictionary replacements
  let converted = trimmed;
  for (const [nonLatin, english] of Object.entries(KNOWN_TRANSLATIONS)) {
    if (converted.includes(nonLatin)) {
      converted = converted.replace(new RegExp(nonLatin, 'g'), english);
    }
  }

  // 4. Korean Hangul algorithmic romanization
  if (/[\uAC00-\uD7AF]/.test(converted)) {
    converted = romanizeHangul(converted);
  }

  // 5. Japanese Kana algorithmic romanization
  if (/[\u3040-\u30FF]/.test(converted)) {
    converted = romanizeKana(converted);
  }

  // Clean double spaces or extra hyphens
  converted = converted.replace(/\s+/g, ' ').replace(/^[-_\s]+|[-_\s]+$/g, '').trim();

  return converted || trimmed;
}

function cleanTrackTitle(title) {
  if (!title) return '';
  const converted = convertToEnglishIfNeeded(title);
  return converted
    .replace(/\s*\(feat\..*?\)/gi, '')
    .replace(/\s*\[feat\..*?\]/gi, '')
    .replace(/\s*\(ft\..*?\)/gi, '')
    .replace(/\s*\[ft\..*?\]/gi, '')
    .replace(/\s*-\s*Single/gi, '')
    .replace(/\s*-\s*EP/gi, '')
    .replace(/\s*\(Original Soundtrack\)/gi, '')
    .replace(/\s*\(From .*?\)/gi, '')
    .replace(/\s*\[From .*?\]/gi, '')
    .replace(/\s*\(.*?OST.*?\)/gi, '')
    .replace(/\s*\[.*?OST.*?\]/gi, '')
    .replace(/\s*\(Remastered.*?\)/gi, '')
    .replace(/\s*-\s*Remastered.*$/gi, '')
    .replace(/\s*\(Live.*?\)/gi, '')
    .replace(/\s*\[Live.*?\]/gi, '')
    .replace(/\s*-\s*Live.*$/gi, '')
    .replace(/\s*\[.*?Tour.*?\]/gi, '')
    .replace(/\s*\(.*?Tour.*?\)/gi, '')
    .replace(/\s*\(.*?Concert.*?\)/gi, '')
    .replace(/\s*\[.*?Concert.*?\]/gi, '')
    .replace(/\s*\(Encore.*?\)/gi, '')
    .replace(/\s*\[Encore.*?\]/gi, '')
    .replace(/\s*\[JP version\]/gi, '')
    .replace(/\s*\(JP version\)/gi, '')
    .replace(/\s*-\s*JP Ver\..*$/gi, '')
    .replace(/\s*-\s*Instrumental.*$/gi, '')
    .replace(/\s*\(Instrumental.*?\)/gi, '')
    .replace(/\s*-\s*Acoustic.*$/gi, '')
    .replace(/\s*\(Acoustic.*?\)/gi, '')
    .trim();
}

// Normalized alphanumeric song key for strict deduplication
function normalizeSongKey(title) {
  if (!title) return '';
  const clean = convertToEnglishIfNeeded(title);
  return clean
    .toLowerCase()
    .replace(/\[.*?\]/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/\s*-\s*(live|remastered|remix|acoustic|instrumental|original|single|ep|jp ver|version|edit|audio|special).*$/i, '')
    .replace(/[\s\-_.,'"!?:;()[\]]/g, '')
    .trim();
}

function cleanArtistName(artist) {
  if (!artist) return '';
  const converted = convertToEnglishIfNeeded(artist);
  const parts = converted.split(/,\s*|&\s*|\s+feat\.\s+|\s+ft\.\s+/i);
  if (parts.length > 2 && converted.length > 30) {
    return parts.slice(0, 2).join(' & ');
  }
  return converted.trim();
}

// Match track artist against query to filter out irrelevant foreign artists from iTunes fuzzy fallback
function isArtistMatch(artistName, query) {
  if (!query || !artistName) return false;
  const a = artistName.toLowerCase().replace(/[^a-z0-9ก-๙]/g, '');
  const q = query.toLowerCase().replace(/[^a-z0-9ก-๙]/g, '');
  // Exempt franchise/soundtrack terms where query is anime/show title
  const isSoundtrack = ['doraemon', 'dragonball', 'digimon', 'onepiece', 'naruto', 'conan', 'pokemon', 'sailormoon', 'evangelion', 'chainsaw', 'jujutsu', 'demonslayer'].some(k => q.includes(k));
  if (isSoundtrack) return true;
  return a.includes(q) || q.includes(a);
}

// Multi-API Hybrid Engine: iTunes + Deezer with automatic rotation, rate-limit cooldown, and mutual failover
let itunesCooldownUntil = 0;
let deezerCooldownUntil = 0;
let apiQueryRoundRobinCounter = 0;

// Fetch tracks from iTunes Search API with rate-limit detection
async function fetchTracksFromITunes(query, country = 'th') {
  if (Date.now() < itunesCooldownUntil) {
    throw new Error('ITUNES_IN_COOLDOWN');
  }

  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=30&country=${country}&lang=en_us`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.status === 429 || res.status === 403) {
      itunesCooldownUntil = Date.now() + 25000;
      throw new Error(`ITUNES_RATE_LIMIT_${res.status}`);
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    return (data.results || [])
      .filter(t => t.previewUrl && t.trackName && t.artistName && isArtistMatch(t.artistName, query))
      .map(t => ({
        id: `itunes_${t.trackId}`,
        title: cleanTrackTitle(t.trackName),
        originalTitle: t.trackName,
        artist: cleanArtistName(t.artistName),
        album: t.collectionName || '',
        year: t.releaseDate ? parseInt(t.releaseDate.substring(0, 4), 10) : 2020,
        previewUrl: t.previewUrl,
        artwork: t.artworkUrl100
          ? t.artworkUrl100.replace('100x100bb', '600x600bb')
          : '/images/default_cover.svg',
        source: 'itunes'
      }))
      .filter(t => t.title && t.artist);
  } catch (err) {
    clearTimeout(timeout);
    if (err.message?.includes('RATE_LIMIT')) {
      itunesCooldownUntil = Date.now() + 25000;
    }
    throw err;
  }
}

// Fetch tracks from Deezer API with rate-limit detection
async function fetchTracksFromDeezer(query) {
  if (Date.now() < deezerCooldownUntil) {
    throw new Error('DEEZER_IN_COOLDOWN');
  }

  const url = `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=30`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.status === 429 || res.status === 403) {
      deezerCooldownUntil = Date.now() + 25000;
      throw new Error(`DEEZER_RATE_LIMIT_${res.status}`);
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    return (data.data || [])
      .filter(t => t.preview && t.title && t.artist?.name && isArtistMatch(t.artist.name, query))
      .map(t => ({
        id: `dz_${t.id}`,
        title: cleanTrackTitle(t.title),
        originalTitle: t.title,
        artist: cleanArtistName(t.artist.name),
        album: t.album?.title || '',
        year: t.release_date ? parseInt(t.release_date.substring(0, 4), 10) : (t.album?.release_date ? parseInt(t.album.release_date.substring(0, 4), 10) : 2021),
        previewUrl: t.preview, // 30s mp3 stream
        artwork: t.album?.cover_xl || t.album?.cover_big || t.album?.cover_medium || '/images/default_cover.svg',
        source: 'deezer'
      }))
      .filter(t => t.title && t.artist);
  } catch (err) {
    clearTimeout(timeout);
    if (err.message?.includes('RATE_LIMIT')) {
      deezerCooldownUntil = Date.now() + 25000;
    }
    throw err;
  }
}

// Hybrid Track Fetcher: Rotates between iTunes and Deezer, with instant mutual failover
async function fetchTracksForQuery(query, country = 'th') {
  const cacheKey = `${country}_${query.toLowerCase()}`;
  if (trackCache.has(cacheKey)) {
    return trackCache.get(cacheKey);
  }

  // Round-robin selection: Alternate between iTunes and Deezer
  const isITunesPrimary = (apiQueryRoundRobinCounter++ % 2 === 0);
  let primary = isITunesPrimary ? 'itunes' : 'deezer';
  let secondary = isITunesPrimary ? 'deezer' : 'itunes';

  // If primary is in cooldown but secondary is healthy, swap immediately
  if (primary === 'itunes' && Date.now() < itunesCooldownUntil && Date.now() >= deezerCooldownUntil) {
    primary = 'deezer';
    secondary = 'itunes';
  } else if (primary === 'deezer' && Date.now() < deezerCooldownUntil && Date.now() >= itunesCooldownUntil) {
    primary = 'itunes';
    secondary = 'deezer';
  }

  let tracks = [];
  try {
    tracks = (primary === 'itunes')
      ? await fetchTracksFromITunes(query, country)
      : await fetchTracksFromDeezer(query);
  } catch (err) {
    console.warn(`[Hybrid API] Primary (${primary}) unavailable for "${query}" (${err.message}), auto-switching to ${secondary}...`);
  }

  // If primary returned 0 tracks or failed, immediately failover to secondary!
  if (!tracks || tracks.length === 0) {
    try {
      tracks = (secondary === 'itunes')
        ? await fetchTracksFromITunes(query, country)
        : await fetchTracksFromDeezer(query);
      if (tracks.length > 0) {
        console.log(`[Hybrid API] Recovered successfully with ${secondary}! Found ${tracks.length} songs for "${query}".`);
      }
    } catch (err) {
      console.warn(`[Hybrid API] Secondary (${secondary}) also unavailable for "${query}":`, err.message);
    }
  }

  // Populate global catalog for live autocomplete in typing mode
  for (const t of tracks) {
    const catalogKey = `${t.title.toLowerCase()}_${t.artist.toLowerCase()}`;
    if (!globalCatalogMap.has(catalogKey)) {
      globalCatalogMap.set(catalogKey, {
        title: t.title,
        artist: t.artist,
        displayText: `${t.title} - ${t.artist}`
      });
    }
  }

  trackCache.set(cacheKey, tracks);
  return tracks;
}

// Resolve queries for user selections
function resolveSubcategories(selectedIds = []) {
  if (!selectedIds || selectedIds.length === 0 || selectedIds.includes('mix')) {
    return Object.values(ALL_SUBCATEGORIES).filter(s => !s.id.endsWith('_all'));
  }

  const result = [];
  const seenSubIds = new Set();

  for (const id of selectedIds) {
    if (MAIN_CATEGORIES[id]) {
      const subs = MAIN_CATEGORIES[id].subcategories.filter(s => !s.id.endsWith('_all'));
      for (const s of subs) {
        if (!seenSubIds.has(s.id)) {
          seenSubIds.add(s.id);
          result.push(ALL_SUBCATEGORIES[s.id]);
        }
      }
    } else if (ALL_SUBCATEGORIES[id]) {
      if (!seenSubIds.has(id)) {
        seenSubIds.add(id);
        result.push(ALL_SUBCATEGORIES[id]);
      }
    }
  }

  return result.length > 0 ? result : Object.values(ALL_SUBCATEGORIES).filter(s => !s.id.endsWith('_all'));
}

// Get pool of tracks for selected categories with smart batching, strict deduplication, and diversity enforcement
async function getTracksForSelection(selection = ['mix'], count = 10) {
  let targetSubs = resolveSubcategories(selection);
  const allTracks = [];
  const seenNormTitles = new Set();
  const seenIds = new Set();

  // If 'mix' selected, pick 6 random subcategories to maintain diversity without flooding API
  if (selection.includes('mix') || selection.length === 0) {
    targetSubs = [...targetSubs].sort(() => Math.random() - 0.5).slice(0, 6);
  }

  // Ensure plenty of diverse queries (artists) are picked based on requested count:
  // If count is 20, we need at least 40-50 candidate tracks
  const totalQueriesTarget = Math.max(12, Math.ceil(count * 1.6), targetSubs.length * 3);
  const queriesPerSub = Math.min(
    Math.max(...targetSubs.map(s => s.queries.length)),
    Math.max(3, Math.ceil(totalQueriesTarget / targetSubs.length))
  );

  const queryTasks = [];
  for (const sub of targetSubs) {
    const shuffledQueries = [...sub.queries].sort(() => Math.random() - 0.5);
    const selectedQueries = shuffledQueries.slice(0, Math.min(sub.queries.length, queriesPerSub));
    for (const q of selectedQueries) {
      queryTasks.push({ query: q, country: sub.country, sub });
    }
  }

  // Execute in batches of 4 with short cooldown to guarantee 0 rate limit errors
  const batchSize = 4;
  for (let i = 0; i < queryTasks.length; i += batchSize) {
    const batch = queryTasks.slice(i, i + batchSize);
    const results = await Promise.all(batch.map(task => fetchTracksForQuery(task.query, task.country)));

    batch.forEach((task, idx) => {
      const tracks = results[idx] || [];
      let songsAddedForThisArtist = 0;

      for (const t of tracks) {
        if (seenIds.has(t.id)) continue;
        const normKey = normalizeSongKey(t.title);
        // STRICT DEDUPLICATION: No duplicate song titles allowed in the pool!
        if (!normKey || seenNormTitles.has(normKey)) continue;

        seenIds.add(t.id);
        seenNormTitles.add(normKey);

        allTracks.push({
          ...t,
          mainId: task.sub.mainId,
          subId: task.sub.id,
          category: `${task.sub.mainIcon} ${task.sub.name}`
        });

        songsAddedForThisArtist++;
        // Limit to 3 distinct songs per artist query in the initial pool to guarantee variety!
        if (songsAddedForThisArtist >= 3) break;
      }
    });

    if (i + batchSize < queryTasks.length) {
      await new Promise(resolve => setTimeout(resolve, 40));
    }
  }

  return allTracks;
}

// Generate hints for a track
function generateHintsForTrack(track) {
  const title = convertToEnglishIfNeeded(track.title);
  const artist = convertToEnglishIfNeeded(track.artist);

  const charCount = title.replace(/\s+/g, '').length;
  const hint1 = `ความยาวชื่อเพลง: ${charCount} ตัวอักษร`;
  const firstChar = title.trim().charAt(0);
  const hint2 = `ขึ้นต้นด้วยตัวอักษร: "${firstChar}..."`;
  const hint3 = `ชื่อศิลปินเจ้าของเพลงคือ: "${artist}"`;

  return [hint1, hint2, hint3];
}

// Generate quiz questions
async function generateQuizQuestions(selection = ['mix'], count = 10, gameMode = 'choices', questionTarget = 'mixed') {
  let pool = await getTracksForSelection(selection, count);

  const firstCat = selection[0] || 'mix';
  let targetMainId = 'mix';
  let defaultCategoryName = '🔀 มิกซ์รวมทุกหมวด';
  let specificSeeds = null;

  if (firstCat === 'lukthung') {
    targetMainId = 'lukthung';
    defaultCategoryName = '🌾 ลูกทุ่ง & เพื่อชีวิต';
    specificSeeds = seedData['lukthung'];
  } else if (firstCat === 'tpop') {
    targetMainId = 'tpop';
    defaultCategoryName = '💫 T-Pop ไอดอล';
    specificSeeds = seedData['tpop'];
  } else if (firstCat === 'thai_rap') {
    targetMainId = 'thai_rap';
    defaultCategoryName = '🎤 แร็ป & ฮิปฮอปไทย';
    specificSeeds = seedData['thai_rap'];
  } else if (firstCat === 'thai_poprock') {
    targetMainId = 'thai_poprock';
    defaultCategoryName = '🎸 ป๊อป & ร็อกคลาสสิก';
    specificSeeds = seedData['thai_poprock'] || seedData['thai'];
  } else if (firstCat.startsWith('thai')) {
    targetMainId = 'thai';
    defaultCategoryName = '🇹🇭 เพลงไทย';
    specificSeeds = seedData['thai'];
  } else if (firstCat.startsWith('kpop')) {
    targetMainId = 'kpop';
    defaultCategoryName = '✨ เพลง K-Pop';
    specificSeeds = seedData['kpop'];
  } else if (firstCat.startsWith('inter')) {
    targetMainId = 'inter';
    defaultCategoryName = '🌍 เพลงสากล';
    specificSeeds = seedData['inter'];
  } else if (firstCat.startsWith('anime') || firstCat === 'jpop_hits') {
    targetMainId = 'anime';
    defaultCategoryName = '🎌 เพลงการ์ตูน & อนิเมะ';
    specificSeeds = seedData['anime'];
  } else if (firstCat.startsWith('latest')) {
    targetMainId = 'latest';
    defaultCategoryName = '🔥 เพลงฮิตล่าสุด';
    specificSeeds = Object.values(seedData).flat();
  }

  // If pool has fewer than count * 2 songs (e.g. rate limit 429 or network hitch), inject category-specific seed songs
  if (pool.length < Math.max(12, count * 2)) {
    const seedsToInject = specificSeeds || (
      targetMainId === 'mix'
        ? Object.values(seedData).flat()
        : (seedData[targetMainId] || seedData['thai'] || [])
    );

    const existingKeys = new Set(pool.map(t => normalizeSongKey(t.title)));
    for (const seedTrack of seedsToInject) {
      const k = normalizeSongKey(seedTrack.title);
      if (!existingKeys.has(k)) {
        existingKeys.add(k);
        pool.push({
          ...seedTrack,
          category: seedTrack.category || defaultCategoryName
        });
      }
    }
  }

  // If gameMode is 'songdle', ensure worldwide song pool is thoroughly populated!
  if (gameMode === 'songdle') {
    const worldwideSeeds = Object.values(seedData).flat();
    const existingKeys = new Set(pool.map(t => normalizeSongKey(t.title)));
    for (const seedTrack of worldwideSeeds) {
      const k = normalizeSongKey(seedTrack.title);
      if (!existingKeys.has(k)) {
        existingKeys.add(k);
        pool.push(seedTrack);
      }
    }
  }

  // Shuffle pool
  pool.sort(() => Math.random() - 0.5);

  // Maximum variety: Cap each artist to at most 1 song (or max 2 songs) across the entire quiz!
  const selectedTracks = [];
  const artistCount = {};
  const maxPerArtist = count <= 5 ? 1 : 2;

  for (const t of pool) {
    const artistKey = (t.artist || '').toLowerCase();
    if ((artistCount[artistKey] || 0) < maxPerArtist) {
      selectedTracks.push(t);
      artistCount[artistKey] = (artistCount[artistKey] || 0) + 1;
      if (selectedTracks.length >= count) break;
    }
  }

  // Fill up if still needed
  if (selectedTracks.length < count) {
    for (const t of pool) {
      if (!selectedTracks.some(s => s.id === t.id)) {
        selectedTracks.push(t);
        if (selectedTracks.length >= count) break;
      }
    }
  }

  // Group pool by main category for smarter distractors
  const poolByMain = {};
  for (const t of pool) {
    if (!poolByMain[t.mainId]) poolByMain[t.mainId] = [];
    poolByMain[t.mainId].push(t);
  }

  // Large Autocomplete Candidate Songs Pool: Combine current pool + all cached songs with metadata
  const candidateSongs = Array.from(globalCatalogMap.values()).map(t => {
    const titleEng = convertToEnglishIfNeeded(t.title);
    const artistEng = convertToEnglishIfNeeded(t.artist);
    const meta = getArtistMetadata(artistEng, t.mainId);
    const yr = t.year || (t.releaseDate ? parseInt(t.releaseDate.substring(0, 4), 10) : 2021);
    const id = t.id || `${artistEng}_${titleEng}`.toLowerCase().replace(/[\s\-_]/g, '');
    return {
      id,
      title: titleEng,
      artist: artistEng,
      displayText: `${titleEng} - ${artistEng}`,
      artwork: t.artwork,
      artistType: meta.type,
      genre: meta.genre,
      country: meta.country,
      year: yr || 2021
    };
  });
  if (candidateSongs.length < 80) {
    const seeds = Object.values(seedData).flat();
    seeds.forEach(t => {
      const titleEng = convertToEnglishIfNeeded(t.title);
      const artistEng = convertToEnglishIfNeeded(t.artist);
      const k = `${titleEng.toLowerCase()}_${artistEng.toLowerCase()}`;
      if (!candidateSongs.some(c => `${c.title.toLowerCase()}_${c.artist.toLowerCase()}` === k)) {
        const meta = getArtistMetadata(artistEng, t.mainId);
        const yr = t.year || (t.releaseDate ? parseInt(t.releaseDate.substring(0, 4), 10) : 2021);
        const id = t.id || `${artistEng}_${titleEng}`.toLowerCase().replace(/[\s\-_]/g, '');
        candidateSongs.push({
          id,
          title: titleEng,
          artist: artistEng,
          displayText: `${titleEng} - ${artistEng}`,
          artwork: t.artwork,
          artistType: meta.type,
          genre: meta.genre,
          country: meta.country,
          year: yr || 2021
        });
      }
    });
  }

  const questions = [];

  for (let i = 0; i < selectedTracks.length; i++) {
    const track = selectedTracks[i];
    const effectiveSubId = track.subId || firstCat;
    const sameSubPool = pool.filter(t => t.subId === effectiveSubId);
    const subSeeds = seedData[effectiveSubId] || (specificSeeds && specificSeeds.length > 0 ? specificSeeds : []);
    const strictCategoryPool = sameSubPool.length >= 4 ? sameSubPool : (subSeeds.length >= 4 ? subSeeds : (poolByMain[track.mainId] || pool));

    // Determine question mode: choices, typing, year, heardle, songdle, or mv
    let questionType = 'choices';
    if (gameMode === 'typing') {
      questionType = 'typing';
    } else if (gameMode === 'mixed') {
      questionType = i % 2 === 0 ? 'choices' : 'typing';
    } else if (gameMode === 'year') {
      questionType = 'year';
    } else if (gameMode === 'heardle') {
      questionType = 'heardle';
    } else if (gameMode === 'songdle') {
      questionType = 'songdle';
    } else if (gameMode === 'mv') {
      questionType = 'mv';
    }

    const hints = generateHintsForTrack(track);

    const trackTitle = convertToEnglishIfNeeded(track.title);
    const trackArtist = convertToEnglishIfNeeded(track.artist);
    const trackAlbum = convertToEnglishIfNeeded(track.album || '');
    const actualYear = track.year || (track.releaseDate ? parseInt(track.releaseDate.substring(0, 4), 10) : null) || 2020;

    if (questionType === 'songdle') {
      const meta = getArtistMetadata(trackArtist, track.mainId);
      const targetMetadata = {
        id: track.id || `${trackTitle}_${trackArtist}`.toLowerCase().replace(/[\s\-_]/g, ''),
        title: trackTitle,
        artist: trackArtist,
        album: trackAlbum,
        artwork: track.artwork,
        previewUrl: track.previewUrl,
        artistType: meta.type,
        genre: meta.genre,
        country: meta.country,
        year: actualYear,
        displayText: `${trackTitle} - ${trackArtist}`
      };

      questions.push({
        id: i + 1,
        mode: 'songdle',
        target: 'songdle',
        type: 'songdle',
        category: '🌍 สุ่มเพลงทั่วโลก (Worldwide Music)',
        question: '🟩 SONGDLE: ทายชื่อเพลงปริศนาประจำรอบ โดยดูคำใบ้สีจากตาราง!',
        previewUrl: track.previewUrl,
        artwork: track.artwork,
        correctTitle: trackTitle,
        correctArtist: trackArtist,
        album: trackAlbum,
        releaseYear: actualYear,
        targetMetadata,
        hints,
        options: [],
        correctIndex: -1
      });
    } else if (questionType === 'heardle') {
      questions.push({
        id: i + 1,
        mode: 'heardle',
        target: 'heardle',
        type: 'heardle',
        category: track.category || '🎵 ดนตรี',
        question: '🎧 HEARDLE: ฟังเสียงตัวอย่างสั้นๆ แล้วทายชื่อเพลงหรือศิลปิน!',
        previewUrl: track.previewUrl,
        artwork: track.artwork,
        correctTitle: trackTitle,
        correctArtist: trackArtist,
        album: trackAlbum,
        releaseYear: actualYear,
        hints,
        options: [],
        correctIndex: -1
      });
    } else if (questionType === 'mv') {
      const mvList = [...CURATED_MUSIC_VIDEOS].sort(() => Math.random() - 0.5);
      const mvTrack = mvList[i % mvList.length];
      questions.push({
        id: mvTrack.id || (i + 1),
        trackId: mvTrack.id,
        mode: 'mv',
        target: 'mv',
        type: 'mv',
        category: `🎬 Music Video (${mvTrack.country})`,
        question: '🎬 MV GUESS: ดูคลิป Music Video สั้นๆ แล้วทายชื่อเพลงหรือศิลปิน!',
        previewUrl: mvTrack.previewUrl,
        videoUrl: mvTrack.previewUrl,
        artwork: mvTrack.artwork,
        correctTitle: mvTrack.title,
        correctArtist: mvTrack.artist,
        album: mvTrack.album,
        releaseYear: mvTrack.year,
        hints: [
          `แนวเพลง: ${mvTrack.genre}`,
          `สัญชาติ: ${mvTrack.country}`,
          `ปีที่ปล่อย: ${mvTrack.year}`
        ],
        options: [],
        correctIndex: -1
      });
    } else if (questionType === 'typing') {
      // In typing mode, players can freely answer either the song title, artist, or both!
      const questionText = 'ทายชื่อเพลง หรือ ศิลปินเจ้าของเพลงนี้? (Guess the song title or artist)';

      questions.push({
        id: i + 1,
        mode: 'typing',
        target: 'both',
        type: 'both',
        category: track.category || '🎵 ดนตรี',
        question: questionText,
        previewUrl: track.previewUrl,
        artwork: track.artwork,
        correctTitle: trackTitle,
        correctArtist: trackArtist,
        album: trackAlbum,
        releaseYear: actualYear,
        hints,
        options: [],
        correctIndex: -1
      });
    } else if (questionType === 'year') {
      // Mode 4: Guess the release year (4 choices of years)
      const questionText = 'เพลงที่กำลังเล่นอยู่นี้ปล่อยออกมาในปี ค.ศ. ใด? (In which year was this song released?)';
      const correctOption = String(actualYear);

      const offsets = [-3, -2, -1, 1, 2, 3, 4, -4, 5, -5].sort(() => Math.random() - 0.5);
      const wrongYears = new Set();
      const currentYear = new Date().getFullYear();

      for (const off of offsets) {
        const candidate = actualYear + off;
        if (candidate >= 1970 && candidate <= currentYear && candidate !== actualYear) {
          wrongYears.add(String(candidate));
          if (wrongYears.size >= 3) break;
        }
      }

      let fallbackDelta = 1;
      while (wrongYears.size < 3) {
        const candidate = actualYear + fallbackDelta;
        if (candidate !== actualYear && candidate >= 1970 && candidate <= currentYear) {
          wrongYears.add(String(candidate));
        }
        fallbackDelta = fallbackDelta > 0 ? -fallbackDelta : (-fallbackDelta + 1);
      }

      const options = [correctOption, ...Array.from(wrongYears)].sort(() => Math.random() - 0.5);

      questions.push({
        id: i + 1,
        mode: 'year',
        target: 'year',
        type: 'year',
        category: track.category || '🎵 ดนตรี',
        question: questionText,
        previewUrl: track.previewUrl,
        artwork: track.artwork,
        correctTitle: trackTitle,
        correctArtist: trackArtist,
        album: trackAlbum,
        releaseYear: actualYear,
        hints,
        options,
        correctIndex: options.indexOf(correctOption)
      });
    } else {
      // 4 Choices Mode: Question is "เพลงที่กำลังเล่นอยู่นี้คือเพลงอะไร? (What is this song?)"
      // Every answer choice is formatted as: "ชื่อเพลง - ชื่อศิลปิน (Song Title - Artist Name)"
      const questionText = 'เพลงที่กำลังเล่นอยู่นี้คือเพลงอะไร? (What is this song?)';
      const correctOption = `${trackTitle} - ${trackArtist}`;
      const correctNormKey = normalizeSongKey(correctOption);

      const wrongOptions = [];
      const seenOptionKeys = new Set([correctNormKey]);

      // 1. First priority: other tracks from the exact same subcategory/genre pool
      const shuffledSubPool = [...strictCategoryPool].sort(() => Math.random() - 0.5);
      for (const t of shuffledSubPool) {
        const tTitle = convertToEnglishIfNeeded(t.title);
        const tArtist = convertToEnglishIfNeeded(t.artist);
        const optStr = `${tTitle} - ${tArtist}`;
        const optKey = normalizeSongKey(optStr);

        if (optKey && !seenOptionKeys.has(optKey)) {
          seenOptionKeys.add(optKey);
          wrongOptions.push(optStr);
          if (wrongOptions.length >= 3) break;
        }
      }

      // 2. Second priority: category-specific seed data if still needed
      if (wrongOptions.length < 3 && subSeeds.length > 0) {
        const shuffledSeeds = [...subSeeds].sort(() => Math.random() - 0.5);
        for (const t of shuffledSeeds) {
          const tTitle = convertToEnglishIfNeeded(t.title);
          const tArtist = convertToEnglishIfNeeded(t.artist);
          const optStr = `${tTitle} - ${tArtist}`;
          const optKey = normalizeSongKey(optStr);

          if (optKey && !seenOptionKeys.has(optKey)) {
            seenOptionKeys.add(optKey);
            wrongOptions.push(optStr);
            if (wrongOptions.length >= 3) break;
          }
        }
      }

      // 3. Third priority: pool by main category ONLY if subcategory is not strictly isolated
      const isStrictlyIsolated = ['lukthung', 'thai_rap', 'tpop', 'anime'].includes(effectiveSubId);
      if (wrongOptions.length < 3 && !isStrictlyIsolated) {
        const shuffledCatPool = [...(poolByMain[track.mainId] || pool)].sort(() => Math.random() - 0.5);
        for (const t of shuffledCatPool) {
          const tTitle = convertToEnglishIfNeeded(t.title);
          const tArtist = convertToEnglishIfNeeded(t.artist);
          const optStr = `${tTitle} - ${tArtist}`;
          const optKey = normalizeSongKey(optStr);

          if (optKey && !seenOptionKeys.has(optKey)) {
            seenOptionKeys.add(optKey);
            wrongOptions.push(optStr);
            if (wrongOptions.length >= 3) break;
          }
        }
      }

      // 4. Absolute fallback if somehow still needed
      let fallbackIdx = 1;
      while (wrongOptions.length < 3) {
        let dummy = `เพลงตัวอย่าง ${fallbackIdx} - ศิลปินตัวอย่าง`;
        if (firstCat === 'lukthung') dummy = `เพลงลูกทุ่งยอดฮิต ${fallbackIdx} - รวมศิลปินลูกทุ่ง`;
        else if (firstCat === 'thai_rap') dummy = `เพลงแร็ปฮิต ${fallbackIdx} - รวมแร็ปเปอร์ไทย`;
        else if (firstCat === 'tpop') dummy = `T-Pop Song ${fallbackIdx} - T-Pop Idol`;
        else if (track.mainId === 'inter') dummy = `Sample Song ${fallbackIdx} - Sample Artist`;
        wrongOptions.push(dummy);
        fallbackIdx++;
      }

      const options = [correctOption, ...wrongOptions].sort(() => Math.random() - 0.5);

      questions.push({
        id: i + 1,
        mode: 'choices',
        target: 'song',
        type: 'song',
        category: track.category || '🎵 ดนตรี',
        question: questionText,
        previewUrl: track.previewUrl,
        artwork: track.artwork,
        correctTitle: trackTitle,
        correctArtist: trackArtist,
        album: trackAlbum,
        releaseYear: actualYear,
        hints,
        options,
        correctIndex: options.indexOf(correctOption)
      });
    }
  }

  return { questions, candidateSongs };
}

module.exports = {
  MAIN_CATEGORIES,
  ALL_SUBCATEGORIES,
  generateQuizQuestions
};
