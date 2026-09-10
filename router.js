const { askOllama } = require('./ollama');
const { getParkViewContext } = require('./parkview_knowledge');

function detectIntent(message) {
  const t = String(message || '').toLowerCase();

  if (/available|availability|vacant|inventory|listing|listings/.test(t)) {
    return 'availability';
  }

  if (/price|prices|cost|rate|rates|how much/.test(t)) {
    return 'price';
  }

  if (/payment|installment|installments|payment plan|plan/.test(t)) {
    return 'payment_plan';
  }

  if (/best block|which block|which .*block|block.*better|better.*block/.test(t)) {
    return 'block_comparison';
  }

  if (/location|located|where is|where's|access|road|motorway|ring road/.test(t)) {
    return 'location';
  }

  if (/park view city/.test(t) && !/school|schools|mosque|mosques|commercial|amenities|\bpark\b|\bparks\b/.test(t.replace(/park view city/g, ''))) {
    return 'unknown';
  }

  if (/school|schools|mosque|mosques|commercial|amenities|(?<!park )parks?\b/.test(t)) {
    return 'amenities';
  }

  return 'unknown';
}

function deterministicAnswer(intent) {
  if (intent === 'availability') {
    return "I don't have live Park View City inventory connected yet, so I don't want to give you inaccurate availability.";
  }

  if (intent === 'price') {
    return "I don't have a live Park View City price feed connected yet, so I don't want to quote an outdated price.";
  }

  if (intent === 'payment_plan') {
    return "I don't have a verified current Park View City payment plan available yet, so I don't want to give you outdated figures.";
  }

  return null;
}

async function routeParkViewQuestion(message, lead = {}) {
  const intent = detectIntent(message);

  const deterministic = deterministicAnswer(intent);

  if (deterministic) {
    return deterministic;
  }

  const context = getParkViewContext(message, 1400);

  if (intent === 'location') {
    return "Park View City Lahore is located on Main Multan Road, approximately 3 km from Thokar Niaz Baig. It also has access toward Canal Road, M-2 Motorway and Lahore Ring Road.";
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

  if (/\\b(?:i want|looking for|need)\\b/.test(String(message || '').toLowerCase()) &&
      /\\b(?:house|home)\\b/.test(String(message || '').toLowerCase()) &&
      /\\b(?:marla|kanal)\\b/.test(String(message || '').toLowerCase())) {
    const t = String(message || '').toLowerCase();
    const size = t.match(/\\b(?:3\\.5|5|7|10|15|20)\\s*marla\\b|\\b(?:1|2)\\s*kanal\\b/);
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
