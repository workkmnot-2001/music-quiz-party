const { generateQuizQuestions } = require('../server/musicService');

async function test() {
  console.log('Testing Anime Quiz (Should be 100% English/Romaji, 0 Kanji/Kana)...');
  const animeQuiz = await generateQuizQuestions(['anime'], 10, 'choices');
  let animeCJKFound = false;

  for (const q of animeQuiz.questions) {
    console.log(`\nQ${q.id} [${q.type}]: ${q.correctTitle} by ${q.correctArtist} (Album: ${q.album})`);
    console.log('  Options:', q.options.join(' | '));
    const allText = `${q.correctTitle} ${q.correctArtist} ${q.album} ${q.options.join(' ')}`;
    const cjk = allText.match(/[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\uAC00-\uD7AF]/g);
    if (cjk) {
      console.error(`  ❌ CJK detected in Q${q.id}:`, cjk.join(''));
      animeCJKFound = true;
    }
  }

  if (!animeCJKFound) {
    console.log('\n✅ ANIME TEST PASSED: 0 Kanji/Kana found in all questions & options!');
  } else {
    console.error('\n❌ ANIME TEST FAILED: CJK detected in anime questions!');
  }

  console.log('\n----------------------------------------\nTesting Thai Quiz (Thai text MUST remain Thai)...');
  const thaiQuiz = await generateQuizQuestions(['thai'], 5, 'choices');
  let thaiPreservedCount = 0;

  for (const q of thaiQuiz.questions) {
    console.log(`\nQ${q.id} [${q.type}]: ${q.correctTitle} by ${q.correctArtist}`);
    console.log('  Options:', q.options.join(' | '));
    const allText = `${q.correctTitle} ${q.correctArtist} ${q.options.join(' ')}`;
    const thaiMatches = allText.match(/[\u0E00-\u0E7F]/g);
    if (thaiMatches && thaiMatches.length > 0) {
      thaiPreservedCount++;
    }
  }

  if (thaiPreservedCount === thaiQuiz.questions.length) {
    console.log('\n✅ THAI TEST PASSED: All Thai titles, artists, and options preserved in Thai!');
  } else {
    console.error('\n❌ THAI TEST FAILED: Thai text was not preserved!');
  }

  console.log('\n----------------------------------------\nTesting K-Pop Quiz (Korean Hangul converted to English/Romaji)...');
  const kpopQuiz = await generateQuizQuestions(['kpop'], 5, 'choices');
  let kpopHangulFound = false;
  for (const q of kpopQuiz.questions) {
    console.log(`\nQ${q.id} [${q.type}]: ${q.correctTitle} by ${q.correctArtist}`);
    console.log('  Options:', q.options.join(' | '));
    const allText = `${q.correctTitle} ${q.correctArtist} ${q.options.join(' ')}`;
    const hangul = allText.match(/[\uAC00-\uD7AF]/g);
    if (hangul) {
      console.error(`  ❌ Hangul detected in Q${q.id}:`, hangul.join(''));
      kpopHangulFound = true;
    }
  }

  if (!kpopHangulFound) {
    console.log('\n✅ K-POP TEST PASSED: 0 Hangul found in all questions & options!');
  } else {
    console.error('\n❌ K-POP TEST FAILED: Hangul detected!');
  }
}

test().then(() => process.exit(0)).catch(err => {
  console.error('Fatal error during test:', err);
  process.exit(1);
});

