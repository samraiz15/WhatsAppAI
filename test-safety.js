const assert = require('assert');
const { safeLogValue } = require('./message-utils');
const { routeParkViewQuestion } = require('./router');

const sensitivePayload = {
  key: {
    id: 'abc123',
    remoteJid: '923001234567@s.whatsapp.net',
    fromMe: false,
    participant: '923001234567@s.whatsapp.net'
  },
  rootKey: 'super-secret-root-key',
  privKey: 'super-secret-private-key',
  remoteIdentityKey: 'super-secret-remote-identity',
  message: {
    conversation: 'Hello there'
  }
};

function testSafeLogValue() {
  const output = safeLogValue(sensitivePayload);

  assert.ok(typeof output === 'string');
  assert.ok(!/rootKey|privKey|remoteIdentityKey/i.test(output));
  assert.ok(/conversation|Hello there|remoteJid/i.test(output));
}

async function testParkViewSafety() {
  const approvalAnswer = await routeParkViewQuestion('Is Park View approved?');
  const approvalText = String(approvalAnswer || '').toLowerCase();

  assert.ok(
    /block|authority|specific|exact|verify|verification|current source|project/i.test(approvalText),
    `Approval answer was too generic: ${approvalAnswer}`
  );
  assert.ok(
    !/fully approved|all blocks have noc|no issue at all|provisional acceptance/i.test(approvalText),
    `Approval answer should not hard-code a legal fact: ${approvalAnswer}`
  );

  const unknownBlockAnswer = await routeParkViewQuestion('Is Rose approved?');
  const unknownBlockText = String(unknownBlockAnswer || '').toLowerCase();
  assert.ok(
    /exact block|authority|project|verify|verification/i.test(unknownBlockText),
    `Unknown-block approval answer was not properly scoped: ${unknownBlockAnswer}`
  );

  const staleSourceAnswer = await routeParkViewQuestion('What is the current NOC for Jade Extension?');
  const staleSourceText = String(staleSourceAnswer || '').toLowerCase();
  assert.ok(
    /exact block|authority|verify|verification|current source|current status/i.test(staleSourceText),
    `Stale-source approval answer was not properly scoped: ${staleSourceAnswer}`
  );

  const conflictingSourceAnswer = await routeParkViewQuestion('Is there any approval conflict for Park View?');
  const conflictingSourceText = String(conflictingSourceAnswer || '').toLowerCase();
  assert.ok(
    /authority|block|project|verify|verification|current source|exact/i.test(conflictingSourceText),
    `Conflicting-source approval answer was too certain: ${conflictingSourceAnswer}`
  );

  const priceAnswer = await routeParkViewQuestion('What is the current price of a 5 marla plot in Park View?');
  const priceText = String(priceAnswer || '').toLowerCase();

  assert.ok(
    /current price needs confirmation|verified current figure|i do not have a verified current figure|price.*needs confirmation/i.test(priceText),
    `Price answer should not invent a current price: ${priceAnswer}`
  );
}

(async () => {
  testSafeLogValue();
  await testParkViewSafety();
  console.log('SAFETY TESTS: 100% PASSED');
})().catch(error => {
  console.error('FAIL:', error.message);
  process.exitCode = 1;
});
