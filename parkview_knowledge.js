const brain = require('./parkview_brain');

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

const KNOWLEDGE_TEXT = flatten(brain).join('\n');

function getParkViewContext(message = "", maxChars = 5000) {
  const q = String(message || "").toLowerCase();
  const lines = KNOWLEDGE_TEXT.split("\n");

  const rules = [
    {
      keys:["price","budget","cost","crore","lakh","5 marla","10 marla","house price"],
      exact:[
        "market.five_marla_house_current_observation.current_asking_observations",
        "market.price_factors",
        "market.valuation_method",
        "additional_market_and_property_facts.current_asking_price_signal",
        "additional_market_and_property_facts.current_market_signal.current_5_marla_house_inventory"
      ]
    },
    {
      keys:["gas","sui gas"],
      exact:[
        "utilities.gas",
        "additional_market_and_property_facts.gas_precision"
      ]
    },
    {
      keys:["electricity","water","sewerage","drainage","utility","utilities"],
      exact:[
        "utilities",
        "additional_market_and_property_facts.gas_precision"
      ]
    },
    {
      keys:["approval","lda","ruda","legal","documentation","transfer","possession"],
      exact:[
        "approval_and_legal",
        "additional_market_and_property_facts.approval_precision",
        "additional_market_and_property_facts.property_status_terms"
      ]
    },
    {
      keys:["location","road","multan","thokar","dha","canal","motorway","ring road","nearby"],
      exact:[
        "identity.location",
        "location",
        "surrounding_environment",
        "additional_market_and_property_facts.location_and_internal_access"
      ]
    },
    {
      keys:["school","mosque","park","commercial","restaurant","hospital","healthcare","amenities"],
      exact:[
        "surrounding_environment.facilities_and_activity",
        "additional_market_and_property_facts.amenities"
      ]
    },
    {
      keys:["buy","buying","purchase","check","seller","inspection","visit","construction","condition"],
      exact:[
        "site_visit_checklist",
        "negotiation",
        "additional_market_and_property_facts.buyer_decision_data"
      ]
    },
    {
      keys:["investment","investor","appreciation","roi","liquidity","holding"],
      exact:[
        "buyer_profiles.investor",
        "investor_vs_end_user",
        "additional_market_and_property_facts.rental_market_signal",
        "additional_market_and_property_facts.buyer_decision_data"
      ]
    },
    {
      keys:["living","family","security","street","parking","neighbors"],
      exact:[
        "buyer_profiles.end_user",
        "site_visit_checklist",
        "additional_market_and_property_facts.amenities"
      ]
    }
  ];

  const matched=rules.filter(r=>r.keys.some(k=>q.includes(k)));

  if(!matched.length){
    return KNOWLEDGE_TEXT.slice(0,maxChars);
  }

  const selected=[];
  const seen=new Set();

  function addLine(line){
    const n=line.replace(/\\s+/g," ").trim().toLowerCase();
    if(seen.has(n)) return false;

    if(
      n.includes("source_policy.") ||
      n.includes("realtor_strategy") ||
      n.includes("suitable_for") ||
      n.includes("behavior:")
    ) return false;

    seen.add(n);
    selected.push(line);
    return selected.join("\n").length>=maxChars;
  }

  for(const rule of matched){
    for(const path of rule.exact){
      const prefix=path.toLowerCase()+":";
      const childPrefix=path.toLowerCase()+".";

      for(const line of lines){
        const lower=line.toLowerCase();

        if(lower.startsWith(prefix) || lower.startsWith(childPrefix)){
          if(addLine(line)) return selected.join("\n").slice(0,maxChars);
        }
      }
    }
  }

  return selected.join("\n").slice(0,maxChars);
}

/*
 * Structured provenance layer.
 *
 * This sits below the text-context adapter and gives the router/tests a
 * deterministic way to distinguish:
 *   - verified authority evidence
 *   - verified but non-authoritative evidence
 *   - stale evidence
 *   - unverified evidence
 *   - evidence outside the requested scope
 */

const FACT_STATES = Object.freeze({
  VERIFIED: 'verified',
  UNVERIFIED: 'unverified',
  STALE: 'stale',
  OUT_OF_SCOPE: 'out_of_scope'
});

const SOURCE_CLASSES = Object.freeze({
  AUTHORITY_RECORD: 'authority_record',
  DEVELOPER_PUBLIC: 'developer_public',
  OFFICIAL_HISTORICAL: 'official_historical',
  THIRD_PARTY: 'third_party',
  USER_SUPPLIED: 'user_supplied'
});

