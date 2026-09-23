const fs = require('fs');
const assert = require('assert');

process.env.WHATSAPPAI_DB_PATH = './agent.test.db';

for (const file of ['agent.test.db', 'agent.test.db-shm', 'agent.test.db-wal']) {
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
const { hasInboundMessageForPhone } = require('./db');

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

async function testNameDetection() {
  const cases = [
    ['+923009999991', 'My name is Rajpoot', 'Rajpoot'],
    ['+923009999992', 'I am Rajpoot', 'Rajpoot'],
    ['+923009999993', "I'm Rajpoot", 'Rajpoot'],
    ['+923009999994', 'This is Rajpoot', 'Rajpoot'],
    ['+923009999995', 'Rajpoot', null],
    ['+923009999996', 'Platinum', null],
    ['+923009999997', '5 marla', null],
    ['+923009999998', 'DHA Lahore', null],
    ['+923009999990', '2 crore', null]
  ];

  for (const [phone, message, expectedName] of cases) {
    const result = await processMessage(phone, message);

    assert.strictEqual(
      result.lead.name,
      expectedName,
      `Unexpected name detection for "${message}"`
    );
  }

  console.log('PASS: name detection regression');
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

async function testOutboundContactGuard() {
  const phone = '+923009999998';

  assert.strictEqual(hasInboundMessageForPhone(phone), false, 'New phone should not have prior inbound message');

  const original = require('./db');
  const messageId = `guard-${Date.now()}`;
  original.registerWhatsappMessage({
    messageId,
    remoteJid: null,
    participantJid: phone,
    fromMe: false,
    messageType: 'conversation',
    messageText: 'hello',
    messageTimestamp: Math.floor(Date.now() / 1000)
  });

  assert.strictEqual(hasInboundMessageForPhone(phone), true, 'Inbound customer message should make the phone eligible when stored via participant_jid');
  assert.strictEqual(hasInboundMessageForPhone('923009999998@s.whatsapp.net'), true, 'Normalized inbound JID should also count as eligible');

  console.log('PASS: outbound contact guard regression');
}

async function main() {
  testPropertyParsing();
  testSearchParsing();
  await testLeadConversation();
  await testNameDetection();
  await testOutboundContactGuard();

  console.log('\nCONVERSATION TESTS: 100% PASSED');
}

main().catch(error => {
  console.error('\nFAIL:', error.message);
  process.exitCode = 1;
});
