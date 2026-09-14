const Database = require('better-sqlite3');

const db = new Database('./agent.db');

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
};
