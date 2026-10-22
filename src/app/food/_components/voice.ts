"use client";

/**
 * Text-to-speech using the device's own voices, picking the best-sounding
 * one available. Phones, iPads and computers ship several English voices of
 * very different quality; the default is often the robotic "compact" one.
 */

const STORAGE_KEY = "food-call-voice";

/** Joke/novelty voices on Apple devices — never pick these automatically. */
const NOVELTY =
  /^(albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|fred|junior|ralph|kathy|grandma|grandpa|rocko|shelley|flo|eddy|reed|sandy)\b/i;

/** Natural-sounding voices that are usually present on Apple / Google / Microsoft devices. */
const GOOD_NAMES = /\b(ava|zoe|allison|samantha|susan|evan|nathan|tom|serena|karen|daniel|aria|jenny|guy|libby|sonia)\b/i;

export function scoreVoice(voice: SpeechSynthesisVoice) {
  if (!voice.lang.toLowerCase().startsWith("en")) return -1000;
  if (NOVELTY.test(voice.name)) return -500;
  let score = 0;
  if (/premium/i.test(voice.name)) score += 100;
  if (/enhanced/i.test(voice.name)) score += 80;
  if (/natural|neural|online/i.test(voice.name)) score += 70; // Edge / Windows neural voices
  if (/google/i.test(voice.name)) score += 50; // Chrome's network voices
  if (GOOD_NAMES.test(voice.name)) score += 20;
  const lang = voice.lang.toLowerCase().replace("_", "-");
  if (lang === "en-ca") score += 6;
  else if (lang === "en-us") score += 5;
  else if (lang === "en-gb") score += 4;
  return score;
}

export function englishVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  return window.speechSynthesis
    .getVoices()
    .filter((voice) => scoreVoice(voice) > -500)
    .sort((a, b) => scoreVoice(b) - scoreVoice(a) || a.name.localeCompare(b.name));
}

/** The saved choice ("" = automatic). */
export function savedVoiceUri(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveVoiceUri(uri: string) {
  try {
    if (uri) localStorage.setItem(STORAGE_KEY, uri);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Private browsing etc. — the choice just won't be remembered.
  }
}

export function chosenVoice(): SpeechSynthesisVoice | null {
  const voices = englishVoices();
  const saved = savedVoiceUri();
  return voices.find((voice) => voice.voiceURI === saved) ?? voices[0] ?? null;
}

export function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  const voice = chosenVoice();
  if (voice) {
    try {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } catch {
      // Fall back to the browser's default voice rather than staying silent.
    }
  }
  utterance.rate = 0.92; // a touch slower so it's clear over kitchen noise
  utterance.pitch = 1;
  utterance.volume = 1;
  window.speechSynthesis.speak(utterance);
}

/** Calls `onChange` now and whenever the browser finishes loading its voice list. */
export function watchVoices(onChange: (voices: SpeechSynthesisVoice[]) => void) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return () => {};
  const update = () => onChange(englishVoices());
  update();
  window.speechSynthesis.addEventListener("voiceschanged", update);
  return () => window.speechSynthesis.removeEventListener("voiceschanged", update);
}
