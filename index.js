const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestWaWebVersion,
  Browsers,
  DisconnectReason
} = require('@whiskeysockets/baileys');

const P = require('pino');
const { processMessage } = require('./conversation');
const {
  getMonitoredGroups,
  setMonitoredGroupJid
} = require('./groups');
const { addGroupMessage, registerWhatsappMessage, claimWhatsappMessage, completeWhatsappMessage, failWhatsappMessage } = require('./db');
const { extractMessageText, safeLogValue } = require('./message-utils');
const { classify, compactLog } = require('./ingestPolicy');

const AUTH_DIR = './pairing-auth';

const CONNECTION_STATES = Object.freeze({
  STARTING: 'STARTING',
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED',
  DISCONNECTED: 'DISCONNECTED',
  RECONNECTING: 'RECONNECTING',
  LOGGED_OUT: 'LOGGED_OUT'
});

let connectionState = CONNECTION_STATES.DISCONNECTED;
let startInProgress = false;
let reconnectTimer = null;

async function start() {
  if (startInProgress || connectionState === CONNECTION_STATES.CONNECTED) {
    return;
  }

  startInProgress = true;

  if (connectionState !== CONNECTION_STATES.RECONNECTING) {
    connectionState = CONNECTION_STATES.STARTING;
  }

  console.log('Connection state:', connectionState);

  let version;
  let state;
  let saveCreds;

  try {
    ({ version } = await fetchLatestWaWebVersion());

    console.log('Using WA Web version:', version.join('.'));

    ({ state, saveCreds } =
      await useMultiFileAuthState(AUTH_DIR));
  } catch (error) {
    startInProgress = false;
    connectionState = CONNECTION_STATES.DISCONNECTED;
    console.error('START ERROR:', error.message);
    throw error;
  }

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

    if (connection === 'open') {
      connectionState = CONNECTION_STATES.CONNECTED;
      startInProgress = false;

      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }

      console.log('Connection:', connection, '| State:', connectionState);
    }

    if (connection === 'connecting') {
      connectionState = CONNECTION_STATES.CONNECTING;
      console.log('Connection:', connection, '| State:', connectionState);
    }

    if (connection === 'close') {
      connectionState = CONNECTION_STATES.DISCONNECTED;
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
        connectionState = CONNECTION_STATES.DISCONNECTED;
        console.log('CONNECTION REPLACED: stopping auto-reconnect');
        return;
      }

      if (code === DisconnectReason.loggedOut) {
        startInProgress = false;
        connectionState = CONNECTION_STATES.LOGGED_OUT;
        console.log('Logged out. Delete pairing-auth and pair again.');
        return;
      }

      startInProgress = false;
      connectionState = CONNECTION_STATES.RECONNECTING;

      if (reconnectTimer) {
        console.log('RECONNECT ALREADY SCHEDULED');
        return;
      }

      console.log('Connection ended. Restarting in 3 seconds...');

      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;

        start().catch(error => {
          startInProgress = false;
          connectionState = CONNECTION_STATES.DISCONNECTED;
          console.error('Restart error:', error.message);
        });
      }, 3000);
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    console.log(
      'MESSAGE EVENT:',
      type,
      messages?.length || 0
    );

    const nowSec = Math.floor(Date.now() / 1000);

    for (const message of messages || []) {
      console.log('INGEST:', compactLog(type, message, nowSec));

      if (!message) {
        console.log('MESSAGE SKIPPED: empty message');
        continue;
      }

      const messageId = message.key?.id;

      if (!messageId) {
        console.log('MESSAGE SKIPPED: no message id');
        continue;
      }

      const policy = classify(
        {
          ts: message.messageTimestamp,
          fromMe: message.key?.fromMe === true,
          isGroup: String(
            message.key?.remoteJid ||
            message.key?.remoteJidAlt ||
            ''
          ).endsWith('@g.us'),
          upsertType: type
        },
        nowSec
      );

      console.log('INGEST POLICY:', messageId, policy);

      if (!policy.ingest) {
        console.log(
          'MESSAGE INGEST SKIPPED:',
          messageId,
          policy.reason
        );
        continue;
      }

      console.log(
        'RAW MESSAGE:',
        safeLogValue(message)
      );

      if (!message?.message) {
        console.log('MESSAGE SKIPPED: no message payload');
        continue;
      }

    const messageType =
      Object.keys(message.message || {})[0] || null;

    const messageTextForLog =
      message.message?.conversation ||
      message.message?.extendedTextMessage?.text ||
      message.message?.imageMessage?.caption ||
      message.message?.videoMessage?.caption ||
      message.message?.documentMessage?.caption ||
      '';

    try {
      const registration = registerWhatsappMessage({
        messageId,
        remoteJid: message.key?.remoteJid || null,
        participantJid:
          message.key?.participantAlt ||
          message.key?.participant ||
          null,
        fromMe: message.key?.fromMe === true,
        messageType,
        messageText: messageTextForLog || null,
        messageTimestamp: Number(message.messageTimestamp || 0) || null
      });

      if (!registration.inserted) {
        console.log('MESSAGE DUPLICATE SKIPPED:', messageId);
        continue;
      }

      if (!claimWhatsappMessage(messageId)) {
        console.log('MESSAGE CLAIM FAILED:', messageId);
        continue;
      }

    } catch (error) {
      console.error('MESSAGE IDEMPOTENCY ERROR:', error.message);
      continue;
    }

    const isGroupMessage = String(
      message.key?.remoteJid ||
      message.key?.remoteJidAlt ||
      ''
    ).endsWith('@g.us');

    if (!policy.reply && !isGroupMessage) {
      console.log(
        'DM HISTORY INGESTED WITHOUT REPLY:',
        messageId,
        policy.reason
      );
      completeWhatsappMessage(messageId);
      continue;
    }

    const phone = message.key.remoteJidAlt || message.key.remoteJid;

    if (!phone) {
      completeWhatsappMessage(messageId);
      continue;
    }

    const ownerId = sock.user?.id || '';
    const ownerNumber = ownerId.split(':')[0].split('@')[0];
    const ownerPhone = ownerNumber
      ? ownerNumber + '@s.whatsapp.net'
      : null;

    const normalizedPhone = phone.replace('@lid', '@s.whatsapp.net');

    if (message.key.fromMe && !ownerPhone) {
      completeWhatsappMessage(messageId);
      continue;
    }

    const textPreview = extractMessageText(message.message);

    const ownerCommand =
      /^(list|add group|remove group|groups|search|leads|parkview|status)$/i.test(
        String(textPreview || '').trim()
      );

    if (ownerCommand && normalizedPhone !== ownerPhone) {
      console.log('COMMAND BLOCKED: unauthorized number', phone);
      completeWhatsappMessage(messageId);
      continue;
    }

    if (normalizedPhone !== ownerPhone && !phone.endsWith('@g.us')) {
      console.log('CONTACT CHAT BLOCKED:', phone);
      completeWhatsappMessage(messageId);
      continue;
    }

    if (phone.endsWith('@g.us')) {
      const ownerId = sock.user?.id || '';
      const ownerNumber = ownerId.split(':')[0].split('@')[0];
      const ownerPhone = ownerNumber
        ? ownerNumber + '@s.whatsapp.net'
        : null;

      if (!ownerPhone) {
        console.log('GROUP SKIPPED: owner identity unavailable');
        completeWhatsappMessage(messageId);
        continue;
      }

      const monitoredGroups = getMonitoredGroups(ownerPhone);

      console.log('GROUP OWNER DEBUG:', {
        ownerPhone,
        remoteJid: phone,
        monitoredGroups
      });

      if (!monitoredGroups.length) {
        console.log('GROUP SKIPPED: no monitored groups configured');
        completeWhatsappMessage(messageId);
        continue;
      }

      let groupMetadata;

      try {
        groupMetadata = await sock.groupMetadata(phone);
      } catch (error) {
        console.error('GROUP METADATA ERROR:', error.message);
        failWhatsappMessage(messageId, error.message);
        continue;
      }

      const normalizeGroupName = (name) =>
        String(name || '')
          .normalize('NFKC')
          .replace(/\s+/g, ' ')
          .trim()
          .toLowerCase();

      const whatsappGroupName = normalizeGroupName(groupMetadata.subject);

      let monitoredGroup = monitoredGroups.find(
        group => group.group_jid === phone
      );

      if (monitoredGroup) {
        const currentGroupName = String(groupMetadata.subject || '').trim();

        if (
          currentGroupName &&
          currentGroupName !== monitoredGroup.group_name
        ) {
          const updated = setMonitoredGroupJid(
            ownerPhone,
            monitoredGroup.id,
            phone,
            currentGroupName
          );

          if (updated) {
            console.log(
              'GROUP NAME UPDATED:',
              monitoredGroup.group_name,
              '=>',
              currentGroupName
            );

            monitoredGroup = {
              ...monitoredGroup,
              group_name: currentGroupName
            };
          }
        }
      }

      if (!monitoredGroup) {
        monitoredGroup = monitoredGroups.find(
          group =>
            normalizeGroupName(group.group_name) === whatsappGroupName
        );

        if (monitoredGroup) {
          const linked = setMonitoredGroupJid(
            ownerPhone,
            monitoredGroup.id,
            phone,
            groupMetadata.subject
          );

          if (linked) {
            console.log(
              'GROUP JID LINKED:',
              monitoredGroup.group_name,
              '=>',
              phone
            );
          }
        }
      }

      if (!monitoredGroup) {
        console.log('GROUP SKIPPED:', groupMetadata.subject || phone);
        completeWhatsappMessage(messageId);
        continue;
      }

      console.log('MONITORED GROUP:', groupMetadata.subject);
      console.log('GROUP MESSAGE:', JSON.stringify(message, null, 2));

      const groupText = extractMessageText(message.message);

      if (!groupText.trim()) {
        console.log('GROUP MESSAGE SKIPPED: no text');
        completeWhatsappMessage(messageId);
        continue;
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
      completeWhatsappMessage(messageId);
      continue;
    }

    const text = extractMessageText(message.message);

    if (!text?.trim()) {
      console.log("MESSAGE TYPE:", Object.keys(message.message || {}));
      completeWhatsappMessage(messageId);
      continue;
    }

    console.log('\nUSER:', text);

    try {
      const chatPhone = phone.endsWith('@g.us') ? phone : normalizedPhone;
      const result = await processMessage(
        chatPhone,
        text.trim(),
        {
          isOwner: normalizedPhone === ownerPhone,
          ownerPhone
        }
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
        completeWhatsappMessage(messageId);
        continue;
      }

      await sock.sendMessage(phone, {
        text: result.reply
      });

      completeWhatsappMessage(messageId);

      console.log('SENT');
    } catch (error) {
      console.error('Message error:', error.message);

      failWhatsappMessage(messageId, error.message);

      if (policy.reply) {
        await sock.sendMessage(phone, {
          text: 'Sorry, something went wrong. Please try again.'
        });
      }
    }
    }

  });
}

start().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