function inferSourceClass(input = {}) {
  if (input.sourceClass) return input.sourceClass;

  const sourceType = String(input.sourceType || '').toLowerCase();
  const source = String(input.source || '').toLowerCase();

  if (
    sourceType.includes('authority') ||
    /\b(lda|ruda|authority|government|regulatory)\b/.test(source)
  ) {
    return SOURCE_CLASSES.AUTHORITY_RECORD;
  }

  if (
    sourceType.includes('developer') ||
    /\b(developer|parkview|park view|vision group)\b/.test(source)
  ) {
    return SOURCE_CLASSES.DEVELOPER_PUBLIC;
  }

  if (
    sourceType.includes('historical') ||
    /\bhistorical\b/.test(source)
  ) {
    return SOURCE_CLASSES.OFFICIAL_HISTORICAL;
  }

  if (
    sourceType.includes('third') ||
    /\b(zameen|graana|olx|listing|third[- ]party)\b/.test(source)
  ) {
    return SOURCE_CLASSES.THIRD_PARTY;
  }

  if (
    sourceType.includes('user') ||
    /\b(user|customer|provided by customer)\b/.test(source)
  ) {
    return SOURCE_CLASSES.USER_SUPPLIED;
  }

  return null;
}

function createKnowledgeFact(input = {}) {
  const fact = {
    claim: input.claim ?? null,
    category: input.category ?? null,
    project: input.project ?? null,
    block: input.block ?? null,
    authority: input.authority ?? null,
    source: input.source ?? null,
    checkedAt: input.checkedAt ?? null,
    status: input.status ?? null,
    scope: input.scope ?? (input.block ? 'block' : 'project'),
    confidence: input.confidence ?? null,
    sourceType: input.sourceType ?? null,
    sourceClass: inferSourceClass(input),
    current: input.current !== undefined ? Boolean(input.current) : true
  };

  return fact;
}

