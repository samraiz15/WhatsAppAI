const brain = require('./parkview_brain');

const SOURCE_CLASSES = Object.freeze({
  OFFICIAL_CURRENT: 'official_current',
  OFFICIAL_HISTORICAL: 'official_historical',
  AUTHORITY_RECORD: 'authority_record',
  INTERNAL_VERIFIED: 'internal_verified',
  DEVELOPER_PUBLIC: 'developer_public',
  THIRD_PARTY: 'third_party',
  USER_SUPPLIED: 'user_supplied',
  UNKNOWN: 'unknown'
});

function normalizeSourceClass(value) {
  const sourceClass = String(value || '').toLowerCase().trim();

  const aliases = {
    official: SOURCE_CLASSES.OFFICIAL_CURRENT,
    official_source: SOURCE_CLASSES.OFFICIAL_CURRENT,
    official_authority_source: SOURCE_CLASSES.AUTHORITY_RECORD,
    official_developer_source: SOURCE_CLASSES.DEVELOPER_PUBLIC,
    developer_project_source: SOURCE_CLASSES.DEVELOPER_PUBLIC,
    government_authority: SOURCE_CLASSES.AUTHORITY_RECORD,
    verified_internal_property_inventory: SOURCE_CLASSES.INTERNAL_VERIFIED,
    third_party_listing: SOURCE_CLASSES.THIRD_PARTY,
    user_claim: SOURCE_CLASSES.USER_SUPPLIED
  };

  const normalized = aliases[sourceClass] || sourceClass;

  return Object.values(SOURCE_CLASSES).includes(normalized)
    ? normalized
    : SOURCE_CLASSES.UNKNOWN;
}

function flatten(obj, prefix = '') {
  const out = [];

  if (!obj || typeof obj !== 'object') return out;

  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      out.push(`${path}: ${value}`);
    } else if (Array.isArray(value)) {
      out.push(`${path}: ${value.join(', ')}`);
    } else if (value && typeof value === 'object') {
      out.push(...flatten(value, path));
    }
  }

  return out;
}

function createKnowledgeFact(fact = {}) {
  const sourceClass = normalizeSourceClass(fact.sourceClass || fact.sourceType);

  return {
    claim: fact.claim || '',
    category: fact.category || 'general',
    project: fact.project || null,
    block: fact.block || null,
    extension: fact.extension || null,
    propertyType: fact.propertyType || null,
    size: fact.size || null,
    authority: fact.authority || null,
    source: fact.source || null,
    sourceUrl: fact.sourceUrl || null,
    checkedAt: fact.checkedAt || null,
    effectiveDate: fact.effectiveDate || null,
    status: fact.status || 'unknown',
    scope: fact.scope || 'unknown',
    confidence: fact.confidence || 'unknown',
    notes: fact.notes || '',
    sourceType: sourceClass,
    sourceClass,
    current: fact.current !== undefined ? !!fact.current : null,
    conflictKey: fact.conflictKey || null
  };
}

function createPropertyListing(listing = {}) {
  const sourceClass = normalizeSourceClass(listing.sourceClass || listing.sourceType);

  return {
    listingId: listing.listingId || null,
    source: listing.source || null,
    sourceUrl: listing.sourceUrl || null,
    checkedAt: listing.checkedAt || null,
    project: listing.project || null,
    block: listing.block || null,
    extension: listing.extension || null,
    propertyType: listing.propertyType || null,
    size: listing.size || null,
    price: listing.price || null,
    currency: listing.currency || null,
    priceType: listing.priceType || null,
    status: listing.status || 'unknown',
    sourceType: sourceClass,
    sourceClass,
    attributes: listing.attributes || {}
  };
}

const FACT_STATES = Object.freeze({
  VERIFIED: 'verified',
  UNVERIFIED: 'unverified',
  STALE: 'stale',
  CONFLICTING: 'conflicting',
  OUT_OF_SCOPE: 'out_of_scope'
});

