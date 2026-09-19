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

function isSensitiveKey(name) {
  const key = String(name || '').toLowerCase();

  return /rootkey|privkey|privatekey|remoteidentitykey|session|secret|token|password|cookie|auth|authorization|apikey|api_key|keymaterial|encryption|sessionkey|accesskey|refreshkey/i.test(key);
}

function safeLogValue(value, seen = new WeakSet()) {
  if (value === null || value === undefined) {
    return 'null';
  }

  if (typeof value === 'string') {
    return value.slice(0, 300);
  }

  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }

  if (typeof value === 'function') {
    return '[Function]';
  }

  if (typeof value === 'object') {
    if (seen.has(value)) {
      return '[Circular]';
    }

    seen.add(value);

    if (Array.isArray(value)) {
      return `[${value.map(item => safeLogValue(item, seen)).join(', ')}]`;
    }

    const out = {};

    for (const [key, entry] of Object.entries(value)) {
      if (isSensitiveKey(key)) {
        continue;
      }

      out[key] = safeLogValue(entry, seen);
    }

    return JSON.stringify(out).slice(0, 1500);
  }

  return String(value);
}

module.exports = {
  unwrapMessage,
  extractMessageText,
  getMessageType,
  safeLogValue
};
