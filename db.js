const Database = require('better-sqlite3');

const db = new Database(process.env.WHATSAPPAI_DB_PATH || './agent.db');

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT UNIQUE NOT NULL,
    name TEXT,
    interest TEXT,
    budget TEXT,
    area TEXT,
    timeline TEXT,
    notes TEXT,
    profession TEXT,
    location TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT NOT NULL,
    direction TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

// Automatic schema migration for existing databases.
db.exec(`
  CREATE TABLE IF NOT EXISTS group_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_phone TEXT NOT NULL,
    group_jid TEXT NOT NULL,
    group_name TEXT NOT NULL,
    sender_phone TEXT,
    sender_name TEXT,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_group_messages_owner
  ON group_messages(owner_phone);

  CREATE INDEX IF NOT EXISTS idx_group_messages_group
  ON group_messages(group_name);

  CREATE INDEX IF NOT EXISTS idx_group_messages_message
  ON group_messages(message);
`);

const leadColumns = db.prepare('PRAGMA table_info(leads)').all();
const leadColumnNames = new Set(leadColumns.map(c => c.name));

if (!leadColumnNames.has('property_size')) {
  db.exec('ALTER TABLE leads ADD COLUMN property_size TEXT');
}

if (!leadColumnNames.has('budget_numeric')) {
  db.exec('ALTER TABLE leads ADD COLUMN budget_numeric INTEGER');
}


db.exec(`
  CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id TEXT NOT NULL UNIQUE,
    remote_jid TEXT,
    participant_jid TEXT,
    from_me INTEGER NOT NULL DEFAULT 0,
    message_type TEXT,
    message_text TEXT,
    message_timestamp INTEGER,
    status TEXT NOT NULL DEFAULT 'received',
    claimed_at TEXT,
    error TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_remote
  ON whatsapp_messages(remote_jid);

  CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_status
  ON whatsapp_messages(status);
`);

const whatsappMessageColumns = db
  .prepare('PRAGMA table_info(whatsapp_messages)')
  .all()
  .map(column => column.name);

if (!whatsappMessageColumns.includes('claimed_at')) {
  db.exec(`
    ALTER TABLE whatsapp_messages
    ADD COLUMN claimed_at TEXT
  `);
}

