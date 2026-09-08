const fs = require('fs');

for (const file of ['agent.db', 'agent.db-shm', 'agent.db-wal']) {
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

const { processMessage } = require('./conversation');

const phone = '+923009999999';

async function main() {
  const messages = [
    'Hi, I need a house',
    'My budget is 2 crore',
    'DHA Lahore',
    'I want to buy in 3 months',
    'My name is Ahmed'
  ];

  for (const message of messages) {
    const result = await processMessage(phone, message);

    console.log('\nUSER:', message);
    console.log('AGENT:', result.reply);
    console.log('LEAD:', result.lead);
  }
}

main().catch(console.error);
