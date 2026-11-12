/** Invalidates responses after edits, switching connections, closing or unmounting. */
export function createEditorEpoch() {
  let session = 0;
  let revision = 0;
  return {
    begin() {
      session += 1;
      revision = 0;
    },
    edit() {
      revision += 1;
    },
    snapshot() {
      return { session, revision };
    },
    isCurrent(ticket: { session: number; revision: number }) {
      return ticket.session === session && ticket.revision === revision;
    },
    isSession(ticket: { session: number }) {
      return ticket.session === session;
    },
  };
}
