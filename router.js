const { askOllama } = require('./ollama');
const { getParkViewContext, getParkViewKnowledgeAnswer } = require('./parkview_knowledge');

function detectIntent(message) {
  const t = String(message || '').toLowerCase().trim();

  if (
    /\b(i want|i need|looking for|searching for|find me|show me|interested in)\b/.test(t) &&
    /\b(house|home|villa|plot|apartment|flat|property)\b/.test(t)
  ) {
    return 'property_search';
  }

  if (/\b(?:approval|approved|lda|ruda|noc|legal|documentation|title|transfer|possession)\b/.test(t)) {
    return 'approval';
  }

  if (
    /\b(resale|resell|sell later|selling later|exit)\b/.test(t) &&
    /\b(which|what|better|best|block)\b/.test(t)
  ) {
    return 'resale';
  }

  if (
    /\b(living|live|family|residential|residence)\b/.test(t) &&
    /\b(block|area|better|best|good)\b/.test(t)
  ) {
    return 'living';
  }

  if (/\b(invest|investment|investor|roi|return|appreciation)\b/.test(t)) {
    return 'investment';
  }

  if (
    /\b(best block|which block|which .*block|block.*better|better.*block)\b/.test(t) ||
    /\bwhich is better for (living|resale)\b/.test(t) ||
    /\bwhich block is better for (living|resale)\b/.test(t) ||
    /\bwhich block is best for (living|resale)\b/.test(t)
  ) {
    if (/\b(living|live|family|residential|residence)\b/.test(t)) {
      return 'living';
    }

    if (/\b(resale|resell|sell later|selling later|exit)\b/.test(t)) {
      return 'resale';
    }

    return 'block_comparison';
  }

  if (/location|located|where is|where's|access|road|motorway|ring road|thokar|multan road/.test(t)) {
    return 'location';
  }

  if (/\b(crystal)\b/.test(t)) {
    return 'crystal';
  }

  if (/\b(diamond)\b/.test(t)) {
    return 'diamond';
  }

  if (/\b(platinum)\b/.test(t)) {
    return 'platinum';
  }

  if (/\b(facility|facilities|amenities|school|schools|mosque|mosques|commercial|parks?|green|recreational)\b/.test(t) &&
      !/\bpark view city\b/.test(t)) {
    return 'amenities';
  }

  if (/available|availability|vacant|inventory|listing|listings/.test(t)) {
    return 'availability';
  }

  if (/price|prices|cost|rate|rates|how much|worth|value/.test(t)) {
    return 'price';
  }

  if (/payment|installment|installments|payment plan/.test(t)) {
    return 'payment_plan';
  }

  if (/location|located|where is|where's|access|road|motorway|ring road|thokar|multan road/.test(t)) {
    return 'location';
  }

  if (/approval|approved|lda|ruda|noc|legal|documentation/.test(t)) {
    return 'approval';
  }

  if (/gas|electricity|electric|voltage|water|sewerage|utility|utilities/.test(t)) {
    return 'utilities';
  }

  return 'unknown';
}


function deterministicAnswer(intent, lead = {}) {
  const size = lead.property_size || '5 marla';
  const budget = lead.budget || 'your budget';
  const intentType = String(lead.intent || lead.customer_type || '').toLowerCase();

  if (intent === 'living') {
    return `For your ${size} house and ${budget} budget, I would compare Crystal and Diamond first, and keep Platinum as an option if the seller is negotiable or the property is clearly stronger. For living, I would prioritize the exact street, construction quality, road width, parking, development, possession and utility situation rather than choosing only by block name.`;
  }

  if (intent === 'resale') {
    return `For resale, I would not guarantee that one Park View block is universally best. I would compare buyer demand, accessibility, development level, exact street, house condition and the asking price versus competing properties. A well-priced, well-located house can be more liquid than a similar property in a supposedly premium block.`;
  }

  if (intent === 'investment') {
    return `For investment, I would compare entry price, possession, development, liquidity, seller discount, future demand and your intended holding period. I would not guarantee appreciation or ROI, and I would distinguish a short-term trade from a medium- or long-term investment.`;
  }

  if (intent === 'crystal') {
    return `Crystal is worth considering for your ${size} house and ${budget} budget, but I would not call it universally the best block. The exact street, construction, possession, road width, parking, development and asking price should determine whether a specific property is a good buy.`;
  }

  if (intent === 'diamond') {
    return `Diamond is worth comparing for your ${size} house and ${budget} budget. Current asking inventory can vary substantially within the block, so I would compare the specific house on street, construction, possession, location, utilities and seller negotiability rather than relying on the block name alone.`;
  }

  if (intent === 'platinum') {
    return `Platinum can be compared with other blocks, but I do not have a verified current price or availability record for a specific property. I would compare the exact property's location, construction, possession, utilities and documented asking price before judging it.`;
  }

  if (intent === 'price') {
    return `Current portal prices should be treated as asking prices, not confirmed sold prices. For a ${size} house around ${budget}, I would compare several fresh listings and adjust for exact street, construction, location, possession, utilities and seller motivation before judging whether the price is fair.`;
  }

  if (intent === 'utilities') {
    return `Utilities need to be verified at the specific block and property level. In particular, I would not assume Sui gas is available throughout Park View City. Electricity, water, sewerage, gas and possession should be confirmed before making a buying decision.`;
  }

  if (intent === 'availability') {
    return `Availability changes quickly and I would not invent or assume a live listing. If you want current options, we should check fresh inventory and then compare the actual properties against your ${size} and ${budget} requirements.`;
  }

  return null;
}

