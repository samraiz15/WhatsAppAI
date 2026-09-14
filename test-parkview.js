const assert = require('assert');
const { detectIntent, routeParkViewQuestion } = require('./router');

(async () => {
  const tests = [
    ['What is the payment plan?', 'payment_plan'],
    ['What are the prices?', 'price'],
    ['Which blocks are available?', 'availability'],
    ['Where is Park View City?', 'location'],
    ['What amenities are there?', 'amenities'],
    ['What facilities are available?', 'amenities'],
    ['Is there a park?', 'amenities'],
    ['What schools are there?', 'amenities'],
    ['Are there mosques?', 'amenities'],
    ['What commercial areas are there?', 'amenities'],
    ['I want a 5 marla house in Park View City', 'property_search']
  ];

  for (const [query, expectedIntent] of tests) {
    const actualIntent = detectIntent(query);
    assert.strictEqual(
      actualIntent,
      expectedIntent,
      `"${query}" => ${actualIntent}, expected ${expectedIntent}`
    );

    const answer = await routeParkViewQuestion(query);
    assert.strictEqual(typeof answer, 'string');
    assert.ok(answer.trim().length > 0);

    console.log(`PASS: ${query} -> ${actualIntent}`);
  }

  console.log('\nPARK VIEW TESTS: 100% PASSED');
})();
