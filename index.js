const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestWaWebVersion,
  Browsers
} = require('@whiskeysockets/baileys');

const P = require('pino');
const QRCode = require('qrcode');
const fs = require('fs');

async function start() {
  const { version } = await fetchLatestWaWebVersion();
  console.log('Using WA Web version:', version.join('.'));

  const { state, saveCreds } =
    await useMultiFileAuthState('./auth');

  const sock = makeWASocket({
    auth: state,
    version,
    logger: P({ level: 'silent' }),
    browser: Browsers.ubuntu('WhatsApp AI Agent')
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async ({ connection, qr, lastDisconnect }) => {
    if (qr) {
      await QRCode.toFile('./whatsapp-qr.png', qr, {
        width: 800,
        margin: 2
      });

      console.log('\nQR IMAGE CREATED:');
      console.log('D:\\Projects\\WhatsAppAI\\agent\\whatsapp-qr.png');
      console.log('\nOpen that image and scan it with WhatsApp.');
    }

    if (connection) {
      console.log('Connection:', connection);
    }

    if (lastDisconnect) {
      console.log(
        'Disconnect:',
        lastDisconnect.error?.message || 'unknown'
      );
    }
  });
}

start().catch(console.error);
