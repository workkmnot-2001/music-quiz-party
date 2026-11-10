const { generateQuizQuestions } = require('../server/musicService');

async function test() {
  console.log('Testing Mode 4: Year Mode...');
  const resYear = await generateQuizQuestions(['kpop'], 3, 'year');
  console.log('Year Mode Questions Count:', resYear.questions.length);
  for (const q of resYear.questions) {
    console.log(`Q: ${q.question}`);
    console.log(`  Options: ${JSON.stringify(q.options)}, Correct: ${q.options[q.correctIndex]} (releaseYear: ${q.releaseYear})`);
    if (q.options.length !== 4) throw new Error('Expected 4 options in year mode');
    if (!q.releaseYear) throw new Error('Expected releaseYear on question');
  }

  console.log('\nTesting Mode 5: Survival Mode...');
  const resSurvival = await generateQuizQuestions(['kpop'], 3, 'survival');
  console.log('Survival Mode Questions Count:', resSurvival.questions.length);
  for (const q of resSurvival.questions) {
    console.log(`Q: ${q.question}`);
    console.log(`  Options: ${JSON.stringify(q.options)}, Correct: ${q.options[q.correctIndex]}`);
  }

  console.log('\nAll tests passed successfully!');
  process.exit(0);
}

test().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});

