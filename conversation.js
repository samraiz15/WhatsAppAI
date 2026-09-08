const { getOrCreateLead, updateLeadInfo, addMessage } = require('./db');
const { findFAQ } = require('./agent');

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
    /(?:budget\s*(?:is|of)?\s*)?([\d,.]+)\s*(crore|cr|lakh|lac)\b/i
  );

  return match ? `${match[1]} ${match[2]}` : null;
}

function detectTimeline(message) {
  const match = message.match(
    /\b(\d+)\s*(day|days|week|weeks|month|months|year|years)\b/i
  );

  return match ? `${match[1]} ${match[2]}` : null;
}

function detectArea(message) {
  if (detectTimeline(message)) return null;

  const text = message.trim();

  const explicit = text.match(
    /\b(?:in|at|near)\s+([a-zA-Z][a-zA-Z\s-]{2,40})$/i
  );

  if (explicit) return explicit[1].trim();

  const knownAreas = [
    'DHA Lahore',
    'Bahria Town',
    'Gulberg',
    'Johar Town',
    'Model Town'
  ];

  for (const area of knownAreas) {
    if (text.toLowerCase().includes(area.toLowerCase())) {
      return area;
    }
  }

  return null;
}

function detectName(message) {
  const match = message.match(
    /^(?:my name is|i am|i'm|this is)\s+([a-zA-Z][a-zA-Z\s'-]{1,40})$/i
  );

  return match ? match[1].trim() : null;
}

function processMessage(phone, message) {
  getOrCreateLead(phone);

  const info = {
    name: detectName(message),
    interest: detectInterest(message),
    budget: detectBudget(message),
    area: detectArea(message),
    timeline: detectTimeline(message),
    notes: null
  };

  const lead = updateLeadInfo(phone, info);

  addMessage(phone, 'incoming', message);

  const faq = findFAQ(message);

  if (faq) {
    addMessage(phone, 'outgoing', faq);
    return { reply: faq, lead };
  }

  const updated = getOrCreateLead(phone);

  const questions = {
    interest: 'What type of property are you looking for?',
    budget: 'What is your approximate budget?',
    area: 'Which area are you interested in?',
    timeline: 'When are you planning to buy or invest?',
    name: 'May I know your name?'
  };

  for (const field of ['interest', 'budget', 'area', 'timeline', 'name']) {
    if (!updated[field]) {
      const reply = questions[field];
      addMessage(phone, 'outgoing', reply);
      return { reply, lead: updated };
    }
  }

  const reply =
    `Thanks ${updated.name}. I have your requirements: ` +
    `${updated.interest}, ${updated.budget}, ${updated.area}, ` +
    `timeline ${updated.timeline}. We'll help you with the next steps.`;

  addMessage(phone, 'outgoing', reply);

  return { reply, lead: updated };
}

module.exports = { processMessage };
