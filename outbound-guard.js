'use strict';

function canSendOutboundDm(jid, authorizedJids, connectionState, connectedState) {
  return Boolean(
    jid &&
    jid.endsWith('@s.whatsapp.net') &&
    connectionState === connectedState &&
    authorizedJids instanceof Set &&
    authorizedJids.has(jid)
  );
}

async function sendOutboundMessage(
  sock,
  jid,
  content,
  {
    authorizedJids,
    connectionState,
    connectedState
  } = {}
) {
  if (!sock || typeof sock.sendMessage !== 'function') {
    throw new TypeError('sock.sendMessage must be a function');
  }

  const isDm = Boolean(
    jid && jid.endsWith('@s.whatsapp.net')
  );

  if (
    isDm &&
    !canSendOutboundDm(
      jid,
      authorizedJids,
      connectionState,
      connectedState
    )
  ) {
    throw new Error(
      `OUTBOUND DM BLOCKED: no qualifying inbound authorization for ${jid}`
    );
  }

  return sock.sendMessage(jid, content);
}

module.exports = {
  canSendOutboundDm,
  sendOutboundMessage
};
