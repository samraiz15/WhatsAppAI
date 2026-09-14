const fs = require('fs');
const assert = require('assert');

for (const file of ['agent.db', 'agent.db-shm', 'agent.db-wal']) {
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

const {
  processMessage,
  detectInterest,
  detectPropertySize,
  parseBudgetNumeric,
  detectSearchPropertyType,
  detectSearchSize,
  detectSearchBudget
} = require('./conversation');

const phone = '+923009999999';

async function testLeadConversation() {
  const messages = [
    'Hi, I need a house',
    'My budget is 2 crore',
    'DHA Lahore',
    'I want to buy in 3 months',
    'My name is Ahmed'
  ];

  const expectedReplies = [
    'What is your approximate budget?',
    'Which area are you interested in?',
    'When are you planning to buy or invest?',
    'May I know your name?'
  ];

  let result;

  for (let i = 0; i < messages.length; i++) {
    result = await processMessage(phone, messages[i]);

    console.log('\nUSER:', messages[i]);
    console.log('AGENT:', result.reply);
    console.log('LEAD:', result.lead);

    if (i < expectedReplies.length) {
      assert.strictEqual(
        result.reply,
        expectedReplies[i],
        `Unexpected reply after "${messages[i]}"`
      );
    }
  }

  assert.strictEqual(result.lead.name, 'Ahmed');
  assert.strictEqual(result.lead.interest, 'House');
  assert.strictEqual(result.lead.budget, '2 crore');
  assert.strictEqual(result.lead.budget_numeric, 20000000);
  assert.strictEqual(result.lead.area, 'DHA Lahore');
  assert.strictEqual(result.lead.timeline, '3 months');

  console.log('PASS: lead conversation regression');
}

function testPropertyParsing() {
  assert.strictEqual(detectInterest('I need a house'), 'House');
  assert.strictEqual(detectPropertySize('I want a 5 marla house'), '5 marla');
  assert.strictEqual(parseBudgetNumeric('2 crore'), 20000000);

  console.log('PASS: property parsing regression');
}

function testSearchParsing() {
  const tests = [
    ['5 marla house', 'House', 5, null],
    ['house under 2 crore', 'House', null, 20000000],
    ['5 marla house under 2 crore', 'House', 5, 20000000],
    ['5 marla Park View house', 'House', 5, null],
    ['Crystal Extension house', 'House', null, null],
    ['Tulip Extension plot', 'Plot', null, null],
    ['property under 1 crore', null, null, 10000000]
  ];

  for (const [query, expectedType, expectedSize, expectedBudget] of tests) {
    const type = detectSearchPropertyType(query);
    const size = detectSearchSize(query);
    const budget = detectSearchBudget(query);

    assert.strictEqual(
      type,
      expectedType,
      `Wrong property type for "${query}"`
    );

    assert.strictEqual(
      size,
      expectedSize,
      `Wrong property size for "${query}"`
    );

    assert.strictEqual(
      budget,
      expectedBudget,
      `Wrong budget for "${query}"`
    );

    console.log(`PASS: search parsing -> ${query}`);
  }
}

async function main() {
  testPropertyParsing();
  testSearchParsing();
  await testLeadConversation();

  console.log('\nCONVERSATION TESTS: 100% PASSED');
}

main().catch(error => {
  console.error('\nFAIL:', error.message);
  process.exitCode = 1;
});
