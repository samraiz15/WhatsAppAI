const assert = require('assert');
const { db } = require('./db');
const { rankPropertySearchResults } = require('./conversation');

const OWNER = '__PROPERTY_SEARCH_TEST__';
const JID = '__PROPERTY_SEARCH_TEST__@g.us';

const insert = db.prepare(`
  INSERT INTO group_messages (
    owner_phone,
    group_jid,
    group_name,
    sender_phone,
    sender_name,
    message
  )
  VALUES (?, ?, ?, ?, ?, ?)
`);

const fixtures = [
  ['Crystal Block', 'Crystal 321 5 marla all dues clear plot. PRA tax paid. For sale. 85 lac demand'],
  ['Crystal Block', '1294 (5-Marla) All Dues Clear @75 Lac Demand NDC APPLIED'],
  ['Tulip Extension', '1913 Tulip Extension 5 marla plot for sale. Transfer free only. 75 lac demand'],
  ['Tulip Extension', '2024 Tulip Extension 5 marla plot for sale. Transfer free only. 75 lac best offer required'],
  ['Tulip Extension', '5 Marla Available For Sale Tulip Extension Block. 272 Full Paid Only. Offer Required'],
  ['Park View', '5 Marla House For Rent. Visit Possible Any Time Keys in Hand'],
  ['Tulip Overseas', '5 Marla Tulip Overseas gray structure and finishing house available for sale'],
  ['Silver Block', '10 marla plot Silver Block for sale 1.5 crore demand'],
  ['Platinum Block', '5 marla plot Platinum Block for sale 90 lac demand']
];

const queries = [
  {
    query: '5 marla plot in Crystal',
    expectedBlock: 'crystal',
    expectedType: 'plot',
    expectedSize: 5
  },
  {
    query: '5 marla plot in Tulip Extension',
    expectedBlock: 'tulip extension',
    expectedType: 'plot',
    expectedSize: 5
  },
  {
    query: '5 marla house',
    expectedBlock: null,
    expectedType: 'house',
    expectedSize: 5
  },
  {
    query: '10 marla plot in Silver',
    expectedBlock: 'silver',
    expectedType: 'plot',
    expectedSize: 10
  },
  {
    query: '5 marla plot in Platinum',
    expectedBlock: 'platinum',
    expectedType: 'plot',
    expectedSize: 5
  }
];

db.exec('BEGIN');

try {
  for (const [groupName, message] of fixtures) {
    insert.run(
      OWNER,
      JID,
      groupName,
      'TEST_SENDER',
      'Test Sender',
      message
    );
  }

  const rows = db.prepare(`
    SELECT
      id,
      group_name,
      sender_phone,
      sender_name,
      message,
      created_at
    FROM group_messages
    WHERE owner_phone = ?
    ORDER BY id DESC
  `).all(OWNER);

  assert.strictEqual(
    rows.length,
    fixtures.length,
    'Fixture row count mismatch'
  );

  for (const test of queries) {
    const results = rankPropertySearchResults(test.query, rows);

    assert.ok(
      results.length > 0,
      `No results for: ${test.query}`
    );

    for (const result of results) {
      assert.ok(
        result.match_score > 0,
        `Invalid score for: ${test.query}`
      );
    }

    const first = results[0];

    console.log(
      `PASS: ${test.query} -> ${results.length} result(s), top score ${first.match_score}`
    );
  }

  // Negative tests: these must NOT return unrelated blocks/types.
  const crystal = rankPropertySearchResults(
    '5 marla plot in Crystal',
    rows
  );

  assert.ok(
    crystal.every(r =>
      /\bcrystal\b/i.test(r.message)
    ),
    'Crystal search returned a non-Crystal listing'
  );

  const silver = rankPropertySearchResults(
    '10 marla plot in Silver',
    rows
  );

  assert.ok(
    silver.every(r =>
      /\bsilver\b/i.test(r.message) &&
      /\b10\s*-?\s*marla\b/i.test(r.message)
    ),
    'Silver search returned an invalid listing'
  );

  const platinum = rankPropertySearchResults(
    '5 marla plot in Platinum',
    rows
  );

  assert.ok(
    platinum.every(r =>
      /\bplatinum\b/i.test(r.message) &&
      /\b5\s*-?\s*marla\b/i.test(r.message)
    ),
    'Platinum search returned an invalid listing'
  );

  console.log('PROPERTY SEARCH TESTS: 100% PASSED');
} finally {
  db.exec('ROLLBACK');
}
