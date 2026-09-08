const fs = require('fs');

const config = JSON.parse(
  fs.readFileSync('./business-config.json', 'utf8')
);

function findFAQ(message) {
  const text = message.toLowerCase();

  for (const faq of config.faqs) {
    const words = faq.question
      .toLowerCase()
      .replace(/[?!.]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3);

    const matches = words.filter(word => text.includes(word));

    if (matches.length >= Math.max(1, Math.ceil(words.length * 0.5))) {
      return faq.answer;
    }
  }

  return null;
}

function detectLeadInfo(message) {
  const text = message.trim();
  const lead = {};

  const phone = text.match(/(?:\+?\d[\d\s-]{7,}\d)/);
  if (phone) lead.phone = phone[0].replace(/[^\d+]/g, '');

  const budget = text.match(
    /(?:budget|around|under|up to)\s*(?:rs\.?|pkr)?\s*([\d,.]+)\s*(crore|cr|lakh|lac)?/i
  );

  if (budget) {
    lead.budget = `${budget[1]}${budget[2] ? ' ' + budget[2] : ''}`;
  }

  return lead;
}

function generateReply(message) {
  const faq = findFAQ(message);

  if (faq) {
    return faq;
  }

  const lead = detectLeadInfo(message);

  if (lead.phone || lead.budget) {
    const missing = config.leadFields.filter(field => !lead[field]);

    if (missing.includes('name')) {
      return 'Thanks. May I know your name?';
    }

    if (missing.includes('area')) {
      return 'Great. Which area are you interested in?';
    }

    if (missing.includes('timeline')) {
      return 'And when are you looking to buy or invest?';
    }
  }

  return config.fallback;
}

module.exports = {
  config,
  findFAQ,
  detectLeadInfo,
  generateReply
};
