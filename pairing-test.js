const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
} = require('@whiskeysockets/baileys');

const qrcode = require('qrcode-terminal');
const { askOllama } = require('./ollama');
const {
  getHistory,
  addMessage,
  getMemory,
  updateMemory,
} = require('./memory');

async function start() {
  const { state, saveCreds } =
    await useMultiFileAuthState('./pairing-auth');

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    browser: ['Ubuntu', 'WhatsApp AI Agent', '22.04.4'],
    markOnlineOnConnect: false,
    syncFullHistory: false,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.update', async (updates) => {
    for (const update of updates) {
      console.log('MESSAGE UPDATE KEY:', update.key);
      console.log('MESSAGE UPDATE STATUS:', update.update?.status);
      console.log(
        'MESSAGE UPDATE:',
        JSON.stringify(update.update, null, 2)
      );
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    console.log('MESSAGE EVENT:', type);

    for (const msg of messages) {
      if (msg.key.fromMe) continue;

      const text =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        '';

      if (!text.trim()) continue;

      console.log('KEY:', JSON.stringify(msg.key, null, 2));
      console.log('FROM:', msg.key.remoteJid);
      console.log('ALT:', msg.key.remoteJidAlt);
      console.log('DEST:', msg.key.remoteJidAlt || msg.key.remoteJid);
      console.log('TEXT:', text);

      const jid = msg.key.remoteJidAlt || msg.key.remoteJid;
      const cleanText = text.trim();

      /*
       * =========================
       * CUSTOMER NAME MEMORY
       * =========================
       */

      const nameMatch = cleanText.match(
        /^my name is\s+([a-zA-Z][a-zA-Z '-]{1,40})$/i
      );

      if (nameMatch) {
        const name = nameMatch[1].trim();

        updateMemory(jid, { name });

        const reply = 'Nice to meet you, ' + name + '.';

        addMessage(jid, 'user', cleanText);
        addMessage(jid, 'assistant', reply);

        await sock.sendMessage(jid, { text: reply });

        console.log('MEMORY SAVED:', JSON.stringify(getMemory(jid)));
        console.log('REPLY SENT TO:', jid);

        continue;
      }

      /*
       * =========================
       * CUSTOMER PROFESSION MEMORY
       * =========================
       */

      const professionMatch = cleanText.match(
        /^(?:i am|i'm|i work as|i am a|i'm a)\s+(realtor|real estate agent|broker|developer|investor|businessman|businesswoman|doctor|engineer|lawyer|teacher|architect)$/i
      );

      if (professionMatch) {
        const profession = professionMatch[1].trim();

        updateMemory(jid, { profession });

        const reply =
          'Got it. I will remember that you are a ' +
          profession +
          '.';

        addMessage(jid, 'user', cleanText);
        addMessage(jid, 'assistant', reply);

        await sock.sendMessage(jid, { text: reply });

        console.log('PROFESSION SAVED:', profession);
        console.log('MEMORY:', JSON.stringify(getMemory(jid)));

        continue;
      }

      /*
       * =========================
       * CUSTOMER LOCATION MEMORY
       * =========================
       */

      const locationMatch = cleanText.match(
        /^i live in\s+([a-zA-Z][a-zA-Z\s-]{1,40})$/i
      );

      if (locationMatch) {
        const location = locationMatch[1].trim();

        updateMemory(jid, { location });

        const reply =
          'Got it. I will remember that you live in ' +
          location +
          '.';

        addMessage(jid, 'user', cleanText);
        addMessage(jid, 'assistant', reply);

        await sock.sendMessage(jid, { text: reply });

        console.log('LOCATION SAVED:', location);
        console.log('MEMORY:', JSON.stringify(getMemory(jid)));

        continue;
      }

      /*
       * =========================
       * ASSISTANT IDENTITY
       * =========================
       */

      if (
        /^what(?:'s| is)\s+your\s+name\??$/i.test(cleanText)
      ) {
        const reply =
          'I am the Prime Estate Assistant.';

        addMessage(jid, 'user', cleanText);
        addMessage(jid, 'assistant', reply);

        await sock.sendMessage(jid, { text: reply });

        console.log('ASSISTANT IDENTITY ANSWER');

        continue;
      }

      /*
       * =========================
       * CUSTOMER NAME QUESTION
       * =========================
       */

      if (
        /^what(?:'s| is)\s+my\s+name\??$/i.test(cleanText)
      ) {
        const memory = getMemory(jid);

        const reply = memory.name
          ? 'Your name is ' + memory.name + '.'
          : "I don't know your name yet.";

        addMessage(jid, 'user', cleanText);
        addMessage(jid, 'assistant', reply);

        await sock.sendMessage(jid, { text: reply });

        console.log('NAME ANSWER:', memory.name || 'unknown');

        continue;
      }

      /*
       * =========================
       * CUSTOMER PROFESSION QUESTION
       * =========================
       */

      if (
        /^(?:what\s+do\s+i\s+do\s+for\s+(?:a\s+)?living|what\s+is\s+my\s+profession|what's\s+my\s+profession)\??$/i.test(
          cleanText
        )
      ) {
        const memory = getMemory(jid);

        const reply = memory.profession
          ? 'You are a ' + memory.profession + '.'
          : "I don't know your profession yet.";

        addMessage(jid, 'user', cleanText);
        addMessage(jid, 'assistant', reply);

        await sock.sendMessage(jid, { text: reply });

        console.log(
          'PROFESSION ANSWER:',
          memory.profession || 'unknown'
        );

        continue;
      }

      /*
       * =========================
       * CUSTOMER LOCATION QUESTION
       * =========================
       */

      if (
        /^(?:where\s+do\s+i\s+live|what\s+is\s+my\s+location)\??$/i.test(
          cleanText
        )
      ) {
        const memory = getMemory(jid);

        const reply = memory.location
          ? 'You live in ' + memory.location + '.'
          : "I don't know where you live yet.";

        addMessage(jid, 'user', cleanText);
        addMessage(jid, 'assistant', reply);

        await sock.sendMessage(jid, { text: reply });

        console.log(
          'LOCATION ANSWER:',
          memory.location || 'unknown'
        );

        continue;
      }

      /*
       * =========================
       * ASSISTANT ROLE
       * =========================
       */

      if (
        /^what\s+(?:do|are)\s+(?:you|u)\s+(?:do|doing)(?:\s+for\s+(?:a\s+)?living)?\??$/i.test(
          cleanText
        )
      ) {
        const reply =
          'I am the Prime Estate Assistant. I help clients with property searches, consultations, and real estate decisions.';

        addMessage(jid, 'user', cleanText);
        addMessage(jid, 'assistant', reply);

        await sock.sendMessage(jid, { text: reply });

        console.log('ASSISTANT ROLE ANSWER');

        continue;
      }

      /*
       * =========================
       * OLLAMA
       * =========================
       */

      try {
        const history = getHistory(jid);
        const memory = getMemory(jid);

        console.log(
          'OLLAMA HISTORY:',
          JSON.stringify(history)
        );

        console.log(
          'CUSTOMER MEMORY:',
          JSON.stringify(memory)
        );

        console.log(
          'OLLAMA PROMPT INPUT:',
          cleanText
        );

        const reply = await askOllama(
          cleanText,
          history,
          memory
        );

        addMessage(jid, 'user', cleanText);
        addMessage(jid, 'assistant', reply);

        await sock.sendMessage(jid, {
          text: reply,
        });

        console.log('REPLY:', reply);
        console.log('REPLY SENT TO:', jid);
      } catch (err) {
        console.log('REPLY ERROR:', err);
      }
    }
  });

  sock.ev.on(
    'connection.update',
    async ({
      connection,
      qr,
      lastDisconnect,
    }) => {
      console.log('CONNECTION:', connection);

      if (qr) {
        qrcode.generate(qr, { small: true });
      }

      if (lastDisconnect) {
        console.log(
          'DISCONNECT:',
          lastDisconnect.error?.message ||
            lastDisconnect.error
        );
      }

      if (connection === 'open') {
        console.log('================================');
        console.log(
          'WHATSAPP CONNECTED SUCCESSFULLY'
        );
        console.log('JID:', sock.user?.id);
        console.log('NAME:', sock.user?.name);
        console.log('================================');
      }

      if (connection === 'close') {
        const statusCode =
          lastDisconnect?.error?.output?.statusCode;

        console.log('STATUS CODE:', statusCode);

        if (
          statusCode === DisconnectReason.loggedOut
        ) {
          console.log(
            'Logged out. Delete pairing-auth and pair again.'
          );
          return;
        }

        console.log(
          'Connection closed. Restart the agent to reconnect.'
        );
      }
    }
  );
}

start().catch(console.error);
