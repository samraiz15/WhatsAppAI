process.env.WHATSAPPAI_DB_PATH = './agent.test.db';

const {
  getOrCreateLead,
  updateLeadInfo,
  addMessage
} = require('./db');

const phone = '+923001234567';

console.log('Initial lead:');
console.log(getOrCreateLead(phone));

addMessage(phone, 'incoming', 'Hi, I want a house');

updateLeadInfo(phone, {
  name: 'Ahmed',
  interest: 'House',
  budget: '2 crore',
  area: 'DHA Lahore',
  timeline: '3 months'
});

addMessage(
  phone,
  'outgoing',
  'Thanks Ahmed. I will help you find suitable properties.'
);

console.log('\nUpdated lead:');
console.log(getOrCreateLead(phone));

const { registerWhatsappMessage } = require('./db');
const first = registerWhatsappMessage({ messageId: 'test-duplicate-001', remoteJid: '+923001234567@s.whatsapp.net', messageText: 'duplicate test' });
const second = registerWhatsappMessage({ messageId: 'test-duplicate-001', remoteJid: '+923001234567@s.whatsapp.net', messageText: 'duplicate test' });
console.log('Duplicate test:', { firstInserted: first.inserted, secondInserted: second.inserted });
if (first.inserted !== true || second.inserted !== false) { process.exit(1); }
console.log('PASS: duplicate message ID ignored');
