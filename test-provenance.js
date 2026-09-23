'use strict';

const assert = require('assert');
const {
  FACT_STATES,
  SOURCE_CLASSES,
  createKnowledgeFact,
  createPropertyListing,
  detectFactConflicts,
  evaluateKnowledgeFact,
  evaluatePropertyListing,
  getParkViewKnowledgeAnswer
} = require('./parkview_knowledge');
const { routeParkViewQuestion } = require('./router');

const AS_OF = '2026-09-19';

function verifiedFact(overrides = {}) {
  return createKnowledgeFact({
    claim: 'The exact block has a documented status.',
    category: 'approval',
    project: 'Park View City Lahore',
    block: 'Jade',
    authority: 'LDA',
    source: 'LDA record',
    checkedAt: '2026-09-18',
    status: 'documented',
    scope: 'block',
    confidence: 'high',
    sourceType: 'official_authority_source',
    ...overrides
  });
}

function run() {
  const fact = verifiedFact();
  assert.strictEqual(
    evaluateKnowledgeFact(fact, {
      asOf: AS_OF,
      project: 'Park View City Lahore',
      block: 'Jade',
      authority: 'LDA'
    }).state,
    FACT_STATES.VERIFIED,
    'exact block and authority should allow a verified fact'
  );

  assert.strictEqual(
    evaluateKnowledgeFact(fact, {
      asOf: AS_OF,
      project: 'Park View City Lahore',
      block: 'Jasmine',
      authority: 'LDA'
    }).state,
    FACT_STATES.OUT_OF_SCOPE,
    'a Jade fact must not answer Jasmine'
  );

  const projectFact = verifiedFact({ block: null, scope: 'project' });
  assert.strictEqual(
    evaluateKnowledgeFact(projectFact, {
      asOf: AS_OF,
      project: 'Park View City Lahore',
      block: 'Jade'
    }).state,
    FACT_STATES.OUT_OF_SCOPE,
    'a project-level fact must not become a block-level fact'
  );

  assert.strictEqual(
    evaluateKnowledgeFact(verifiedFact({ source: null }), { asOf: AS_OF }).state,
    FACT_STATES.UNVERIFIED,
    'missing source must remain unverified'
  );
  assert.strictEqual(
    evaluateKnowledgeFact(verifiedFact({ checkedAt: null }), { asOf: AS_OF }).state,
    FACT_STATES.UNVERIFIED,
    'missing date must not become current'
  );
  assert.strictEqual(
    evaluateKnowledgeFact(verifiedFact({ category: 'pricing', current: false, status: 'historical' }), { asOf: AS_OF }).state,
    FACT_STATES.STALE,
    'historical pricing must not be treated as current'
  );
  const historicalPrice = evaluateKnowledgeFact(verifiedFact({
    category: 'pricing',
    sourceClass: SOURCE_CLASSES.OFFICIAL_HISTORICAL,
    status: 'published',
    checkedAt: '2026-09-18'
  }), { asOf: AS_OF });
  assert.strictEqual(historicalPrice.state, FACT_STATES.STALE);
  assert.strictEqual(historicalPrice.presentation, 'historical_only');
  assert.strictEqual(historicalPrice.safeToState, false);

  const developerApproval = evaluateKnowledgeFact(verifiedFact({
    sourceClass: SOURCE_CLASSES.DEVELOPER_PUBLIC,
    checkedAt: '2026-09-18'
  }), { asOf: AS_OF });
  assert.strictEqual(developerApproval.state, FACT_STATES.VERIFIED);
  assert.strictEqual(developerApproval.safeToState, false);

  const currentAuthority = evaluateKnowledgeFact(verifiedFact({
    sourceClass: SOURCE_CLASSES.AUTHORITY_RECORD,
    checkedAt: '2026-09-18'
  }), { asOf: AS_OF });
  assert.strictEqual(currentAuthority.safeToState, true);

  const staleListing = createPropertyListing({
    listingId: 'listing-1',
    source: 'verified internal property inventory',
    checkedAt: '2026-09-01',
    project: 'Park View City Lahore',
    block: 'Jade',
    propertyType: 'Plot',
    size: '5 marla',
    price: 10000000,
    currency: 'PKR',
    priceType: 'asking',
    status: 'available'
  });
  assert.strictEqual(
    evaluatePropertyListing(staleListing, { asOf: AS_OF, block: 'Jade' }).state,
    FACT_STATES.STALE,
    'stale availability must not be represented as current'
  );

  const thirdParty = verifiedFact({
    source: 'third-party listing',
    sourceType: 'third_party_listing'
  });
  assert.strictEqual(thirdParty.sourceClass, SOURCE_CLASSES.THIRD_PARTY);
  assert.notStrictEqual(thirdParty.sourceClass, SOURCE_CLASSES.AUTHORITY_RECORD);

  const thirdPartyEvaluation = evaluateKnowledgeFact(thirdParty, { asOf: AS_OF });
  assert.strictEqual(thirdPartyEvaluation.state, FACT_STATES.VERIFIED);
  assert.strictEqual(thirdPartyEvaluation.safeToState, false, 'third-party evidence must not be treated as official');

  const userSupplied = evaluateKnowledgeFact(verifiedFact({
    sourceClass: SOURCE_CLASSES.USER_SUPPLIED,
    checkedAt: '2026-09-18'
  }), { asOf: AS_OF });
  assert.strictEqual(userSupplied.state, FACT_STATES.UNVERIFIED);
  assert.strictEqual(userSupplied.safeToState, false);

  const conflict = detectFactConflicts([
    fact,
    verifiedFact({ claim: 'The exact block has a different documented status.', source: 'developer record' })
  ]);
  assert.strictEqual(conflict.length, 1, 'conflicting facts should remain visible as a conflict');

  assert.ok(/current source|exact block|authority/i.test(getParkViewKnowledgeAnswer('What is the current NOC for Jade Extension?')));
  assert.ok(/current source|exact block|authority/i.test(getParkViewKnowledgeAnswer('What is the LDA status of Rose?')));
  assert.ok(/current source|exact block|authority/i.test(getParkViewKnowledgeAnswer('What is the RUDA status of Park View City?')));

  const jadeAnswer = getParkViewKnowledgeAnswer('Is Jade approved?');
  assert.ok(/Jade/i.test(jadeAnswer));
  assert.ok(/not current|date is missing|Check date/i.test(jadeAnswer));

  return routeParkViewQuestion('Tell me about Park View City').then(answer => {
    assert.strictEqual(typeof answer, 'object');
    assert.strictEqual(typeof answer.answer, 'string');
    assert.ok(/verified|source|specific|scoped|exact|current|authority|project|checked/i.test(answer.answer));
    console.log('PROVENANCE ARCHITECTURE TESTS: 100% PASSED');
  });
}

run().catch(error => {
  console.error('FAIL:', error.message);
  process.exitCode = 1;
});
