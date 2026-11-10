const {
  buildSongdleCatalog,
  compareSongdleGuess,
  CURATED_MUSIC_VIDEOS
} = require('../server/gameModesService');
const seedData = require('../server/seedData.json');

const allSeeds = Object.values(seedData).flat();
const catalog = buildSongdleCatalog(allSeeds);
console.log('Catalog built with size:', catalog.length);

const target = catalog.find(t => t.artist.toLowerCase().includes('blackpink'));
const guess1 = catalog.find(t => t.artist.toLowerCase().includes('twice'));
const guess2 = target;

console.log('Target:', target.displayText, 'Year:', target.year, 'Country:', target.country);
console.log('Guess 1 (TWICE):', guess1.displayText, 'Year:', guess1.year);

const result1 = compareSongdleGuess(target, guess1);
console.log('Result 1 comparison:', JSON.stringify(result1, null, 2));

const result2 = compareSongdleGuess(target, guess2);
console.log('Result 2 comparison (Victory):', result2.isVictory);

console.log('Music Videos count:', CURATED_MUSIC_VIDEOS.length);
console.log('Sample MV:', CURATED_MUSIC_VIDEOS[0].title, CURATED_MUSIC_VIDEOS[0].previewUrl);

