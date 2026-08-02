export interface Participant {
  id: string;
  display_name: string;
}

/** Cached in localStorage per-browser; never sent anywhere except as an RPC parameter. */
export interface ParticipantIdentity {
  participantToken: string;
  displayName: string | null;
}
