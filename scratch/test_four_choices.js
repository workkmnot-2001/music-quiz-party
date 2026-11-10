const { generateQuizQuestions } = require('../server/musicService');

async function test() {
  console.log('--- TEST 1: Anime Category (4 Choices format: Title - Artist) ---');
  const animeQuiz = await generateQuizQuestions(['anime'], 5, 'choices');
  for (const q of animeQuiz.questions) {
    console.log(`\nQ${q.id} [${q.mode}]: ${q.question}`);
    console.log(`  Correct: ${q.correctTitle} - ${q.correctArtist}`);
    console.log(`  Options (Index ${q.correctIndex}):`);
    q.options.forEach((opt, idx) => {
      console.log(`    [${idx}] ${opt} ${idx === q.correctIndex ? '✅ (CORRECT)' : ''}`);
      if (!opt.includes(' - ')) {
        throw new Error(`Option "${opt}" is not formatted as "Title - Artist"!`);
      }
    });

    if (q.question.includes('ใครคือศิลปิน')) {
      throw new Error(`Question ${q.id} still asks "ใครคือศิลปิน"!`);
    }

    if (q.options[q.correctIndex] !== `${q.correctTitle} - ${q.correctArtist}`) {
      throw new Error(`Correct index does not match correctOption!`);
    }
  }

  console.log('\n--- TEST 2: Thai Category (4 Choices format: Title - Artist in Thai) ---');
  const thaiQuiz = await generateQuizQuestions(['thai'], 5, 'choices');
  for (const q of thaiQuiz.questions) {
    console.log(`\nQ${q.id} [${q.mode}]: ${q.question}`);
    console.log(`  Correct: ${q.correctTitle} - ${q.correctArtist}`);
    console.log(`  Options (Index ${q.correctIndex}):`);
    q.options.forEach((opt, idx) => {
      console.log(`    [${idx}] ${opt} ${idx === q.correctIndex ? '✅ (CORRECT)' : ''}`);
      if (!opt.includes(' - ')) {
        throw new Error(`Option "${opt}" is not formatted as "Title - Artist"!`);
      }
    });

    if (q.question.includes('ใครคือศิลปิน')) {
      throw new Error(`Question ${q.id} still asks "ใครคือศิลปิน"!`);
    }
  }

  console.log('\n--- TEST 3: J-Pop Category (Testing user screenshot scenario) ---');
  const jpopQuiz = await generateQuizQuestions(['jpop_hits'], 5, 'choices');
  for (const q of jpopQuiz.questions) {
    console.log(`\nQ${q.id} [${q.mode}]: ${q.question}`);
    console.log(`  Correct: ${q.correctTitle} - ${q.correctArtist}`);
    console.log(`  Options (Index ${q.correctIndex}):`);
    q.options.forEach((opt, idx) => {
      console.log(`    [${idx}] ${opt} ${idx === q.correctIndex ? '✅ (CORRECT)' : ''}`);
      if (!opt.includes(' - ')) {
        throw new Error(`Option "${opt}" is not formatted as "Title - Artist"!`);
      }
    });

    if (q.question.includes('ใครคือศิลปิน')) {
      throw new Error(`Question ${q.id} still asks "ใครคือศิลปิน"!`);
    }
  }

  console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! No more "ใครคือศิลปิน", all choices are "Title - Artist"!');
}

test().then(() => process.exit(0)).catch(err => {
  console.error('\n❌ TEST FAILED:', err.message);
  process.exit(1);
});

