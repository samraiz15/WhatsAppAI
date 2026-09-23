'use strict';

const { runFollowUps } = require('./crm_followup_runner');
const { dispatchFollowUps } = require('./crm_followup_dispatch');

async function processFollowUps(leads = [], sendMessage, now = new Date()) {
  const due = runFollowUps(leads, now);
  const dueList = Array.isArray(due) ? due : (due && Array.isArray(due.due) ? due.due : []);

  if (!dueList.length) {
    return {
      due: [],
      sent: [],
      failed: []
    };
  }

  const dispatched = await dispatchFollowUps(dueList, sendMessage, now);

  return {
    due: dueList,
    sent: Array.isArray(dispatched) ? dispatched : (dispatched.sent || []),
    failed: dispatched && Array.isArray(dispatched.failed) ? dispatched.failed : []
  };
}

module.exports = {
  processFollowUps
};
