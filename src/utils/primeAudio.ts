// Shared AudioContext for the call ring + TTS warm-up.
//
// Mobile browsers start an AudioContext "suspended" (silent) when it is
// created outside a user gesture — so the context MUST be created inside
// the tap that opens the call. primeAudio() is called from the call
// button's onClick (a real gesture); the modal reuses the same context.

let sharedCtx: AudioContext | null = null;

export function primeAudio(): void {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    if (!sharedCtx) sharedCtx = new Ctx();
    if (sharedCtx.state === "suspended") void sharedCtx.resume();
  } catch {
    /* noop */
  }
}

export function getAudioContext(): AudioContext | null {
  return sharedCtx;
}
