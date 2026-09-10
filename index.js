const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestWaWebVersion,
  Browsers,
  DisconnectReason
} = require('@whiskeysockets/baileys');

const P = require('pino');
const { processMessage } = require('./conversation');

const AUTH_DIR = './pairing-auth';

async function start() {
  const { version } = await fetchLatestWaWebVersion();

  console.log('Using WA Web version:', version.join('.'));

  const { state, saveCreds } =
    await useMultiFileAuthState(AUTH_DIR);

  const sock = makeWASocket({
    auth: state,
    version,
    logger: P({ level: 'silent' }),
    browser: Browsers.ubuntu('WhatsApp AI Agent')
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async ({
    connection,
    qr,
    lastDisconnect
  }) => {
    if (qr) {
      const qrcode = require('qrcode-terminal');

      console.log('\nSCAN THIS QR WITH WHATSAPP:\n');
      qrcode.generate(qr, { small: true });
    }

    if (connection) {
      console.log('Connection:', connection);
    }

    if (lastDisconnect) {
      const code =
        lastDisconnect.error?.output?.statusCode;

      console.log(
        'Disconnect:',
        lastDisconnect.error?.message || 'unknown',
        code ? `(code ${code})` : ''
      );

      if (code === DisconnectReason.loggedOut) {
        console.log('Logged out. Delete pairing-auth and pair again.');
        return;
      }

      console.log('Connection ended. Restarting in 3 seconds...');

      setTimeout(() => {
        start().catch(error => {
          console.error('Restart error:', error.message);
        });
      }, 3000);
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    console.log('MESSAGE EVENT:', type, messages.length);
    const message = messages[0];
    console.log("RAW MESSAGE:", JSON.stringify(message, null, 2));

    if (!message?.message) return;
    if (message.key.fromMe) return;

    const phone = message.key.remoteJid;

    if (!phone || phone.endsWith('@g.us')) return;

    const text = message.message?.conversation || message.message?.extendedTextMessage?.text || message.message?.imageMessage?.caption || message.message?.videoMessage?.caption || message.message?.documentMessage?.caption || message.message?.ephemeralMessage?.message?.conversation || message.message?.ephemeralMessage?.message?.extendedTextMessage?.text || message.message?.viewOnceMessage?.message?.conversation || message.message?.viewOnceMessage?.message?.extendedTextMessage?.text;

    if (!text?.trim()) {
      console.log("MESSAGE TYPE:", Object.keys(message.message || {}));
      return;
    }

    console.log('\nUSER:', text);

    try {
      const result = await processMessage(phone, text.trim());

      console.log('AGENT:', result.reply);

      if (!result.reply) {
        console.log('NO REPLY NEEDED');
        return;
      }

      await sock.sendMessage(phone, {
        text: result.reply
      });

      console.log('SENT');
    } catch (error) {
      console.error('Message error:', error.message);

      await sock.sendMessage(phone, {
        text: 'Sorry, something went wrong. Please try again.'
      });
    }
  });
}

start().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
