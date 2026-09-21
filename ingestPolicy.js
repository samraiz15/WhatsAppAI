'use strict';

const CFG = {
  replyMaxAgeSec: 300,
  appendLiveWindowSec: 600,
  retentionDays: 20,
  futureSkewSec: 300
};

function toSeconds(ts) {
  if (ts === null || ts === undefined) return null;

  let n;

  if (typeof ts === 'object') {
    if (typeof ts.toNumber === 'function') {
      n = ts.toNumber();
    } else if (typeof ts.low === 'number') {
      n = (ts.high || 0) * 4294967296 + (ts.low >>> 0);
    } else {
      return null;
    }
  } else {
    n = Number(ts);
  }

  return Number.isFinite(n) && n > 0 ? n : null;
}

function classify(input, nowSec, cfg) {
  const c = Object.assign({}, CFG, cfg || {});

  const no = reason => ({
    ingest: false,
    reply: false,
    reason
  });

  const t = toSeconds(input.ts);

  if (t === null) return no('no_timestamp');

  const age = nowSec - t;

  if (age < -c.futureSkewSec) {
    return no('future_timestamp');
  }

  const ownerCommand =
    /^(list|add group|remove group|groups|search|leads|parkview|status)$/i.test(
      String(input.text || '').trim()
    );

  // During the demo window, allow owner-originated messages through ingest.
  // processMessage() still decides whether non-command owner text is ignored.
  if (
    input.fromMe &&
    !(input.demoMode && input.demoActive)
  ) {
    return no('from_me');
  }

  if (
    input.upsertType !== 'notify' &&
    input.upsertType !== 'append'
  ) {
    return no('unknown_type');
  }

  if (
    input.upsertType === 'append' &&
    age > c.appendLiveWindowSec
  ) {
    return no('append_history');
  }

  if (age > c.retentionDays * 86400) {
    return no('beyond_retention');
  }

  const live = age <= c.replyMaxAgeSec;

  if (input.isGroup) {
    return {
      ingest: true,
      reply: false,
      firstSeenSec: t,
      reason: live ? 'group_live' : 'group_backlog'
    };
  }

  return {
    ingest: true,
    reply: live,
    firstSeenSec: t,
    reason: live ? 'dm_live' : 'dm_missed_offline'
  };
}

function compactLog(upsertType, msg, nowSec) {
  const key = (msg && msg.key) || {};
  const t = toSeconds(msg && msg.messageTimestamp);
  const age = t === null ? 'na' : String(nowSec - t) + 's';
  const jid = key.remoteJid || '';
  const kind = jid.indexOf('@g.us') !== -1 ? 'group' : 'dm';
  const id = String(key.id || '').slice(0, 8);

  return (
    'upsert type=' + upsertType +
    ' age=' + age +
    ' chat=' + kind +
    ' fromMe=' + (key.fromMe ? 1 : 0) +
    ' id=' + id
  );
}

module.exports = {
  classify,
  toSeconds,
  compactLog,
  CFG
};
