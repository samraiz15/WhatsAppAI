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
  getParkViewContext,
  KNOWLEDGE_TEXT
};