const insertWhatsappMessageStmt = db.prepare(`
  INSERT OR IGNORE INTO whatsapp_messages (
    message_id,
    remote_jid,
    participant_jid,
    from_me,
    message_type,
    message_text,
    message_timestamp
  )
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const getWhatsappMessageStmt = db.prepare(`
  SELECT *
  FROM whatsapp_messages
  WHERE message_id = ?
`);

const claimWhatsappMessageStmt = db.prepare(`
  UPDATE whatsapp_messages
  SET status = 'processing',
      claimed_at = CURRENT_TIMESTAMP,
      error = NULL
  WHERE message_id = ?
    AND (
      status IN ('received', 'failed')
      OR (
        status = 'processing'
        AND (
          claimed_at IS NULL
          OR datetime(claimed_at) <= datetime('now', '-5 minutes')
        )
      )
    )
`);

const completeWhatsappMessageStmt = db.prepare(`
  UPDATE whatsapp_messages
  SET status = 'processed',
      claimed_at = NULL,
      error = NULL,
      processed_at = CURRENT_TIMESTAMP
  WHERE message_id = ?
    AND status = 'processing'
`);

const failWhatsappMessageStmt = db.prepare(`
  UPDATE whatsapp_messages
  SET status = 'failed',
      claimed_at = NULL,
      error = ?
  WHERE message_id = ?
    AND status = 'processing'
`);

function registerWhatsappMessage({
  messageId,
  remoteJid = null,
  participantJid = null,
  fromMe = false,
  messageType = null,
  messageText = null,
  messageTimestamp = null
}) {
  const id = String(messageId || '').trim();

  if (!id) {
    throw new Error('messageId is required');
  }

  const result = insertWhatsappMessageStmt.run(
    id,
    remoteJid,
    participantJid,
    fromMe ? 1 : 0,
    messageType,
    messageText,
    messageTimestamp
  );

  return {
    inserted: result.changes === 1,
    message: getWhatsappMessageStmt.get(id)
  };
}

function claimWhatsappMessage(messageId) {
  return claimWhatsappMessageStmt.run(
    String(messageId || '').trim()
  ).changes > 0;
}

function completeWhatsappMessage(messageId) {
  return completeWhatsappMessageStmt.run(
    String(messageId || '').trim()
  ).changes > 0;
}

function failWhatsappMessage(messageId, error) {
  return failWhatsappMessageStmt.run(
    String(error || '').slice(0, 1000),
    String(messageId || '').trim()
  ).changes > 0;
}

function normalizePhoneEligibilityKey(value) {
  const text = String(value || '').trim();
  if (!text) return '';

  const noPlus = text.replace(/^\+/, '');
  const digits = noPlus.replace(/\D/g, '');
  return digits;
}

const hasInboundMessageForPhoneStmt = db.prepare(`
  SELECT 1
  FROM whatsapp_messages
  WHERE from_me = 0
    AND (
      remote_jid = ?
      OR remote_jid = ?
      OR participant_jid = ?
      OR participant_jid = ?
      OR remote_jid LIKE ?
      OR participant_jid LIKE ?
      OR remote_jid LIKE ?
      OR participant_jid LIKE ?
    )
  LIMIT 1
`);

function hasInboundMessageForPhone(phone) {
  const normalized = normalizePhoneEligibilityKey(phone);
  if (!normalized) return false;

  const exact = normalized + '@s.whatsapp.net';
  const lidExact = normalized + '@lid';

  return !!hasInboundMessageForPhoneStmt.get(
    exact,
    normalized,
    exact,
    lidExact,
    `${normalized}@%`,
    `${normalized}@%`,
    `%${normalized}%`,
    `%${normalized}%`
  );
}

const findLead = db.prepare(`
  SELECT * FROM leads WHERE phone = ?
`);

const createLead = db.prepare(`
  INSERT INTO leads (phone) VALUES (?)
`);

const updateLead = db.prepare(`
  UPDATE leads
  SET name = COALESCE(?, name),
      interest = COALESCE(?, interest),
      budget = COALESCE(?, budget),
      area = COALESCE(?, area),
      timeline = COALESCE(?, timeline),
      notes = COALESCE(?, notes),
      profession = COALESCE(?, profession),
      location = COALESCE(?, location),
      property_size = COALESCE(?, property_size),
      budget_numeric = COALESCE(?, budget_numeric),
      updated_at = CURRENT_TIMESTAMP
  WHERE phone = ?
`);

const saveMessage = db.prepare(`
  INSERT INTO messages (phone, direction, message)
  VALUES (?, ?, ?)
`);

function getOrCreateLead(phone) {
  let lead = findLead.get(phone);

  if (!lead) {
    createLead.run(phone);
    lead = findLead.get(phone);
  }

  return lead;
}

function updateLeadInfo(phone, info) {
  updateLead.run(
    info.name ?? null,
    info.interest ?? null,
    info.budget ?? null,
    info.area ?? null,
    info.timeline ?? null,
    info.notes ?? null,
    info.profession ?? null,
    info.location ?? null,
    info.property_size ?? null,
    info.budget_numeric ?? null,
    phone
  );

  return findLead.get(phone);
}

function addMessage(phone, direction, message) {
  saveMessage.run(phone, direction, message);
}

const saveGroupMessage = db.prepare(`
  INSERT INTO group_messages (
    owner_phone,
    group_jid,
    group_name,
    sender_phone,
    sender_name,
    message
  )
  VALUES (?, ?, ?, ?, ?, ?)
`);

const searchGroupMessagesStmt = db.prepare(`
  SELECT
    id,
    group_jid,
    group_name,
    sender_phone,
    sender_name,
    message,
    created_at
  FROM group_messages
  WHERE owner_phone = ?
    AND message LIKE ?
  ORDER BY id DESC
  LIMIT ?
`);

const listGroupMessagesStmt = db.prepare(`
  SELECT
    id,
    group_jid,
    group_name,
    sender_phone,
    sender_name,
    message,
    created_at
  FROM group_messages
  WHERE owner_phone = ?
  ORDER BY id DESC
  LIMIT ?
`);

function addGroupMessage(
  ownerPhone,
  groupJid,
  groupName,
  senderPhone,
  senderName,
  message
) {
  if (!ownerPhone || !groupJid || !groupName || !message) {
    return;
  }

  saveGroupMessage.run(
    ownerPhone,
    groupJid,
    groupName,
    senderPhone || null,
    senderName || null,
    message
  );
}

function searchGroupMessages(ownerPhone, query, limit = 20) {
  const text = String(query || '').trim();

  if (!text) {
    return listGroupMessagesStmt.all(ownerPhone, limit);
  }

  return searchGroupMessagesStmt.all(
    ownerPhone,
    `%${text}%`,
    limit
  );
}

module.exports = {
  db,
  getOrCreateLead,
  updateLeadInfo,
  addMessage,
  addGroupMessage,
  searchGroupMessages
  ,
  registerWhatsappMessage,
  claimWhatsappMessage,
  completeWhatsappMessage,
  failWhatsappMessage,
  hasInboundMessageForPhone
};
