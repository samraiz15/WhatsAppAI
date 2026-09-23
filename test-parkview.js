const assert = require('assert');
const { detectIntent, routeParkViewQuestion } = require('./router');

async function assertParkViewProvenance() {
  const getAnswer = async (query) => {
    const routed = await routeParkViewQuestion(query);
    assert.strictEqual(typeof routed, 'object');
    assert.strictEqual(typeof routed.answer, 'string');
    assert.ok(routed.source);
    assert.ok(routed.answer.trim().length > 0);
    return routed.answer;
  };

  const jadeApproval = await getAnswer('Is Jade approved?');
  assert.ok(/Jade/i.test(jadeApproval), `Jade approval answer should mention the exact block: ${jadeApproval}`);
  assert.ok(!/Jasmine|Sapphire/i.test(jadeApproval), `Jade approval answer should not generalize to other blocks: ${jadeApproval}`);

  const jasmineApproval = await getAnswer('Is Jasmine approved?');
  assert.ok(/Jasmine/i.test(jasmineApproval), `Jasmine approval answer should mention the exact block: ${jasmineApproval}`);

  const projectScope = await getAnswer('Is Park View approved?');
  assert.ok(
    /block|authority|exact|verify|verification|project/i.test(projectScope.toLowerCase()),
    `Project approval answer should remain scoped instead of claiming a blanket fact: ${projectScope}`
  );

  const unknownAnswer = await getAnswer('Is Rose approved?');
  assert.ok(
    /exact block|authority|project|verify|verification/i.test(unknownAnswer.toLowerCase()),
    `Unknown-block approval should require verification: ${unknownAnswer}`
  );

  const currentPrice = await getAnswer('What is the current price of a 5 marla plot in Park View?');
  assert.ok(
    /current price needs confirmation|verified current figure|i do not have a verified current figure/i.test(currentPrice.toLowerCase()),
    `Price answer should refuse unverified current pricing: ${currentPrice}`
  );

  const inventory = await getAnswer('Are there any current listings in Jade?');
  assert.ok(
    /verified current availability|current availability|inventory|exact block/i.test(inventory.toLowerCase()),
    `Inventory answer should not invent current listings: ${inventory}`
  );

  const unknownNoc = await getAnswer('What is the current NOC for Jade Extension?');
  assert.ok(
    /exact block|authority|verify|verification|current source|current status/i.test(unknownNoc.toLowerCase()),
    `Unknown NOC answer should stay verification-based: ${unknownNoc}`
  );

  console.log('PROVENANCE TESTS: 100% PASSED');
}

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
    assert.strictEqual(typeof answer, 'object');
    assert.strictEqual(typeof answer.answer, 'string');
    assert.ok(answer.source);
    assert.ok(answer.answer.trim().length > 0);
    console.log(`PASS: ${query} -> ${actualIntent}`);
  }

  await assertParkViewProvenance();

  console.log('\nPARK VIEW TESTS: 100% PASSED');
})();
