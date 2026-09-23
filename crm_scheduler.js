'use strict';

function getFollowUpDueAt(lead = {}, now = new Date()) {
  const days = Number(lead.followup_days ?? 1);
  if (!Number.isFinite(days) || days < 0) {
    throw new Error('followup_days must be a non-negative number');
  }

  const dueAt = new Date(now);
  dueAt.setDate(dueAt.getDate() + days);
  return dueAt;
}

function isFollowUpDue(lead = {}, now = new Date()) {
  if (!lead.phone) return false;
  if (lead.followup_status === 'completed') return false;

  const dueAt = lead.followup_due_at
    ? new Date(lead.followup_due_at)
    : getFollowUpDueAt(
        lead,
        lead.followup_started_at
          ? new Date(lead.followup_started_at)
          : new Date(now)
      );

  return new Date(now) >= dueAt;
}

module.exports = {
  getFollowUpDueAt,
  isFollowUpDue
};
