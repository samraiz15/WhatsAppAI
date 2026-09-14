const { db } = require('./db');

db.exec(`
  CREATE TABLE IF NOT EXISTS monitored_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_phone TEXT NOT NULL,
    group_name TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(owner_phone, group_name)
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS command_state (
    owner_phone TEXT PRIMARY KEY,
    state TEXT,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

const setCommandStateStmt = db.prepare(`
  INSERT INTO command_state (owner_phone, state)
  VALUES (?, ?)
  ON CONFLICT(owner_phone)
  DO UPDATE SET
    state = excluded.state,
    updated_at = CURRENT_TIMESTAMP
`);

const getCommandStateStmt = db.prepare(`
  SELECT state
  FROM command_state
  WHERE owner_phone = ?
`);

function setCommandState(ownerPhone, state) {
  setCommandStateStmt.run(ownerPhone, state);
}

function getCommandState(ownerPhone) {
  const row = getCommandStateStmt.get(ownerPhone);
  return row ? row.state : null;
}

const addGroupStmt = db.prepare(`
  INSERT INTO monitored_groups (
    owner_phone,
    group_name
  )
  VALUES (?, ?)
  ON CONFLICT(owner_phone, group_name)
  DO UPDATE SET
    enabled = 1,
    updated_at = CURRENT_TIMESTAMP
`);

const listGroupsStmt = db.prepare(`
  SELECT id, group_name, enabled, created_at
  FROM monitored_groups
  WHERE owner_phone = ?
    AND enabled = 1
  ORDER BY created_at ASC
`);

const disableGroupStmt = db.prepare(`
  UPDATE monitored_groups
  SET enabled = 0,
      updated_at = CURRENT_TIMESTAMP
  WHERE owner_phone = ?
    AND group_name = ?
`);

function addMonitoredGroup(ownerPhone, groupName) {
  const name = String(groupName || '').trim();

  if (!ownerPhone || !name) {
    return null;
  }

  addGroupStmt.run(ownerPhone, name);

  return {
    owner_phone: ownerPhone,
    group_name: name,
    enabled: true
  };
}

function getMonitoredGroups(ownerPhone) {
  return listGroupsStmt.all(ownerPhone);
}

function disableMonitoredGroup(ownerPhone, groupName) {
  return disableGroupStmt.run(
    ownerPhone,
    String(groupName || '').trim()
  );
}

module.exports = {
  addMonitoredGroup,
  getMonitoredGroups,
  disableMonitoredGroup,
  setCommandState,
  getCommandState
};


db.exec(`
  CREATE TABLE IF NOT EXISTS allowed_contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_phone TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(owner_phone, contact_phone)
  );
`);

const addAllowedContactStmt = db.prepare(`
  INSERT INTO allowed_contacts (
    owner_phone,
    contact_phone
  )
  VALUES (?, ?)
  ON CONFLICT(owner_phone, contact_phone)
  DO UPDATE SET
    enabled = 1,
    updated_at = CURRENT_TIMESTAMP
`);

const listAllowedContactsStmt = db.prepare(`
  SELECT contact_phone, enabled, created_at
  FROM allowed_contacts
  WHERE owner_phone = ?
    AND enabled = 1
  ORDER BY created_at ASC
`);

const disableAllowedContactStmt = db.prepare(`
  UPDATE allowed_contacts
  SET enabled = 0,
      updated_at = CURRENT_TIMESTAMP
  WHERE owner_phone = ?
    AND contact_phone = ?
`);

function normalizeContactPhone(phone) {
  const raw = String(phone || '').trim();

  if (!raw) return null;

  const digits = raw
    .replace(/@.*$/, '')
    .replace(/[^0-9]/g, '');

  return digits ? digits + '@s.whatsapp.net' : null;
}

function allowContact(ownerPhone, contactPhone) {
  const owner = normalizeContactPhone(ownerPhone);
  const contact = normalizeContactPhone(contactPhone);

  if (!owner || !contact || owner === contact) {
    return false;
  }

  addAllowedContactStmt.run(owner, contact);
  return true;
}

function blockContact(ownerPhone, contactPhone) {
  const owner = normalizeContactPhone(ownerPhone);
  const contact = normalizeContactPhone(contactPhone);

  if (!owner || !contact) {
    return false;
  }

  disableAllowedContactStmt.run(owner, contact);
  return true;
}

function getAllowedContacts(ownerPhone) {
  const owner = normalizeContactPhone(ownerPhone);

  if (!owner) return [];

  return listAllowedContactsStmt.all(owner);
}

function isContactAllowed(ownerPhone, contactPhone) {
  const owner = normalizeContactPhone(ownerPhone);
  const contact = normalizeContactPhone(contactPhone);

  if (!owner || !contact || owner === contact) {
    return false;
  }

  return listAllowedContactsStmt.all(owner)
    .some(row => row.contact_phone === contact);
}

module.exports.allowContact = allowContact;
module.exports.blockContact = blockContact;
module.exports.getAllowedContacts = getAllowedContacts;
module.exports.isContactAllowed = isContactAllowed;
module.exports.normalizeContactPhone = normalizeContactPhone;
