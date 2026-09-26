/** Public ElevenLabs voice identifiers. Never store the ElevenLabs API key in the mobile app. */
export const VOICE_IDS = {
  weather: 'TLSC2qq8RlDdm7tETUHz',
  astrology: 'LYfSi2g3Frvxg50fRl91',
} as const;
export type VoiceProfile = keyof typeof VOICE_IDS;
export const VOICE_STYLES = {
  weather: { stability: 0.60, similarity_boost: 0.80, style: 0.10, use_speaker_boost: true },
  astrology: { stability: 0.52, similarity_boost: 0.78, style: 0.24, use_speaker_boost: true },
} as const;
