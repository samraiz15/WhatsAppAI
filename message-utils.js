function unwrapMessage(message) {
  let current = message || {};

  for (let i = 0; i < 5; i++) {
    if (current.ephemeralMessage?.message) {
      current = current.ephemeralMessage.message;
      continue;
    }

    if (current.viewOnceMessage?.message) {
      current = current.viewOnceMessage.message;
      continue;
    }

    if (current.viewOnceMessageV2?.message) {
      current = current.viewOnceMessageV2.message;
      continue;
    }

    if (current.viewOnceMessageV2Extension?.message) {
      current = current.viewOnceMessageV2Extension.message;
      continue;
    }

    break;
  }

  return current;
}

function extractMessageText(message) {
  const current = unwrapMessage(message);

  if (!current || typeof current !== 'object') {
    return '';
  }

  return String(
    current.conversation ||
    current.extendedTextMessage?.text ||
    current.imageMessage?.caption ||
    current.videoMessage?.caption ||
    current.documentMessage?.caption ||
    ''
  ).trim();
}

function getMessageType(message) {
  const current = unwrapMessage(message);

  if (!current || typeof current !== 'object') {
    return null;
  }

  const keys = Object.keys(current);

  return keys.length ? keys[0] : null;
}

module.exports = {
  unwrapMessage,
  extractMessageText,
  getMessageType
};
