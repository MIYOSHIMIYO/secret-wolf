export type UiEphemeral = {
  hasSubmittedSecret: boolean;
  hasPressedEndDiscuss: boolean;
  hasSubmittedVote: boolean;
  chatDraft: string;
  bannerHiddenByKeyboard: boolean;
  localTimers: { id?: number };
};

export function uiResetForNewRound(): UiEphemeral {
  return {
    hasSubmittedSecret: false,
    hasPressedEndDiscuss: false,
    hasSubmittedVote: false,
    chatDraft: "",
    bannerHiddenByKeyboard: false,
    localTimers: {},
  };
}

export function uiResetForPhaseChange(s: UiEphemeral) {
  if (s.localTimers.id) {
    clearInterval(s.localTimers.id);
    s.localTimers.id = undefined;
  }
}

export function uiResetOnLeaveOrAbort(): UiEphemeral {
  return uiResetForNewRound();
} 