/** Voice types only. Actual Voice IDs are configured on the Render backend.
 * Never ship a third-party API key in the Expo app.
 */
export type VoiceProfile = 'weather' | 'astrology';
export const VOICE_STYLES = {
  weather: { stability: 0.60, similarity_boost: 0.80, style: 0.10, use_speaker_boost: true },
  astrology: { stability: 0.52, similarity_boost: 0.78, style: 0.24, use_speaker_boost: true },
} as const;
