export type MascotState = 'idle' | 'listening' | 'thinking' | 'singing' | 'celebrating';

export interface NoteStep {
  note: string; // e.g., "C4", "D#4", "F5", "REST"
  duration: number; // in seconds
}

export interface SongCandidate {
  id: string;
  title: string;
  artist: string;
  releaseYear: string;
  genre: string;
  confidence: number; // 0 - 100
  bpm: number;
  melodyMatchReason: string;
  rhythmMatchReason: string;
  lyricsOrVibeHint: string;
  iconicLyricLine: string;
  youtubeQuery: string;
  hookNotes?: NoteStep[];
  accentColor: string;
  moodTag: string;
  previewAudioUrl?: string; // Official 30s chorus highlight from iTunes API
  artworkUrl?: string; // Official album cover
}

export interface SavedSongItem {
  savedId: string;
  accountId: string; // e.g., "@huiju"
  savedAt: string; // e.g., "10월 16일 14:27"
  hummedMemo: string; // What the user hummed or hinted when they found this song
  song: SongCandidate;
}

export interface UserAccount {
  accountId: string; // normalized handle e.g. "@huiju"
  displayName: string; // e.g. "희주 (Huiju)"
  avatarEmoji: string; // e.g. "🧸", "🎧", "✨"
  lastActiveAt: string;
}

export interface AnalysisResult {
  id: string;
  timestamp: string;
  userHummingSummary: {
    detectedBpm: number;
    pitchAccuracy: number; // 0 - 100
    rhythmStability: number; // 0 - 100
    hummedPhonetics: string;
    extractedNotes: NoteStep[];
    chaosLevel: '인간 축음기 💿' | '리듬 천재 그루브 🕺' | '영혼을 갈아넣은 추임새 🔥' | '음정 파괴 아티스트 ⚡';
    popboyComment: string;
    waveformPeaks: number[];
  };
  candidates: SongCandidate[];
  inferenceMode: 'gemini-live' | 'acoustic-hybrid';
  roundNumber?: number;
}
