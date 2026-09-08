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