function parseDate(value) {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function factConflictKey(fact) {
  return [
    fact.category,
    fact.project,
    fact.block,
    fact.extension,
    fact.propertyType,
    fact.size,
    fact.authority
  ].map(value => String(value || '').toLowerCase()).join('|');
}

function detectFactConflicts(facts = []) {
  const groups = new Map();

  for (const fact of facts) {
    const key = fact.conflictKey || factConflictKey(fact);
    const group = groups.get(key) || [];
    group.push(fact);
    groups.set(key, group);
  }

  return [...groups.values()].filter(group => {
    const claims = new Set(group.map(fact => `${fact.claim}|${fact.status}`));
    return group.length > 1 && claims.size > 1;
  });
}

function scopeMatchesFact(fact, requested = {}) {
  const fields = ['project', 'block', 'extension', 'propertyType', 'size', 'authority'];

  return fields.every(field => {
    if (!requested[field]) return true;
    return normalizeText(fact[field]) === normalizeText(requested[field]);
  });
}

function evaluateKnowledgeFact(fact, options = {}) {
  if (!scopeMatchesFact(fact, options)) {
    return { state: FACT_STATES.OUT_OF_SCOPE, fact };
  }

  if (!fact.source || fact.sourceClass === SOURCE_CLASSES.UNKNOWN || fact.confidence === 'unknown') {
    return {
      state: FACT_STATES.UNVERIFIED,
      safeToState: false,
      reason: 'missing_reliable_source',
      fact
    };
  }

  if (fact.sourceClass === SOURCE_CLASSES.USER_SUPPLIED) {
    return {
      state: FACT_STATES.UNVERIFIED,
      safeToState: false,
      reason: 'user_supplied_requires_independent_verification',
      fact
    };
  }

  if (!fact.checkedAt) {
    return { state: FACT_STATES.UNVERIFIED, safeToState: false, reason: 'missing_check_date', fact };
  }

  const checkedAt = parseDate(fact.checkedAt);
  const asOf = parseDate(options.asOf) || new Date();

  if (!checkedAt) {
    return { state: FACT_STATES.UNVERIFIED, safeToState: false, reason: 'invalid_check_date', fact };
  }

  const maxAgeDays = options.maxAgeDays === undefined ? 180 : options.maxAgeDays;
  const ageDays = Math.floor((asOf.getTime() - checkedAt.getTime()) / 86400000);

  if (
    fact.sourceClass === SOURCE_CLASSES.OFFICIAL_HISTORICAL ||
    fact.current === false ||
    fact.status === 'historical' ||
    ageDays > maxAgeDays
  ) {
    return {
      state: FACT_STATES.STALE,
      safeToState: false,
      presentation: fact.sourceClass === SOURCE_CLASSES.OFFICIAL_HISTORICAL || fact.status === 'historical'
        ? 'historical_only'
        : 'stale_only',
      ageDays,
      fact
    };
  }

  return {
    state: FACT_STATES.VERIFIED,
    safeToState: [
      SOURCE_CLASSES.OFFICIAL_CURRENT,
      SOURCE_CLASSES.AUTHORITY_RECORD,
      SOURCE_CLASSES.INTERNAL_VERIFIED
    ].includes(fact.sourceClass) &&
      (fact.category !== 'approval' || fact.sourceClass === SOURCE_CLASSES.AUTHORITY_RECORD),
    ageDays,
    fact
  };
}

function evaluatePropertyListing(listing, options = {}) {
  if (!scopeMatchesFact(listing, options)) {
    return { state: FACT_STATES.OUT_OF_SCOPE, listing };
  }

  if (!listing.source || !listing.checkedAt || listing.status !== 'available') {
    return { state: FACT_STATES.UNVERIFIED, safeToState: false, reason: 'not_verified_current_inventory', listing };
  }

  const checkedAt = parseDate(listing.checkedAt);
  const asOf = parseDate(options.asOf) || new Date();

  if (!checkedAt) {
    return { state: FACT_STATES.UNVERIFIED, safeToState: false, reason: 'invalid_check_date', listing };
  }

  const maxAgeDays = options.maxAgeDays === undefined ? 7 : options.maxAgeDays;
  const ageDays = Math.floor((asOf.getTime() - checkedAt.getTime()) / 86400000);

  if (ageDays > maxAgeDays) {
    return { state: FACT_STATES.STALE, safeToState: false, ageDays, listing };
  }

  return {
    state: FACT_STATES.VERIFIED,
    safeToState: [
      SOURCE_CLASSES.OFFICIAL_CURRENT,
      SOURCE_CLASSES.AUTHORITY_RECORD,
      SOURCE_CLASSES.INTERNAL_VERIFIED
    ].includes(listing.sourceClass),
    ageDays,
    listing
  };
}

const PARK_VIEW_FACTS = [];

const KNOWLEDGE_TEXT = flatten(brain).join('\n');

function normalizeText(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function detectBlockReference(text) {
  const normalized = normalizeText(text);
  const names = [
    'topaz extension', 'tulip extension', 'tulip overseas', 'jade extension',
    'crystal extension', 'rose extension', 'imperial', 'executive', 'sapphire',
    'jasmine', 'topaz', 'rose', 'tulip', 'jade', 'crystal', 'diamond', 'platinum',
    'silver', 'pearl', 'overseas'
  ];

  for (const name of names) {
    if (normalized.includes(name)) {
      return name;
    }
  }

  return null;
}

function detectAuthorityReference(text) {
  const normalized = normalizeText(text);

  if (normalized.includes('lda')) return 'LDA';
  if (normalized.includes('ruda')) return 'RUDA';
  return null;
}

function detectCategory(text) {
  const normalized = normalizeText(text);

  if (/price|rates|cost|how much|current price/.test(normalized)) return 'pricing';
  if (/payment|installment|installments|payment plan/.test(normalized)) return 'payment_plan';
  if (/approval|approved|noc|lda|ruda|legal|documentation|title|transfer|possession/.test(normalized)) return 'approval';
  if (/inventory|availability|available|listing|listings/.test(normalized)) return 'inventory';
  if (/location|where is|road|motorway|thokar/.test(normalized)) return 'location';
  return 'general';
}

function findRelevantFacts({ text, project, block, extension, propertyType, size, category, authority }) {
  const qText = normalizeText(text);
  const matches = PARK_VIEW_FACTS.filter(fact => {
    if (category && fact.category !== category) return false;

    if (!scopeMatchesFact(fact, { project, block, extension, propertyType, size, authority })) {
      return false;
    }

    if (fact.claim && qText) {
      const factText = fact.claim.toLowerCase();
      const keywords = qText.split(/\s+/).filter(Boolean).slice(0, 6);
      if (keywords.length) {
        const matchCount = keywords.filter(word => factText.includes(word)).length;
        if (matchCount === 0 && !qText.includes(fact.project.toLowerCase())) {
          return false;
        }
      }
    }

    return true;
  });

  return matches;
}

function buildScopeSummary(fact) {
  const pieces = [];
  if (fact.project) pieces.push(fact.project);
  if (fact.block) pieces.push(`block ${fact.block}`);
  if (fact.authority) pieces.push(`authority ${fact.authority}`);
  return pieces.join(' · ') || 'unknown scope';
}

function buildFactSentence(fact) {
  const base = `${fact.source || 'An unidentified source'} states: ${fact.claim}`;
  const scope = `Scope: ${buildScopeSummary(fact)}.`;
  const sourceClass = `Source class: ${fact.sourceClass || SOURCE_CLASSES.UNKNOWN}.`;
  const status = fact.status ? `Status: ${fact.status}.` : '';
  const date = fact.checkedAt ? `Checked: ${fact.checkedAt}.` : 'Check date: not recorded; this is not current verification.';
  const source = fact.sourceUrl ? `Source reference: ${fact.sourceUrl}.` : '';
  return [base, scope, sourceClass, status, date, source].filter(Boolean).join(' ');
}

function getParkViewKnowledgeAnswer(message = '', lead = {}) {
  const text = String(message || '');
  const normalized = normalizeText(text);
  const category = detectCategory(normalized);
  const block = detectBlockReference(normalized);
  const authority = detectAuthorityReference(normalized);
  const project = /park\s*view|parkview/.test(normalized)
    ? 'Park View City Lahore'
    : (block ? 'Park View City Lahore' : null);
  const relevant = findRelevantFacts({ text: normalized, project, block, category, authority });

  if (category === 'approval' || /approval|approved|noc|lda|ruda|legal|documentation|transfer|possession/.test(normalized)) {
    if (!relevant.length) {
      const requestedScope = block ? `block ${block}` : 'exact block or project';
      return `I do not have a verified current source for ${requestedScope} and the relevant authority. This is not current verification; please share the authority and status type you want checked.`;
    }

    const exactFacts = block
      ? relevant.filter(fact => normalizeText(fact.block) === normalizeText(block))
      : relevant.filter(fact => fact.scope === 'project');

    if (exactFacts.length === 0) {
      return `I do not have a verified current source for the exact block or project in that question. The known Park View records are scoped to specific blocks/projects and must not be generalized across the whole scheme.`;
    }

    const conflicts = detectFactConflicts(exactFacts);

    if (conflicts.length) {
      const sources = conflicts[0].map(fact => `${fact.source || 'unknown source'} (${fact.checkedAt || 'undated'})`).join(' versus ');
      return `The available sources conflict for this exact scope: ${sources}. I cannot select a winning approval or NOC status without a current authority record.`;
    }

    const evaluations = exactFacts.map(fact => evaluateKnowledgeFact(fact, { project, block, authority }));
    const verified = evaluations.filter(result => result.state === FACT_STATES.VERIFIED && result.safeToState);
    const nonAuthoritative = evaluations.filter(
      result => result.state === FACT_STATES.VERIFIED && !result.safeToState
    );
    const stale = evaluations.filter(result => result.state === FACT_STATES.STALE);

    if (verified.length) {
      const summary = verified.map(result => buildFactSentence(result.fact)).join(' ');
      return `${summary} This is a scoped statement only; it must not be treated as a citywide approval conclusion for other blocks.`;
    }

    if (stale.length) {
      return `I found older evidence for the exact scope, but it is stale for a current ${authority || 'regulatory'} status. Please verify the current authority record before relying on it.`;
    }

    if (nonAuthoritative.length) {
      return `${nonAuthoritative.map(result => buildFactSentence(result.fact)).join(' ')} This source class does not establish a current authority or legal status, so verification is required.`;
    }

    return `${exactFacts.map(buildFactSentence).join(' ')} The source date is missing, so I cannot present this as a current ${authority || 'regulatory'} status.`;
  }

  if (category === 'pricing' && /price|rates|cost|how much|current price/.test(normalized)) {
    return 'Current price needs confirmation. I do not have a verified current figure for that exact block and product, and current Park View pricing is time-sensitive.';
  }

  if (category === 'payment_plan') {
    return 'I do not have a verified current payment-plan source for that exact project, block and property type. Please provide the current official plan or request a source check before relying on any installment figure.';
  }

  if (category === 'inventory' || /inventory|availability|available|listing/.test(normalized)) {
    if (!relevant.length) {
      return 'I do not have a verified current availability or inventory source for that exact block/product.';
    }
    return `${relevant.map(buildFactSentence).join(' ')} This records that the block is listed in project material, not that a property is currently available.`;
  }

  return null;
}

function getParkViewContext(message = '', maxChars = 5000) {
  const text = String(message || '').toLowerCase();

  const keywords = [
    'price',
    'budget',
    'house',
    'plot',
    'marla',
    'crystal',
    'diamond',
    'platinum',
    'jade',
    'jasmine',
    'sapphire',
    'block',
    'living',
    'resale',
    'investment',
    'investor',
    'end user',
    'agent',
    'location',
    'road',
    'motorway',
    'ring road',
    'thokar',
    'multan road',
    'dha',
    'bahria',
    'school',
    'mosque',
    'commercial',
    'park',
    'gas',
    'electricity',
    'water',
    'approval',
    'lda',
    'ruda',
    'security',
    'amenities'
  ];

  const matched = keywords.filter(k => text.includes(k));

  if (!matched.length) {
    return KNOWLEDGE_TEXT.slice(0, maxChars);
  }

  const lines = KNOWLEDGE_TEXT.split('\n');

  const scored = lines.map(line => {
    const lower = line.toLowerCase();

    let score = 0;

    for (const keyword of matched) {
      if (lower.includes(keyword)) score++;
    }

    return { line, score };
  });

  const selected = scored
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 80)
    .map(x => x.line);

  return (selected.length ? selected : lines).join('\n').slice(0, maxChars);
}

module.exports = {
  FACT_STATES,
  SOURCE_CLASSES,
  createKnowledgeFact,
  createPropertyListing,
  detectFactConflicts,
  evaluateKnowledgeFact,
  evaluatePropertyListing,
  normalizeSourceClass,
  PARK_VIEW_FACTS,
  findRelevantFacts,
  getParkViewContext,
  getParkViewKnowledgeAnswer,
  KNOWLEDGE_TEXT
};
