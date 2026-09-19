'use strict';

const {
  classify,
  toSeconds,
  compactLog
} = require('./ingestPolicy');

const NOW = 1800000000;
const MIN = 60;
const HOUR = 3600;
const DAY = 86400;

let pass = 0;
let fail = 0;

function check(name, cond, detail) {
  if (cond) {
    pass++;
    console.log('PASS  ' + name);
  } else {
    fail++;
    console.log(
      'FAIL  ' + name +
      (detail ? '  -> ' + JSON.stringify(detail) : '')
    );
  }
}

const mk = o =>
  Object.assign({
    upsertType: 'notify',
    fromMe: false,
    isGroup: false,
    ts: NOW
  }, o);

let r;

r = classify(
  mk({ isGroup: true, ts: NOW - 30 }),
  NOW
);
check(
  '1 notify group 30s -> ingest, no reply, group_live',
  r.ingest && !r.reply && r.reason === 'group_live',
  r
);

r = classify(
  mk({ isGroup: true, ts: NOW - 3 * DAY }),
  NOW
);
check(
  '2 notify group 3d -> backlog ingest, first_seen = msg time',
  r.ingest &&
  !r.reply &&
  r.reason === 'group_backlog' &&
  r.firstSeenSec === NOW - 3 * DAY,
  r
);

r = classify(
  mk({
    upsertType: 'append',
    isGroup: true,
    ts: NOW - 3 * DAY
  }),
  NOW
);
check(
  '3 append group 3d -> ignored append_history',
  !r.ingest && r.reason === 'append_history',
  r
);

r = classify(
  mk({
    upsertType: 'append',
    ts: NOW - 20
  }),
  NOW
);
check(
  '4 append DM 20s -> ingest + reply (reconnect race)',
  r.ingest && r.reply,
  r
);

r = classify(
  mk({ ts: NOW - 2 * HOUR }),
  NOW
);
check(
  '5 notify DM 2h -> ingest, no reply, dm_missed_offline',
  r.ingest &&
  !r.reply &&
  r.reason === 'dm_missed_offline',
  r
);

r = classify(
  mk({ ts: NOW - 4 * MIN }),
  NOW
);
check(
  '6 notify DM 4min -> ingest + reply',
  r.ingest &&
  r.reply &&
  r.reason === 'dm_live',
  r
);

r = classify(
  mk({
    isGroup: true,
    ts: NOW - 25 * DAY
  }),
  NOW
);
check(
  '7 notify group 25d -> beyond_retention',
  !r.ingest && r.reason === 'beyond_retention',
  r
);

r = classify(
  mk({ fromMe: true }),
  NOW
);
check(
  '8 fromMe -> ignored',
  !r.ingest &&
  !r.reply &&
  r.reason === 'from_me',
  r
);

const t = NOW - 10;

check('9a timestamp number', toSeconds(t) === t);
check('9b timestamp string', toSeconds(String(t)) === t);
check(
  '9c timestamp Long-like (toNumber)',
  toSeconds({ toNumber: () => t }) === t
);
check(
  '9d timestamp Long-like (low/high)',
  toSeconds({ low: t, high: 0 }) === t
);

r = classify(
  mk({ ts: undefined }),
  NOW
);
check(
  '10 missing timestamp -> ignored',
  !r.ingest && r.reason === 'no_timestamp',
  r
);

r = classify(
  mk({ ts: NOW + HOUR }),
  NOW
);
check(
  '11 timestamp 1h in future -> ignored',
  !r.ingest && r.reason === 'future_timestamp',
  r
);

r = classify(
  mk({
    upsertType: 'append',
    ts: NOW - 700
  }),
  NOW
);
check(
  'extra: append DM 700s -> treated as history',
  !r.ingest && r.reason === 'append_history',
  r
);

r = classify(
  mk({ upsertType: 'weird' }),
  NOW
);
check(
  'extra: unknown upsert type -> ignored',
  !r.ingest && r.reason === 'unknown_type',
  r
);

r = classify(
  mk({
    isGroup: true,
    ts: NOW - 25 * DAY
  }),
  NOW,
  { retentionDays: 30 }
);
check(
  'extra: retentionDays override respected',
  r.ingest && r.reason === 'group_backlog',
  r
);

const line = compactLog(
  'notify',
  {
    key: {
      remoteJid: '123@g.us',
      id: 'ABCDEF1234567890',
      fromMe: false
    },
    messageTimestamp: NOW - 12
  },
  NOW
);

check(
  'extra: compactLog has no message text and shows age/chat',
  line.indexOf('age=12s') !== -1 &&
  line.indexOf('chat=group') !== -1,
  line
);

console.log('\n' + pass + ' passed, ' + fail + ' failed');
console.log(
  'Not covered here: duplicate message ID and history batch DB behavior.'
);

process.exit(fail ? 1 : 0);
