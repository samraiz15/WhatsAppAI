const { getOrCreateLead, updateLeadInfo, addMessage } = require('./db');
const { findFAQ } = require('./agent');
const { askOllama } = require('./ollama');

function detectInterest(message) {
  const text = message.toLowerCase();

  if (/\bhouse\b|\bhome\b/.test(text)) return 'House';
  if (/\bapartment\b|\bflat\b/.test(text)) return 'Apartment';
  if (/\bplot\b/.test(text)) return 'Plot';
  if (/\boffice\b/.test(text)) return 'Office';

  return null;
}

function detectBudget(message) {
  const match = message.match(
    /(?:budget\s*(?:is|of)?\s*)?([\d,.]+)\s*(crore|crores|corror|coror|cr|lakh|lakhs|lac)\b/i
  );

  return match ? `${match[1]} ${match[2]}` : null;
}

function parseBudgetNumeric(budget) {
  if (!budget) return null;

  const match = budget.match(
    /([\d,.]+)\s*(crore|crores|corror|coror|cr|lakh|lakhs|lac)\b/i
  );

  if (!match) return null;

  const amount = Number(match[1].replace(/,/g, ''));
  if (!Number.isFinite(amount)) return null;

  const unit = match[2].toLowerCase();

  if (['crore', 'crores', 'corror', 'coror', 'cr'].includes(unit)) {
    return Math.round(amount * 10000000);
  }

  return Math.round(amount * 100000);
}

function detectTimeline(message) {
  const text = message.trim().toLowerCase();

  if (/\b(as\s+soon\s+as\s+possible|soon\s+as\s+possible|asap|soon)\b/i.test(text)) {
    return 'As soon as possible';
  }

  const numbers = {
    one: '1',
    two: '2',
    three: '3',
    four: '4',
    five: '5',
    six: '6',
    seven: '7',
    eight: '8',
    nine: '9',
    ten: '10'
  };

  const match = text.match(/\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s*(day|days|week|weeks|month|months|year|years)\b/i);

  if (!match) return null;

  const value = numbers[match[1].toLowerCase()] || match[1];
  return `${value} ${match[2]}`;
}

function detectArea(message) {
  if (detectTimeline(message)) return null;

  const knownAreas = [
    'DHA Lahore',
    'Bahria Town',
    'Gulberg',
    'Johar Town',
    'Model Town',
    'Park View City',
    'ParkView City',
    'Park View'
  ];

  for (const area of knownAreas) {
    if (message.toLowerCase().includes(area.toLowerCase())) {
      return area;
    }
  }

  const match = message.match(
    /\b(?:in|at|near)\s+([a-zA-Z][a-zA-Z\s-]{2,40})$/i
  );

  return match ? match[1].trim() : null;
}

function detectName(message) {
  const match = message.match(
    /^(?:my name is|i am|i'm|this is)\s+([a-zA-Z][a-zA-Z\s'-]{1,40})$/i
  );

  return match ? match[1].trim() : null;
}

function detectPropertySize(message) {
  const match = String(message || '').match(
    /\b(3\.5|5|7|10|15|20)\s*marla\b|\b(1|2)\s*kanal\b/i
  );

  return match ? match[0].replace(/\s+/g, ' ').trim() : null;
}

async function processMessage(phone, message) {
  getOrCreateLead(phone);

  const info = {
    name: detectName(message),
    interest: detectInterest(message),
    budget: detectBudget(message),
    budget_numeric: parseBudgetNumeric(detectBudget(message)),
    area: detectArea(message),
    timeline: detectTimeline(message),
    property_size: detectPropertySize(message),
    notes: null
  };

  updateLeadInfo(phone, info);

  addMessage(phone, 'incoming', message);

  const faq = findFAQ(message);

  if (faq) {
    addMessage(phone, 'outgoing', faq);
    return {
      reply: faq,
      lead: getOrCreateLead(phone)
    };
  }

  const lead = getOrCreateLead(phone);

  if (lead.name && lead.interest && lead.budget && lead.area && lead.timeline) {
    const reply =
      `Perfect, ${lead.name}. I've noted your ${lead.property_size ? lead.property_size + ' ' : ''}` +
      `${lead.interest} requirement in ${lead.area} with a ${lead.budget} budget and ` +
      `${lead.timeline} timeline.`;

    addMessage(phone, 'outgoing', reply);

    return {
      reply,
      lead
    };
  }

  const questions = {
    interest: 'What type of property are you looking for?',
    budget: 'What is your approximate budget?',
    area: 'Which area are you interested in?',
    timeline: 'When are you planning to buy or invest?',
    name: 'May I know your name?'
  };

  for (const field of ['interest', 'budget', 'area', 'timeline', 'name']) {
    if (!lead[field]) {
      const reply = questions[field];

      addMessage(phone, 'outgoing', reply);

      return {
        reply,
        lead
      };
    }
  }

  let reply;

  try {
    reply = await askOllama(
      `You are the customer assistant for ${require('./agent').config.business.name}.
Tone: ${require('./agent').config.business.tone}.

Customer message:
${message}

Customer lead information:
${JSON.stringify(lead)}

Reply naturally in 1-2 short sentences. Do not invent property listings, prices,
availability, locations, or business policies.`
    );
  } catch {
    reply =
      `Thanks ${lead.name}. I have your requirements and we'll help you with the next steps.`;
  }

  addMessage(phone, 'outgoing', reply);

  return {
    reply,
    lead
  };
}

module.exports = {
  processMessage,
  detectArea,
  detectBudget,
  detectTimeline,
  detectPropertySize,
  parseBudgetNumeric
};
