const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestWaWebVersion,
  Browsers,
  DisconnectReason
} = require('@whiskeysockets/baileys');

const P = require('pino');
const { processMessage } = require('./conversation');
const { getMonitoredGroups } = require('./groups');
const { addGroupMessage } = require('./db');

const AUTH_DIR = './pairing-auth';

let connectionState = 'closed';
let startInProgress = false;

async function start() {
  if (startInProgress || connectionState === 'open') {
    return;
  }

  startInProgress = true;
  connectionState = 'connecting';

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
      connectionState = connection;

      if (connection === 'open') {
        startInProgress = false;
      }

      console.log('Connection:', connection, '| State:', connectionState);
    }

    if (lastDisconnect) {
      const code =
        lastDisconnect.error?.output?.statusCode;

      console.log(
        'Disconnect:',
        lastDisconnect.error?.message || 'unknown',
        code ? `(code ${code})` : ''
      );

      if (code === DisconnectReason.connectionReplaced) {
        startInProgress = false;
        connectionState = "closed";
        console.log("CONNECTION REPLACED: stopping auto-reconnect");
        return;
      }

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
    const phone = message.key.remoteJidAlt || message.key.remoteJid;

    if (!phone) return;

    const ownerId = sock.user?.id || '';
    const ownerNumber = ownerId.split(':')[0].split('@')[0];
    const ownerPhone = ownerNumber
      ? ownerNumber + '@s.whatsapp.net'
      : null;

    const normalizedPhone = phone.replace('@lid', '@s.whatsapp.net');

    if (message.key.fromMe && !ownerPhone) return;

    const textPreview =
      message.message?.conversation ||
      message.message?.extendedTextMessage?.text ||
      message.message?.imageMessage?.caption ||
      message.message?.videoMessage?.caption ||
      message.message?.documentMessage?.caption ||
      '';

    const ownerCommand =
      /^(list|add group|remove group|groups|search|leads|parkview|status)$/i.test(
        String(textPreview || '').trim()
      );

    if (message.key.fromMe && type !== 'notify') {
      return;
    }

    if (ownerCommand && normalizedPhone !== ownerPhone) {
      console.log('COMMAND BLOCKED: unauthorized number', phone);
      return;
    }

    if (normalizedPhone !== ownerPhone && !phone.endsWith('@g.us')) {
      console.log('CONTACT CHAT BLOCKED:', phone);
      return;
    }

    if (phone.endsWith('@g.us')) {
      const ownerId = sock.user?.id || '';
      const ownerNumber = ownerId.split(':')[0].split('@')[0];
      const ownerPhone = ownerNumber
        ? ownerNumber + '@s.whatsapp.net'
        : null;

      if (!ownerPhone) {
        console.log('GROUP SKIPPED: owner identity unavailable');
        return;
      }

      const monitoredGroups = getMonitoredGroups(ownerPhone);

      if (!monitoredGroups.length) {
        console.log('GROUP SKIPPED: no monitored groups configured');
        return;
      }

      let groupMetadata;

      try {
        groupMetadata = await sock.groupMetadata(phone);
      } catch (error) {
        console.error('GROUP METADATA ERROR:', error.message);
        return;
      }

      const monitoredGroup = monitoredGroups.find(
        group => group.group_name.toLowerCase() ===
          String(groupMetadata.subject || '').trim().toLowerCase()
      );

      if (!monitoredGroup) {
        console.log('GROUP SKIPPED:', groupMetadata.subject || phone);
        return;
      }

      console.log('MONITORED GROUP:', groupMetadata.subject);
      console.log('GROUP MESSAGE:', JSON.stringify(message, null, 2));

      const groupText =
        message.message?.conversation ||
        message.message?.extendedTextMessage?.text ||
        message.message?.imageMessage?.caption ||
        message.message?.videoMessage?.caption ||
        message.message?.documentMessage?.caption ||
        message.message?.ephemeralMessage?.message?.conversation ||
        message.message?.ephemeralMessage?.message?.extendedTextMessage?.text ||
        message.message?.viewOnceMessage?.message?.conversation ||
        message.message?.viewOnceMessage?.message?.extendedTextMessage?.text ||
        '';

      if (!groupText.trim()) {
        console.log('GROUP MESSAGE SKIPPED: no text');
        return;
      }

      const senderPhone =
        message.key.participantAlt ||
        message.key.participant ||
        null;

      addGroupMessage(
        ownerPhone,
        phone,
        groupMetadata.subject,
        senderPhone,
        message.pushName || null,
        groupText.trim()
      );

      console.log('GROUP MESSAGE SAVED:', groupMetadata.subject);
      return;
    }

    const text = message.message?.conversation || message.message?.extendedTextMessage?.text || message.message?.imageMessage?.caption || message.message?.videoMessage?.caption || message.message?.documentMessage?.caption || message.message?.ephemeralMessage?.message?.conversation || message.message?.ephemeralMessage?.message?.extendedTextMessage?.text || message.message?.viewOnceMessage?.message?.conversation || message.message?.viewOnceMessage?.message?.extendedTextMessage?.text;

    if (!text?.trim()) {
      console.log("MESSAGE TYPE:", Object.keys(message.message || {}));
      return;
    }

    console.log('\nUSER:', text);

    try {
      const chatPhone = phone.endsWith('@g.us') ? phone : normalizedPhone;
      const result = await processMessage(
        chatPhone,
        text.trim(),
        { isOwner: normalizedPhone === ownerPhone }
      );

      console.log('AGENT:', result.reply);

      if (result.action === 'open_connection') {
        console.log('OWNER COMMAND: OPEN CONNECTION');

        start().catch(error => {
          console.error('Open connection error:', error.message);
        });
      }

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