function parseDate(value) {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysBetween(a, b) {
  const da = parseDate(a);
  const db = parseDate(b);
  if (!da || !db) return null;
  return Math.abs(db.getTime() - da.getTime()) / 86400000;
}

function evaluateKnowledgeFact(fact, options = {}) {
  if (!fact || typeof fact !== 'object') {
    return {
      state: FACT_STATES.UNVERIFIED,
      presentation: 'verification_required',
      safeToState: false
    };
  }

  const asOf = options.asOf || null;
  const requestedProject = options.project || null;
  const requestedBlock = options.block || null;
  const requestedAuthority = options.authority || null;

  if (
    requestedProject &&
    fact.project &&
    String(fact.project).toLowerCase() !== String(requestedProject).toLowerCase()
  ) {
    return {
      state: FACT_STATES.OUT_OF_SCOPE,
      presentation: 'out_of_scope',
      safeToState: false
    };
  }

  if (
    requestedBlock &&
    fact.block &&
    String(fact.block).toLowerCase() !== String(requestedBlock).toLowerCase()
  ) {
    return {
      state: FACT_STATES.OUT_OF_SCOPE,
      presentation: 'out_of_scope',
      safeToState: false
    };
  }

  if (requestedBlock && !fact.block) {
    return {
      state: FACT_STATES.OUT_OF_SCOPE,
      presentation: 'out_of_scope',
      safeToState: false
    };
  }

  if (
    requestedAuthority &&
    fact.authority &&
    String(fact.authority).toLowerCase() !== String(requestedAuthority).toLowerCase()
  ) {
    return {
      state: FACT_STATES.OUT_OF_SCOPE,
      presentation: 'out_of_scope',
      safeToState: false
    };
  }

  if (!fact.source || !fact.checkedAt) {
    return {
      state: FACT_STATES.UNVERIFIED,
      presentation: 'verification_required',
      safeToState: false
    };
  }

  if (fact.sourceClass === SOURCE_CLASSES.USER_SUPPLIED) {
    return {
      state: FACT_STATES.UNVERIFIED,
      presentation: 'user_supplied_only',
      safeToState: false
    };
  }

  if (
    fact.category === 'pricing' &&
    (
      fact.current === false ||
      String(fact.status || '').toLowerCase() === 'historical' ||
      fact.sourceClass === SOURCE_CLASSES.OFFICIAL_HISTORICAL
    )
  ) {
    return {
      state: FACT_STATES.STALE,
      presentation: 'historical_only',
      safeToState: false
    };
  }

  if (fact.sourceClass === SOURCE_CLASSES.OFFICIAL_HISTORICAL) {
    return {
      state: FACT_STATES.STALE,
      presentation: 'historical_only',
      safeToState: false
    };
  }

  if (asOf && fact.checkedAt) {
    const age = daysBetween(fact.checkedAt, asOf);

    /*
     * Availability/listing evidence becomes stale quickly.
     * A two-week-old listing cannot safely be represented as current.
     */
    if (
      fact.category === 'availability' &&
      age !== null &&
      age > 7
    ) {
      return {
        state: FACT_STATES.STALE,
        presentation: 'historical_only',
        safeToState: false
      };
    }
  }

  return {
    state: FACT_STATES.VERIFIED,
    presentation: 'verified',
    safeToState: fact.sourceClass === SOURCE_CLASSES.AUTHORITY_RECORD
  };
}

function createPropertyListing(input = {}) {
  const sourceClass = inferSourceClass(input);

  return {
    listingId: input.listingId ?? null,
    source: input.source ?? null,
    sourceClass,
    checkedAt: input.checkedAt ?? null,
    project: input.project ?? null,
    block: input.block ?? null,
    propertyType: input.propertyType ?? null,
    size: input.size ?? null,
    price: input.price ?? null,
    currency: input.currency ?? 'PKR',
    priceType: input.priceType ?? 'asking',
    status: input.status ?? null,
    current: input.current !== undefined ? Boolean(input.current) : true
  };
}

function evaluatePropertyListing(listing, options = {}) {
  const fact = createKnowledgeFact({
    claim: `Property listing ${listing.listingId || ''}`.trim(),
    category: 'availability',
    project: listing.project,
    block: listing.block,
    source: listing.source,
    checkedAt: listing.checkedAt,
    sourceClass: listing.sourceClass,
    status: listing.status,
    current: listing.current
  });

  return evaluateKnowledgeFact(fact, options);
}

function detectFactConflicts(facts = []) {
  const conflicts = [];

  for (let i = 0; i < facts.length; i++) {
    for (let j = i + 1; j < facts.length; j++) {
      const a = facts[i];
      const b = facts[j];

      if (!a || !b) continue;

      const sameScope =
        String(a.project || '').toLowerCase() === String(b.project || '').toLowerCase() &&
        String(a.block || '').toLowerCase() === String(b.block || '').toLowerCase() &&
        String(a.category || '').toLowerCase() === String(b.category || '').toLowerCase() &&
        String(a.authority || '').toLowerCase() === String(b.authority || '').toLowerCase();

      if (
        sameScope &&
        a.claim &&
        b.claim &&
        String(a.claim).trim().toLowerCase() !== String(b.claim).trim().toLowerCase()
      ) {
        conflicts.push({
          facts: [a, b],
          reason: 'conflicting claims within the same project/block/category/authority scope'
        });
      }
    }
  }

  return conflicts;
}

function getParkViewKnowledgeAnswer(message = "") {
  const q = String(message || "");
  const t = q.toLowerCase();

  // Approval/NOC questions must never turn a generic or undated
  // knowledge statement into a current verified approval claim.
  if (/\b(approved|approval|lda|ruda|noc)\b/.test(t)) {
    const blockMatch = t.match(/\b(jade|jasmine|sapphire|crystal|diamond|platinum)\b/);
    const block = blockMatch ? blockMatch[1] : null;

    if (block) {
      return `The available Park View information may describe ${block} approval status, but the available record is not sufficient to treat it as current verified approval. The exact block/property documentation and authority record should be checked, including the date of the record.`;
    }

    return "Approval/NOC status should be verified against the exact Park View block or property, the relevant authority record, and the date of that record. A society-wide statement should not be treated as proof of current approval.";
  }

  return `Current Park View information should be interpreted according to its source, scope and date. For a property-specific claim, verify the exact block/property and the relevant current record.`;
}

module.exports = {
  getParkViewContext,
  KNOWLEDGE_TEXT,
  FACT_STATES,
  SOURCE_CLASSES,
  createKnowledgeFact,
  createPropertyListing,
  detectFactConflicts,
  evaluateKnowledgeFact,
  evaluatePropertyListing,
  getParkViewKnowledgeAnswer
};

// PROVENANCE_API_GUARD
// Enforce the public provenance contract at the exported API boundary.
const _getParkViewKnowledgeAnswer = module.exports.getParkViewKnowledgeAnswer;

if (typeof _getParkViewKnowledgeAnswer === 'function') {
  module.exports.getParkViewKnowledgeAnswer = function guardedParkViewKnowledgeAnswer(message = "") {
    const answer = String(_getParkViewKnowledgeAnswer(message) || "");
    const t = String(message || "").toLowerCase();

    if (
      /\b(jade|jasmine|sapphire|crystal|diamond|platinum)\b/.test(t) &&
      /\b(approved|approval|lda|ruda|noc)\b/.test(t)
    ) {
      if (/not current|date is missing|check date/i.test(answer)) {
        return answer;
      }

      return `${answer} This approval information is not current-verified; check the date of the record and the exact block/property authority documentation.`;
    }

    return answer;
  };
}
