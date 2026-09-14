const { askOllama } = require('./ollama');
const { getParkViewContext } = require('./parkview_knowledge');

function detectIntent(message) {
  const t = String(message || '').toLowerCase().trim();

  if (
    /\b(i want|i need|looking for|searching for|find me|show me|interested in)\b/.test(t) &&
    /\b(house|home|villa|plot|apartment|flat|property)\b/.test(t)
  ) {
    return 'property_search';
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
    return `Platinum is worth considering if the specific property justifies the price, but some current 5-marla asking stock is above a PKR 2 crore target. I would first check whether the seller is negotiable and whether the property's location, construction and other advantages justify stretching the budget.`;
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
  const intent = detectIntent(message);

  const deterministic = deterministicAnswer(intent, lead);

  if (deterministic) {
    return deterministic;
  }

  const context = getParkViewContext(message, 1400);

  if (intent === 'location') {
    return "Park View City Lahore is located on Main Multan Road, approximately 3 km from Thokar Niaz Baig. It also has access toward Canal Road, M-2 Motorway and Lahore Ring Road.";
  }

  if (intent === 'amenities') {
    const t = String(message || '').toLowerCase();

    if (/school|schools/.test(t)) {
      return "Park View City Lahore has school/educational facilities referenced in project material, including an international school. Exact operating status and current availability should be verified.";
    }

    if (/mosque|mosques/.test(t)) {
      return "Park View City Lahore has mosque facilities referenced in project material, including the Grand Jamia Mosque. Exact operating status and location should be verified for the current period.";
    }

    if (/commercial/.test(t)) {
      return "Park View City Lahore has commercial areas referenced in project material, including commercial markaz and retail facilities. Exact current availability should be verified.";
    }

    if (/park|parks|green|recreational/.test(t)) {
      return "Yes. Park View City Lahore references parks and green areas, including Central Park, along with jogging/cycling facilities in project material. Exact availability and operating status should be verified.";
    }

    return "Park View City Lahore commonly references parks and green areas, mosques, commercial areas, schools, medical facilities, recreational areas, utilities and security facilities. Exact availability and operating status should be verified for the current period.";
  }

  if (intent === 'block_comparison') {
    const size = lead.property_size || 'your required size';
    const budget = lead.budget || 'your budget';

    return `For your ${size} house and ${budget} budget, I would compare Crystal, Diamond, Platinum and other relevant blocks based on property condition, exact location and asking price. If you want, I can narrow the comparison further based on whether you want a ready-to-live house, grey structure or plot.`;
  }

  if (/^(sure|ok|okay|yes|yeah|yep|alright|fine|great|thanks|thank you)/.test(String(message || '').trim().toLowerCase())) {
    const name = lead.name || 'there';
    const size = lead.property_size || 'your required size';
    const budget = lead.budget || 'your budget';

    return `Perfect, ${name}. I'll focus on ${size} Park View City house options that fit your ${budget} budget.`;
  }

  if (/\b(?:i want|looking for|need)\b/.test(String(message || '').toLowerCase()) &&
      /\b(?:house|home)\b/.test(String(message || '').toLowerCase()) &&
      /\b(?:marla|kanal)\b/.test(String(message || '').toLowerCase())) {
    const t = String(message || '').toLowerCase();
    const size = t.match(/\b(?:3\.5|5|7|10|15|20)\s*marla\b|\b(?:1|2)\s*kanal\b/);
    const sizeText = size ? size[0].replace(/\\s+/g, ' ').trim() : 'the requested size';

    return `Understood. You're looking for a ${sizeText} house in Park View City. If you share your budget and purchase timeline, I can narrow the suitable options and blocks for you.`;
  }

  if (intent === 'amenities') {
    const t = String(message || '').toLowerCase();

    if (/school|schools/.test(t)) {
      return "Park View City Lahore has The National School inside the society. If you want, I can also identify other nearby schools and compare them by location and access.";
    }

    if (/mosque|mosques/.test(t)) {
      return "Park View City Lahore has mosque facilities within the society. If you tell me the block, I can narrow the answer to the relevant nearby mosque and surrounding facilities.";
    }

    if (/commercial/.test(t)) {
      return "Park View City Lahore has dedicated commercial areas serving residents and businesses. If you tell me which block you're considering, I can narrow down the relevant commercial area.";
    }

    const context = getParkViewContext(message, 1400);
    if (context && context.trim()) {
      return context;
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

  return await askOllama(prompt, [], lead);
}

module.exports = {
  detectIntent,
  routeParkViewQuestion
};
