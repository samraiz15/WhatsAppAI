const { generateReply, detectLeadInfo } = require('./agent');

const messages = [
  'Hi, what properties do you have?',
  'I need an apartment',
  'My budget is 2 crore',
  'My phone is +923001234567'
];

for (const message of messages) {
  console.log('\nUSER:', message);
  console.log('AGENT:', generateReply(message));
  console.log('LEAD:', detectLeadInfo(message));
}