async function routeParkViewQuestion(message, lead = {}) {
  const text = String(message || '');
  const intent = detectIntent(text);

  const lower = text.toLowerCase();

  if (
    intent === 'approval' &&
    /\b(?:approved|approval|noc|lda|ruda|legal|documentation)\b/i.test(lower)
  ) {
    const block = ['jade', 'jasmine', 'sapphire', 'tulip', 'imperial', 'executive', 'crystal', 'diamond', 'platinum']
      .find((name) => new RegExp(`\\b${name}\\b`, 'i').test(lower));

    return {
      answer: block
        ? `Approval and NOC status for ${block.charAt(0).toUpperCase() + block.slice(1)} must be checked against the exact current project and authority record. Please specify whether you mean LDA, RUDA, transfer/building eligibility, or final NOC status.`
        : 'Approval and NOC status must be checked for the exact block, project and authority. Please tell me which block or project you mean and whether you are asking about LDA, RUDA, transfer/building eligibility, or final NOC status.',
      source: 'local_knowledge'
    };
  }

  const knowledgeAnswer = getParkViewKnowledgeAnswer(text, lead);
  if (knowledgeAnswer) {
    return { answer: knowledgeAnswer, source: 'local_knowledge' };
  }

  if (
    intent === 'approval' &&
    /\b(?:approved|approval|noc|lda|ruda|legal|documentation)\b/i.test(lower)
  ) {
    return {
      answer: 'Approval and NOC status must be checked for the exact block, project and authority. Please tell me which block or project you mean and whether you are asking about LDA, RUDA, transfer/building eligibility, or final NOC status. I need the exact current source before I can answer that confidently.',
      source: 'local_knowledge'
    };
  }

  if (
    /\b(?:price|prices|rate|rates|cost|costs|how much|current price)\b/i.test(lower) &&
    /\b(?:park view|parkview|jade|jasmine|sapphire|tulip|imperial|executive|crystal|diamond|platinum)\b/i.test(lower)
  ) {
    return {
      answer: 'Current price needs confirmation. I do not have a verified current figure for that exact block and product, and current Park View pricing is time-sensitive.',
      source: 'local_knowledge'
    };
  }

  const deterministic = deterministicAnswer(intent, lead);

  if (deterministic) {
    return { answer: deterministic, source: 'local_knowledge' };
  }

  if (
    intent === 'unknown' &&
    /park\s*view|parkview|block|approval|approved|noc|lda|ruda|price|availability|possession|development|transfer|title|house|plot|amenities|location|utility|gas|electricity|water/i.test(lower)
  ) {
    return {
      answer: 'I do not have a verified source for that specific Park View/property question. Please provide the exact project, block, property type or authority so the answer can remain properly scoped.',
      source: 'local_knowledge'
    };
  }

  const context = getParkViewContext(message, 1400);

  if (intent === 'location') {
    return {
      answer: 'I do not have a dated source record available for a current location or access claim. Please verify the project location and route against a current official map or authority record.',
      source: 'local_knowledge'
    };
  }

  if (intent === 'amenities') {
    const t = String(message || '').toLowerCase();

    if (/school|schools/.test(t)) {
      return {
        answer: "I do not have a dated source record for current school operations or availability. Please verify the exact facility and block from current project information.",
        source: 'local_knowledge'
      };
    }

    if (/mosque|mosques/.test(t)) {
      return {
        answer: "I do not have a dated source record for current mosque operations or exact location. Please verify the facility against current project information.",
        source: 'local_knowledge'
      };
    }

    if (/commercial/.test(t)) {
      return {
        answer: "I do not have a dated source record for current commercial availability. Please verify the exact area and operating status from current project information.",
        source: 'local_knowledge'
      };
    }

    if (/park|parks|green|recreational/.test(t)) {
      return {
        answer: "I do not have a dated source record for current park or recreational-facility status. Please verify the exact facility and operating status from current project information.",
        source: 'local_knowledge'
      };
    }

    return {
      answer: "I do not have dated source records for current amenities or operating status. Please specify the facility and block so the answer can remain properly scoped.",
      source: 'local_knowledge'
    };
  }

  if (intent === 'block_comparison') {
    const size = lead.property_size || 'your required size';
    const budget = lead.budget || 'your budget';

    return { answer: `For your ${size} house and ${budget} budget, I would compare Crystal, Diamond, Platinum and other relevant blocks based on property condition, exact location and asking price. If you want, I can narrow the comparison further based on whether you want a ready-to-live house, grey structure or plot.`, source: 'local_knowledge' };
  }

  if (/^(sure|ok|okay|yes|yeah|yep|alright|fine|great|thanks|thank you)/.test(String(message || '').trim().toLowerCase())) {
    const name = lead.name || 'there';
    const size = lead.property_size || 'your required size';
    const budget = lead.budget || 'your budget';

    return {
      answer: `Perfect, ${name}. I'll focus on ${size} Park View City house options that fit your ${budget} budget.`,
      source: 'local_knowledge'
    };
  }

  if (/\b(?:i want|looking for|need)\b/.test(String(message || '').toLowerCase()) &&
      /\b(?:house|home)\b/.test(String(message || '').toLowerCase()) &&
      /\b(?:marla|kanal)\b/.test(String(message || '').toLowerCase())) {
    const t = String(message || '').toLowerCase();
    const size = t.match(/\b(?:3\.5|5|7|10|15|20)\s*marla\b|\b(?:1|2)\s*kanal\b/);
    const sizeText = size ? size[0].replace(/\\s+/g, ' ').trim() : 'the requested size';

    return {
      answer: `Understood. You're looking for a ${sizeText} house in Park View City. If you share your budget and purchase timeline, I can narrow the suitable options and blocks for you.`,
      source: 'local_knowledge'
    };
  }

  if (intent === 'amenities') {
    const t = String(message || '').toLowerCase();

    if (/school|schools/.test(t)) {
      return {
        answer: "Park View City Lahore has The National School inside the society. If you want, I can also identify other nearby schools and compare them by location and access.",
        source: 'local_knowledge'
      };
    }

    if (/mosque|mosques/.test(t)) {
      return {
        answer: "Park View City Lahore has mosque facilities within the society. If you tell me the block, I can narrow the answer to the relevant nearby mosque and surrounding facilities.",
        source: 'local_knowledge'
      };
    }

    if (/commercial/.test(t)) {
      return {
        answer: "Park View City Lahore has dedicated commercial areas serving residents and businesses. If you tell me which block you're considering, I can narrow down the relevant commercial area.",
        source: 'local_knowledge'
      };
    }

    const context = getParkViewContext(message, 1400);
    if (context && context.trim()) {
      return { answer: context, source: 'local_knowledge' };
    }
  }

  const prompt = `
You are a professional Park View City Lahore real-estate consultant.

Answer the customer's question using ONLY the supplied knowledge.

Never invent:
- current prices
- live listings
- availability
- payment plans
- approvals or NOCs
- possession status
- legal or development status

If current information is required and cannot be verified, say that briefly.

Keep the WhatsApp reply to 1-2 short sentences.

CUSTOMER MEMORY:
${JSON.stringify(lead)}

RELEVANT PARK VIEW KNOWLEDGE:
${context}

CUSTOMER QUESTION:
${String(message)}

ANSWER:
`.trim();

  const answer = await askOllama(prompt, [], lead);
  return { answer, source: 'local_ai' };
}

module.exports = {
  detectIntent,
  routeParkViewQuestion
};
