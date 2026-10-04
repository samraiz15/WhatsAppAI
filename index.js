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
  setMonitoredGroupJid,
  isContactAllowed
} = require('./groups');
const {
  addGroupMessage,
  registerWhatsappMessage,
  claimWhatsappMessage,
  completeWhatsappMessage,
  failWhatsappMessage,
  getLeadsDueForFollowUp,
  claimFollowUp,
  completeFollowUp,
  failFollowUp
} = require('./db');
const { extractMessageText } = require('./message-utils');
const { classify, compactLog } = require('./ingestPolicy');
const { sendOutboundMessage } = require('./outbound-guard');
const { processFollowUps } = require('./crm_followup_service');

function leadPhoneToJid(phone) {
  const value = String(phone || "").trim();
  if (!value) return "";
  if (value.endsWith("@s.whatsapp.net")) return value;
  if (value.startsWith("+")) return value.slice(1) + "@s.whatsapp.net";
  if (/^[0-9]+$/.test(value)) return value + "@s.whatsapp.net";
  return value;
}

const AUTH_DIR = './pairing-auth';

// Temporary 3-day demo: allow all customer DMs.
// Owner commands remain owner-only.
const DEMO_DM_ENABLED = true;
const DEMO_DM_EXPIRES_AT = new Date('2026-10-10T23:59:59+05:00').getTime();

function isDemoDmActive() {
  return DEMO_DM_ENABLED && Date.now() < DEMO_DM_EXPIRES_AT;
}

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

// Fail-closed outbound DM authorization.
// A number must first send an eligible inbound DM during this
// connection session before the bot may send anything to it.
const inboundDmAuthorization = new Set();

function authorizeInboundDm(jid) {
  if (jid && jid.endsWith('@s.whatsapp.net')) {
    inboundDmAuthorization.add(jid);
  }
}

function canSendOutboundDm(jid) {
  return Boolean(
    jid &&
    jid.endsWith('@s.whatsapp.net') &&
    inboundDmAuthorization.has(jid)
  );
}

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

  async function runCrmFollowUps() {
    try {
      const now = new Date();
      const leads = getLeadsDueForFollowUp(now);

      if (!Array.isArray(leads) || !leads.length) {
        return;
      }

      const claimedLeads = leads.filter((lead) => {
        return claimFollowUp(lead.id);
      });

      if (!claimedLeads.length) {
        return;
      }

      const result = await processFollowUps(
        claimedLeads,
        async (jid, message) => {
          return sendOutboundMessage(
            sock,
            jid,
            { text: message },
            {
              authorizedJids: inboundDmAuthorization,
              connectionState,
              connectedState: CONNECTION_STATES.CONNECTED
            }
          );
        },
        now
      );

      for (const item of result.sent) {
        if (item.id != null) {
          completeFollowUp(item.id);
        }
      }

      for (const item of result.failed) {
        if (item.id != null) {
          failFollowUp(item.id);
        }
      }

      console.log(
        'CRM FOLLOW-UP:',
        `due=${result.due.length}`,
        `claimed=${claimedLeads.length}`,
        `sent=${result.sent.length}`,
        `failed=${result.failed.length}`
      );
    } catch (error) {
      console.error('CRM FOLLOW-UP ERROR:', error.message);
    }
  }

  let crmStartupFollowUpRan = false;

  const crmFollowUpTimer = setInterval(() => {
    if (connectionState === CONNECTION_STATES.CONNECTED) {
      runCrmFollowUps().catch(error => {
        console.error('CRM FOLLOW-UP TIMER ERROR:', error.message);
      });
    }
  }, 5 * 60 * 1000);


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

      inboundDmAuthorization.clear();
      console.log('OUTBOUND DM AUTHORIZATION RESET: new connection session');
      console.log('Connection:', connection, '| State:', connectionState);

      if (crmStartupFollowUpRan === false) {
        crmStartupFollowUpRan = true;
        runCrmFollowUps().catch(error => {
          console.error('CRM FOLLOW-UP STARTUP ERROR:', error.message);
        });
      }
    }

    if (connection === 'connecting') {
      connectionState = CONNECTION_STATES.CONNECTING;
      console.log('Connection:', connection, '| State:', connectionState);
    }

    if (connection === 'close') {
      clearInterval(crmFollowUpTimer);
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

      const isGroupMessage = String(
        message.key?.remoteJid ||
        message.key?.remoteJidAlt ||
        ''
      ).endsWith('@g.us');

      const policy = classify(
        {
          ts: message.messageTimestamp,
          fromMe: message.key?.fromMe === true,
          isGroup: isGroupMessage,
          upsertType: type
        },
        nowSec
      );

      // Demo mode: every fresh inbound DM may receive a reply.
      // Groups remain ingest-only.
      if (
        isDemoDmActive() &&
        !isGroupMessage &&
        !message.key?.fromMe &&
        policy.ingest
      ) {
        policy.reply = true;
        policy.reason = 'dm_demo_live';
      }

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
        JSON.stringify(message, null, 2)
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

    if (
      normalizedPhone !== ownerPhone &&
      !phone.endsWith('@g.us') &&
      !isDemoDmActive() &&
      !isContactAllowed(ownerPhone, normalizedPhone)
    ) {
      console.log('CONTACT CHAT BLOCKED:', phone);
      completeWhatsappMessage(messageId);
      continue;
    }

    // Only a fresh, eligible inbound DM authorizes replies to this number.
    if (
      !isGroupMessage &&
      policy.reply &&
      !message.key.fromMe &&
      connectionState === CONNECTION_STATES.CONNECTED
    ) {
      authorizeInboundDm(normalizedPhone);

      if (canSendOutboundDm(normalizedPhone)) {
        console.log('OUTBOUND DM AUTHORIZED:', normalizedPhone);
      }
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

      if (!canSendOutboundDm(normalizedPhone)) {
        console.log(
          'OUTBOUND BLOCKED: no qualifying inbound DM',
          normalizedPhone
        );
        completeWhatsappMessage(messageId);
        continue;
      }

      await sendOutboundMessage(
        sock,
        phone,
        { text: result.reply },
        {
          authorizedJids: inboundDmAuthorization,
          connectionState,
          connectedState: CONNECTION_STATES.CONNECTED
        }
      );

      completeWhatsappMessage(messageId);

      console.log('SENT');
    } catch (error) {
      console.error('Message error:', error.message);

      failWhatsappMessage(messageId, error.message);

      if (
        policy.reply &&
        canSendOutboundDm(normalizedPhone)
      ) {
        await sendOutboundMessage(
          sock,
          phone,
          { text: 'Sorry, something went wrong. Please try again.' },
          {
            authorizedJids: inboundDmAuthorization,
            connectionState,
            connectedState: CONNECTION_STATES.CONNECTED
          }
        );
      } else {
        console.log(
          'ERROR REPLY BLOCKED: no qualifying inbound DM',
          normalizedPhone
        );
      }
    }
    }

  });
}

start().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
