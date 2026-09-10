const { getOrCreateLead, updateLeadInfo } = require('./db');

const histories = new Map();

const MAX_MESSAGES = 10;

function getHistory(jid) {
  return histories.get(jid) || [];
}

function addMessage(jid, role, content) {
  const history = histories.get(jid) || [];

  history.push({ role, content });

  while (history.length > MAX_MESSAGES) {
    history.shift();
  }

  histories.set(jid, history);
}

function getMemory(jid) {
  const lead = getOrCreateLead(jid);

  return {
    name: lead.name || null,
    profession: lead.profession || null,
    location: lead.location || null
  };
}

function updateMemory(jid, updates) {
  getOrCreateLead(jid);

  return updateLeadInfo(jid, {
    name: updates.name ?? null,
    profession: updates.profession ?? null,
    location: updates.location ?? null
  });
}

function clearHistory(jid) {
  histories.delete(jid);
}

module.exports = {
  getHistory,
  addMessage,
  getMemory,
  updateMemory,
  clearHistory
};
