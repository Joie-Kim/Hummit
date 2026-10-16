import React, { useState, useRef, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Mic,
  Square,
  Sparkles,
  Youtube,
  CheckCircle2,
  KeyRound,
  Music2,
  Disc3,
  Flame,
  Sliders,
  RefreshCw,
  Headphones,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  AudioLines,
  BookmarkCheck,
  Trash2,
  Share2,
  Clock,
  Cloud,
  UserPlus,
  Users,
  Check,
  Home,
  Compass,
  Library,
  ListMusic,
  Settings,
  Search,
  ChevronDown,
  Volume2,
  Radio,
} from 'lucide-react';
import {
  AnalysisResult,
  MascotState,
  NoteStep,
  SavedSongItem,
  SongCandidate,
  UserAccount,
} from './types';
import { PopboyMascot3D } from './components/PopboyMascot3D';
import { ShareCardModal } from './components/ShareCardModal';
import { soundEngine } from './services/synthService';
import {
  analyzeHummingWithGemini,
  getActiveApiKey,
  setActiveApiKey,
} from './services/geminiService';
import {
  fetchAccountSongsFromCloudDb,
  getActiveAccount,
  getCustomFirebaseUrl,
  getRegisteredAccounts,
  removeSongFromAccountCloudDb,
  saveSongToAccountCloudDb,
  setCustomFirebaseUrl,
  switchOrCreateAccount,
} from './services/cloudHistoryDb';

interface SpeechRecognitionAlternative {
  transcript: string;
}
interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionEvent {
  results: {
    [index: number]: SpeechRecognitionResult;
    length: number;
  };
}
interface WebkitSpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}

const RETRY_GENRE_CHIPS = [
  { label: '🇯🇵 J-POP / 시티팝 / 애니송', value: 'J-POP 일본 노래 시티팝 애니 OST' },
  { label: '🇰🇷 K-POP / 인디 / OST', value: 'K-POP 한국 아이돌 발라드 인디 드라마 OST' },
  { label: '🌎 팝송 / 빌보드 / R&B', value: 'Global Pop 미국 영국 팝송 빌보드 R&B' },
  { label: '🎸 밴드 / 록 / 어쿠스틱', value: '밴드 사운드 록 페스티벌 어쿠스틱 카페 음악' },
];

const AVATAR_EMOJIS = ['🧸', '🎤', '🎧', '💿', '🎸', '🐱', '✨', '🔥'];

interface TrendingHumSong {
  id: string;
  title: string;
  artist: string;
  releaseYear: string;
  genre: string;
  matchRate: number;
  humCountToday: string;
  humSampleText: string;
  badgeText: string;
  bpm: number;
  coverGradient: string;
  youtubeQuery: string;
}

const TRENDING_HUMMED_SONGS: TrendingHumSong[] = [
  {
    id: 'trend-1',
    title: 'Stay With Me (Mayonaka no Door)',
    artist: 'Miki Matsubara',
    releaseYear: '1979',
    genre: 'J-POP / City Pop',
    matchRate: 99,
    humCountToday: '1,420회 허밍',
    humSampleText: '스테이 위드 미~ 마요나카노 도아오 타타키~',
    badgeText: '🔥 오늘 가장 많이 찾은 시티팝',
    bpm: 112,
    coverGradient: 'from-[#F5B041] via-[#FF5722] to-[#7c2d12]',
    youtubeQuery: 'Miki Matsubara Stay With Me Mayonaka no Door Official',
  },
  {
    id: 'trend-2',
    title: 'Plastic Love',
    artist: 'Mariya Takeuchi',
    releaseYear: '1984',
    genre: 'City Pop / Retro Funk',
    matchRate: 97,
    humCountToday: '980회 허밍',
    humSampleText: '딴 따라라라~ 츠메타이 쿠츠오 카쿠시테~',
    badgeText: '💿 LP 바 단골 질문곡',
    bpm: 102,
    coverGradient: 'from-[#FFB300] via-[#d97706] to-[#312e81]',
    youtubeQuery: 'Mariya Takeuchi Plastic Love Official MV',
  },
  {
    id: 'trend-3',
    title: 'Hype Boy',
    artist: 'NewJeans (뉴진스)',
    releaseYear: '2022',
    genre: 'K-POP / R&B Pop',
    matchRate: 98,
    humCountToday: '1,190회 허밍',
    humSampleText: '코즈 아이 노 왓 유 라이크 보이~ 유아 마이~',
    badgeText: '⚡ 3초 컷 매칭 1위',
    bpm: 100,
    coverGradient: 'from-[#FF5722] via-[#F5B041] to-[#1e1b4b]',
    youtubeQuery: 'NewJeans Hype Boy Official MV',
  },
  {
    id: 'trend-4',
    title: '밤양갱 (Bam Yang Gang)',
    artist: 'BIBI (비비)',
    releaseYear: '2024',
    genre: 'K-Indie / Waltz Pop',
    matchRate: 96,
    humCountToday: '860회 허밍',
    humSampleText: '달디달고 달디달고 달디단 밤양갱~',
    badgeText: '☕ 카페 BGM 단골 허밍',
    bpm: 124,
    coverGradient: 'from-[#d97706] via-[#b45309] to-[#27272a]',
    youtubeQuery: 'BIBI Bam Yang Gang Official MV',
  },
  {
    id: 'trend-5',
    title: 'IDOL (아이돌)',
    artist: 'YOASOBI',
    releaseYear: '2023',
    genre: 'J-POP / Anime OST',
    matchRate: 98,
    humCountToday: '1,050회 허밍',
    humSampleText: '무테키노 에가오데 아라스 미디어~',
    badgeText: '✨ 고음 허밍 챌린지',
    bpm: 166,
    coverGradient: 'from-[#FF5722] via-[#e11d48] to-[#3b0764]',
    youtubeQuery: 'YOASOBI Idol Official Music Video',
  },
  {
    id: 'trend-6',
    title: '예뻤어 (You Were Beautiful)',
    artist: 'DAY6 (데이식스)',
    releaseYear: '2017',
    genre: 'K-Band / Rock Ballad',
    matchRate: 97,
    humCountToday: '910회 허밍',
    humSampleText: '예뻤어~ 날 바라봐 주던 그 눈빛~',
    badgeText: '🎸 페스티벌 떼창 검색곡',
    bpm: 86,
    coverGradient: 'from-[#F5B041] via-[#ca8a04] to-[#1e293b]',
    youtubeQuery: 'DAY6 You Were Beautiful Official MV',
  },
];

type NavSectionId = 'home' | 'explore' | 'library' | 'mymusic' | 'playlists' | 'settings';

export function App() {
  const [mascotState, setMascotState] = useState<MascotState>('idle');
  const [activeAccent, setActiveAccent] = useState<string>('#F5B041');
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null);
  const [currentSongTitle, setCurrentSongTitle] = useState<string>('Miki Matsubara - Stay With Me');
  const [currentSongArtist, setCurrentSongArtist] = useState<string>('Hummit Studio Ready');
  const [currentSongArtwork, setCurrentSongArtwork] = useState<string | undefined>(undefined);
  const [activeNav, setActiveNav] = useState<NavSectionId>('home');

  // Multi-Account & Cloud DB States
  const [activeAccount, setActiveAccount] = useState<UserAccount>(() => getActiveAccount());
  const [accountsList, setAccountsList] = useState<UserAccount[]>(() => getRegisteredAccounts());
  const [foundSongsHistory, setFoundSongsHistory] = useState<SavedSongItem[]>([]);
  const [isDbSyncing, setIsDbSyncing] = useState<boolean>(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState<boolean>(false);
  const [newAccountHandle, setNewAccountHandle] = useState<string>('');
  const [newAccountName, setNewAccountName] = useState<string>('');
  const [newAccountEmoji, setNewAccountEmoji] = useState<string>('🧸');
  const [firebaseUrlDraft, setFirebaseUrlDraft] = useState<string>(() => getCustomFirebaseUrl());

  // Recording states
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordSeconds, setRecordSeconds] = useState<number>(0);
  const [hintInput, setHintInput] = useState<string>('');
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [liveDetectedNotes, setLiveDetectedNotes] = useState<NoteStep[]>([]);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);

  // Inference & Re-search states
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [selectedSong, setSelectedSong] = useState<SongCandidate | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [excludedTitles, setExcludedTitles] = useState<string[]>([]);
  const [retryGenreFilter, setRetryGenreFilter] = useState<string>('');
  const [retryExtraHint, setRetryExtraHint] = useState<string>('');
  const [roundNumber, setRoundNumber] = useState<number>(1);

  // Trending song preview cache (fetched on demand or mount from iTunes Search API)
  const [trendingMediaMap, setTrendingMediaMap] = useState<
    Record<string, { previewUrl?: string; artworkUrl?: string }>
  >({});
  const [loadingTrendingId, setLoadingTrendingId] = useState<string | null>(null);

  // API Key Modal
  const [isKeyModalOpen, setIsKeyModalOpen] = useState<boolean>(false);
  const [apiKeyDraft, setApiKeyDraft] = useState<string>(getActiveApiKey());

  // Refs for recording & live pitch tracking
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const pitchIntervalRef = useRef<number | null>(null);
  const speechRecRef = useRef<WebkitSpeechRecognitionInstance | null>(null);
  const lastAudioBlobRef = useRef<Blob | null>(null);
  const liveNotesAccumRef = useRef<NoteStep[]>([]);

  // Section refs for smooth sidebar navigation
  const heroSectionRef = useRef<HTMLDivElement | null>(null);
  const resultsSectionRef = useRef<HTMLDivElement | null>(null);
  const trendingSectionRef = useRef<HTMLDivElement | null>(null);
  const librarySectionRef = useRef<HTMLDivElement | null>(null);

  // Load songs for activeAccount from Cloud DB / IndexedDB whenever account changes
  useEffect(() => {
    let cancelled = false;
    setIsDbSyncing(true);
    fetchAccountSongsFromCloudDb(activeAccount.accountId).then((items) => {
      if (!cancelled) {
        setFoundSongsHistory(items);
        setIsDbSyncing(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [activeAccount.accountId]);

  // Pre-fetch artwork & 30s preview URLs for Trending Hummed Songs from Apple iTunes Search API
  useEffect(() => {
    let cancelled = false;
    TRENDING_HUMMED_SONGS.forEach(async (item) => {
      try {
        const term = encodeURIComponent(`${item.artist} ${item.title}`);
        const res = await fetch(`https://itunes.apple.com/search?term=${term}&entity=song&limit=1`);
        if (!res.ok) return;
        const data = await res.json();
        const hit = data?.results?.[0];
        if (hit && !cancelled) {
          setTrendingMediaMap((prev) => ({
            ...prev,
            [item.id]: {
              previewUrl: hit.previewUrl,
              artworkUrl: hit.artworkUrl100
                ? String(hit.artworkUrl100).replace('100x100bb', '400x400bb')
                : undefined,
            },
          }));
        }
      } catch {
        // Ignore network errors
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (pitchIntervalRef.current) window.clearInterval(pitchIntervalRef.current);
      soundEngine.stopMicrophone();
      soundEngine.stopPlayback();
    };
  }, []);

  const handleNavClick = (id: NavSectionId) => {
    setActiveNav(id);
    if (id === 'home') {
      heroSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else if (id === 'explore') {
      trendingSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else if (id === 'library' || id === 'playlists') {
      librarySectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else if (id === 'mymusic') {
      if (recordedAudioUrl) {
        handlePlayMyRecording();
      } else {
        heroSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    } else if (id === 'settings') {
      setIsAccountModalOpen(true);
    }
  };

  const handleSelectAccount = async (accountId: string) => {
    soundEngine.stopPlayback();
    setCurrentPlayingId(null);
    const updatedAcc = switchOrCreateAccount(accountId);
    setActiveAccount(updatedAcc);
    setAccountsList(getRegisteredAccounts());
    setIsDbSyncing(true);
    const songs = await fetchAccountSongsFromCloudDb(updatedAcc.accountId);
    setFoundSongsHistory(songs);
    setIsDbSyncing(false);
  };

  const handleCreateOrSwitchNewAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccountHandle.trim()) return;
    const created = switchOrCreateAccount(
      newAccountHandle,
      newAccountName.trim() || undefined,
      newAccountEmoji
    );
    setActiveAccount(created);
    setAccountsList(getRegisteredAccounts());
    setNewAccountHandle('');
    setNewAccountName('');
    setIsAccountModalOpen(false);
    setIsDbSyncing(true);
    const songs = await fetchAccountSongsFromCloudDb(created.accountId);
    setFoundSongsHistory(songs);
    setIsDbSyncing(false);
  };

  const handleSaveFirebaseUrl = async () => {
    setCustomFirebaseUrl(firebaseUrlDraft);
    setIsDbSyncing(true);
    const songs = await fetchAccountSongsFromCloudDb(activeAccount.accountId);
    setFoundSongsHistory(songs);
    setIsDbSyncing(false);
  };

  const handleMascotBoop = () => {
    // Purely visual reaction (flapping ears & bounce in 3D) without artificial synth sound
    if (mascotState === 'idle') {
      setMascotState('celebrating');
      setTimeout(() => {
        setMascotState((prev) => (prev === 'celebrating' ? 'idle' : prev));
      }, 900);
    }
  };

  const startRecording = async () => {
    setMicError(null);
    soundEngine.stopPlayback();
    setCurrentPlayingId(null);
    setLiveTranscript('');
    setLiveDetectedNotes([]);
    liveNotesAccumRef.current = [];
    setExcludedTitles([]);
    setRoundNumber(1);
    setRetryGenreFilter('');
    setRetryExtraHint('');

    try {
      const stream = await soundEngine.startMicrophone();
      audioChunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        lastAudioBlobRef.current = audioBlob;

        if (recordedAudioUrl) {
          URL.revokeObjectURL(recordedAudioUrl);
        }
        const newAudioUrl = URL.createObjectURL(audioBlob);
        setRecordedAudioUrl(newAudioUrl);

        soundEngine.stopMicrophone();
        await runInference({
          audioBlob,
          detectedPhonetics: liveTranscript,
          liveNotes: liveNotesAccumRef.current,
          isRetry: false,
        });
      };

      const WinWithSpeech = window as unknown as {
        SpeechRecognition?: new () => WebkitSpeechRecognitionInstance;
        webkitSpeechRecognition?: new () => WebkitSpeechRecognitionInstance;
      };
      const SpeechRec = WinWithSpeech.SpeechRecognition || WinWithSpeech.webkitSpeechRecognition;
      if (SpeechRec) {
        try {
          const recognition = new SpeechRec();
          recognition.lang = 'ko-KR';
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.onresult = (event: SpeechRecognitionEvent) => {
            let text = '';
            for (let i = 0; i < event.results.length; i++) {
              text += event.results[i][0].transcript + ' ';
            }
            setLiveTranscript(text.trim());
          };
          recognition.onerror = () => {};
          recognition.start();
          speechRecRef.current = recognition;
        } catch {
          // Ignore if unsupported
        }
      }

      recorder.start();
      setIsRecording(true);
      setMascotState('listening');
      setRecordSeconds(0);

      pitchIntervalRef.current = window.setInterval(() => {
        const detected = soundEngine.detectLivePitchNote();
        if (detected) {
          const prev = liveNotesAccumRef.current[liveNotesAccumRef.current.length - 1];
          if (!prev || prev.note !== detected) {
            const nextStep: NoteStep = { note: detected, duration: 0.28 };
            liveNotesAccumRef.current = [...liveNotesAccumRef.current.slice(-15), nextStep];
            setLiveDetectedNotes([...liveNotesAccumRef.current]);
          } else {
            prev.duration = Math.min(0.65, Number((prev.duration + 0.14).toFixed(2)));
          }
        }
      }, 220);

      timerRef.current = window.setInterval(() => {
        setRecordSeconds((prev) => {
          if (prev >= 12) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error(err);
      setMicError('마이크 권한을 허용해 주세요! 브라우저 주소창 왼쪽의 마이크 아이콘을 확인해 주세요.');
      setMascotState('idle');
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (pitchIntervalRef.current) {
      window.clearInterval(pitchIntervalRef.current);
      pitchIntervalRef.current = null;
    }
    if (speechRecRef.current) {
      try {
        speechRecRef.current.stop();
      } catch {
        // ignore
      }
      speechRecRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const runInference = async (opts: {
    audioBlob: Blob | null;
    detectedPhonetics?: string;
    detectedBpm?: number;
    liveNotes?: NoteStep[];
    isRetry?: boolean;
    customExcluded?: string[];
    customGenreFilter?: string;
    customHint?: string;
  }) => {
    setIsAnalyzing(true);
    setMascotState('thinking');
    setSelectedSong(null);

    const freqBuf = new Uint8Array(64);
    soundEngine.getFrequencyData(freqBuf);
    const peaks = Array.from({ length: 14 }, (_, i) => {
      const val = freqBuf[i * 3] / 255;
      return Math.max(
        0.25,
        Math.min(0.98, val > 0.05 ? val : 0.32 + Math.sin(i * 1.4) * 0.35 + Math.random() * 0.25)
      );
    });

    const nextRound = opts.isRetry ? roundNumber + 1 : 1;
    setRoundNumber(nextRound);

    const combinedHint = [hintInput, opts.customHint || ''].filter(Boolean).join(' / ');

    try {
      const res = await analyzeHummingWithGemini({
        audioBlob: opts.audioBlob,
        hintText: combinedHint,
        detectedPhonetics: opts.detectedPhonetics || liveTranscript,
        detectedBpm: opts.detectedBpm || 118,
        liveExtractedNotes: opts.liveNotes || liveDetectedNotes,
        waveformPeaks: peaks,
        excludedTitles: opts.customExcluded ?? excludedTitles,
        genreFilter: opts.customGenreFilter ?? retryGenreFilter,
        roundNumber: nextRound,
      });

      setAnalysisResult(res);
      setIsAnalyzing(false);

      if (res.candidates.length > 0) {
        const topSong = res.candidates[0];
        setActiveAccent('#F5B041');
        setCurrentSongTitle(topSong.title);
        setCurrentSongArtist(topSong.artist);
        setCurrentSongArtwork(topSong.artworkUrl);

        setTimeout(() => {
          resultsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 150);

        if (topSong.previewAudioUrl) {
          handlePlayRealPreview(topSong);
        } else {
          setMascotState('idle');
        }
      } else {
        setMascotState('idle');
      }
    } catch (e) {
      console.error(e);
      setIsAnalyzing(false);
      setMascotState('idle');
    }
  };

  // Re-infer without re-recording!
  const handleRetryInference = (overrideGenre?: string) => {
    if (!analysisResult) return;
    soundEngine.stopPlayback();
    setCurrentPlayingId(null);

    const currentTitles = analysisResult.candidates.map((c) => c.title);
    const updatedExcluded = Array.from(new Set([...excludedTitles, ...currentTitles]));
    setExcludedTitles(updatedExcluded);

    const genreToUse = overrideGenre !== undefined ? overrideGenre : retryGenreFilter;
    if (overrideGenre !== undefined) {
      setRetryGenreFilter(overrideGenre);
    }

    runInference({
      audioBlob: lastAudioBlobRef.current,
      detectedPhonetics: analysisResult.userHummingSummary.hummedPhonetics,
      detectedBpm: analysisResult.userHummingSummary.detectedBpm,
      liveNotes: analysisResult.userHummingSummary.extractedNotes,
      isRetry: true,
      customExcluded: updatedExcluded,
      customGenreFilter: genreToUse,
      customHint: retryExtraHint,
    });
  };

  // Play User's Own Recorded Humming Audio (Real Voice Only!)
  const handlePlayMyRecording = () => {
    if (!recordedAudioUrl) return;
    const playId = 'my-recorded-voice';
    if (currentPlayingId === playId && soundEngine.getIsPlaying()) {
      soundEngine.stopPlayback();
      setCurrentPlayingId(null);
      setMascotState('idle');
      return;
    }
    setCurrentPlayingId(playId);
    setCurrentSongTitle('내 흥얼거림 녹음 원본');
    setCurrentSongArtist(activeAccount.accountId);
    setMascotState('listening');
    soundEngine.playAudioUrl(recordedAudioUrl, () => {
      setCurrentPlayingId(null);
      setMascotState('idle');
    });
  };

  // Play Official 30s Highlight Audio from iTunes
  const handlePlayRealPreview = (song: SongCandidate) => {
    if (!song.previewAudioUrl) return;
    const playId = `preview-${song.id}`;
    if (currentPlayingId === playId && soundEngine.getIsPlaying()) {
      soundEngine.stopPlayback();
      setCurrentPlayingId(null);
      setMascotState('idle');
      return;
    }
    setActiveAccent('#F5B041');
    setCurrentSongTitle(song.title);
    setCurrentSongArtist(song.artist);
    setCurrentSongArtwork(song.artworkUrl);
    setCurrentPlayingId(playId);
    setMascotState('singing');
    soundEngine.playAudioUrl(song.previewAudioUrl, () => {
      setCurrentPlayingId(null);
      setMascotState((prev) => (prev === 'celebrating' ? 'celebrating' : 'idle'));
    });
  };

  // Play Trending Song 30s Official Preview
  const handlePlayTrendingSong = async (item: TrendingHumSong) => {
    const playId = `trending-${item.id}`;
    if (currentPlayingId === playId && soundEngine.getIsPlaying()) {
      soundEngine.stopPlayback();
      setCurrentPlayingId(null);
      setMascotState('idle');
      return;
    }

    let media = trendingMediaMap[item.id];
    if (!media?.previewUrl) {
      setLoadingTrendingId(item.id);
      try {
        const term = encodeURIComponent(`${item.artist} ${item.title}`);
        const res = await fetch(`https://itunes.apple.com/search?term=${term}&entity=song&limit=1`);
        const data = await res.json();
        const hit = data?.results?.[0];
        if (hit?.previewUrl) {
          media = {
            previewUrl: hit.previewUrl,
            artworkUrl: hit.artworkUrl100
              ? String(hit.artworkUrl100).replace('100x100bb', '400x400bb')
              : undefined,
          };
          setTrendingMediaMap((prev) => ({ ...prev, [item.id]: media! }));
        }
      } catch {
        // ignore
      }
      setLoadingTrendingId(null);
    }

    if (media?.previewUrl) {
      setActiveAccent('#F5B041');
      setCurrentSongTitle(item.title);
      setCurrentSongArtist(item.artist);
      setCurrentSongArtwork(media.artworkUrl);
      setCurrentPlayingId(playId);
      setMascotState('singing');
      soundEngine.playAudioUrl(media.previewUrl, () => {
        setCurrentPlayingId(null);
        setMascotState('idle');
      });
    }
  };

  // Confirm "이 노래가 맞아!" -> Save to Active Account's Cloud DB + Open Share Card
  const handleConfirmMatch = async (song: SongCandidate) => {
    setSelectedSong(song);
    setActiveAccent('#F5B041');
    setCurrentSongTitle(song.title);
    setCurrentSongArtist(song.artist);
    setCurrentSongArtwork(song.artworkUrl);
    setMascotState('celebrating');

    if (song.previewAudioUrl && currentPlayingId !== `preview-${song.id}`) {
      soundEngine.playAudioUrl(song.previewAudioUrl, () => {
        setCurrentPlayingId(null);
        setMascotState('idle');
      });
      setCurrentPlayingId(`preview-${song.id}`);
    }

    const memoText =
      hintInput.trim() ||
      analysisResult?.userHummingSummary.hummedPhonetics ||
      '흥얼거림으로 찾은 노래';

    setIsDbSyncing(true);
    const updatedHistory = await saveSongToAccountCloudDb(
      activeAccount.accountId,
      song,
      memoText
    );
    setFoundSongsHistory(updatedHistory);
    setIsDbSyncing(false);

    confetti({
      particleCount: 90,
      spread: 75,
      origin: { y: 0.62 },
      colors: ['#F5B041', '#FFB300', '#FF5722', '#F9F9FB'],
    });

    setTimeout(() => {
      setIsShareModalOpen(true);
    }, 320);
  };

  // Play saved history song preview
  const handlePlayHistoryItem = (item: SavedSongItem) => {
    if (!item.song.previewAudioUrl) return;
    const playId = `history-${item.savedId}`;
    if (currentPlayingId === playId && soundEngine.getIsPlaying()) {
      soundEngine.stopPlayback();
      setCurrentPlayingId(null);
      setMascotState('idle');
      return;
    }
    setActiveAccent('#F5B041');
    setCurrentSongTitle(item.song.title);
    setCurrentSongArtist(item.song.artist);
    setCurrentSongArtwork(item.song.artworkUrl);
    setCurrentPlayingId(playId);
    setMascotState('singing');
    soundEngine.playAudioUrl(item.song.previewAudioUrl, () => {
      setCurrentPlayingId(null);
      setMascotState('idle');
    });
  };

  const handleDeleteHistoryItem = async (id: string) => {
    if (currentPlayingId === `history-${id}`) {
      soundEngine.stopPlayback();
      setCurrentPlayingId(null);
      setMascotState('idle');
    }
    setIsDbSyncing(true);
    const next = await removeSongFromAccountCloudDb(activeAccount.accountId, id);
    setFoundSongsHistory(next);
    setIsDbSyncing(false);
  };

  const handleSaveApiKey = () => {
    setActiveApiKey(apiKeyDraft);
    setIsKeyModalOpen(false);
  };

  const handleToggleGlobalPlayer = () => {
    if (currentPlayingId && soundEngine.getIsPlaying()) {
      soundEngine.stopPlayback();
      setCurrentPlayingId(null);
      setMascotState('idle');
      return;
    }
    if (analysisResult?.candidates?.[0]?.previewAudioUrl) {
      handlePlayRealPreview(analysisResult.candidates[0]);
      return;
    }
    if (foundSongsHistory[0]?.song?.previewAudioUrl) {
      handlePlayHistoryItem(foundSongsHistory[0]);
      return;
    }
    handlePlayTrendingSong(TRENDING_HUMMED_SONGS[0]);
  };

  const topCandidate = analysisResult?.candidates?.[0] || null;

  return (
    <div className="relative min-h-screen bg-[#121216] text-[#F9F9FB] overflow-x-hidden pb-28 selection:bg-[#F5B041] selection:text-[#121216]">
      {/* Warm Music Studio Ambient Background Glow (#121216 + Honey Amber & Coral Radial Glow) */}
      <div className="studio-ambient-bg">
        <div className="studio-orb studio-orb-amber" />
        <div className="studio-orb studio-orb-coral" />
        <div className="studio-orb studio-orb-warm" />
      </div>
      <div className="fixed inset-0 studio-grid-bg pointer-events-none z-0 opacity-60" />

      {/* =====================================================================
          1. TOP HEADER / NAVBAR (Hummit Logo + Bear Icon + Studio Controls)
         ===================================================================== */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#121216]/80 backdrop-blur-2xl">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Left: Hummit Brand Logo with Cute Bear Icon Wearing Headphones */}
          <div className="flex items-center gap-6">
            <a
              href="#top"
              onClick={(e) => {
                e.preventDefault();
                handleNavClick('home');
              }}
              className="flex items-center gap-3 group"
            >
              {/* Golden Equalizer + Cute Headphone Bear Emblem */}
              <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-br from-[#F5B041] via-[#FFB300] to-[#FF5722] p-[1.5px] shadow-[0_0_24px_rgba(245,176,65,0.4)] group-hover:scale-105 transition-transform">
                <div className="w-full h-full rounded-[14px] bg-[#181512] flex items-center justify-center relative">
                  <span className="text-lg select-none" role="img" aria-label="Hummit Bear">
                    🧸
                  </span>
                  <Headphones className="w-3.5 h-3.5 text-[#F5B041] absolute -top-1 -right-1 drop-shadow" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-end gap-[2px] h-4 mr-0.5">
                  <span className="w-1 h-2.5 rounded-full bg-[#F5B041] animate-pulse" />
                  <span className="w-1 h-4 rounded-full bg-[#FFB300]" />
                  <span className="w-1 h-3 rounded-full bg-[#FF5722] animate-pulse" />
                  <span className="w-1 h-1.5 rounded-full bg-[#F5B041]" />
                </div>
                <div>
                  <span className="font-display font-black text-xl tracking-tight text-[#F9F9FB]">
                    Hummit
                  </span>
                  <span className="ml-1.5 text-[11px] font-semibold text-[#F5B041] bg-[#F5B041]/10 border border-[#F5B041]/30 px-1.5 py-0.5 rounded-md">
                    허밋
                  </span>
                </div>
              </div>
            </a>

            {/* Desktop Quick Navigation Links */}
            <nav className="hidden xl:flex items-center gap-1 text-sm font-medium text-[#A0A0AB]">
              <button
                onClick={() => handleNavClick('home')}
                className={`px-3.5 py-1.5 rounded-xl transition ${
                  activeNav === 'home'
                    ? 'text-[#F5B041] bg-[#F5B041]/10 font-semibold'
                    : 'hover:text-[#F9F9FB] hover:bg-white/5'
                }`}
              >
                Studio 홈
              </button>
              <button
                onClick={() => handleNavClick('explore')}
                className={`px-3.5 py-1.5 rounded-xl transition ${
                  activeNav === 'explore'
                    ? 'text-[#F5B041] bg-[#F5B041]/10 font-semibold'
                    : 'hover:text-[#F9F9FB] hover:bg-white/5'
                }`}
              >
                오늘의 허밍 트렌드
              </button>
              <button
                onClick={() => handleNavClick('library')}
                className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                  activeNav === 'library'
                    ? 'text-[#F5B041] bg-[#F5B041]/10 font-semibold'
                    : 'hover:text-[#F9F9FB] hover:bg-white/5'
                }`}
              >
                <span>내 LP 보관함</span>
                <span className="px-1.5 py-0.2 rounded-full text-[11px] font-mono bg-[#F5B041]/20 text-[#F5B041]">
                  {foundSongsHistory.length}
                </span>
              </button>
            </nav>
          </div>

          {/* Center: Optional Lyric / Context Hint Input Bar */}
          <div className="hidden md:flex flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-[#F5B041] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={hintInput}
                onChange={(e) => setHintInput(e.target.value)}
                placeholder="기억나는 가사 조각이나 힌트 입력 (예: 스테이 위드 미, 카페 시티팝)..."
                className="w-full pl-10 pr-4 py-2 rounded-2xl bg-[#1E1E26]/80 border border-white/10 text-xs text-[#F9F9FB] placeholder:text-[#A0A0AB] focus:outline-none focus:border-[#F5B041]/60 transition"
              />
            </div>
          </div>

          {/* Right: Bear Account Switcher + Log In / Account Modal + Gemini API Key */}
          <div className="flex items-center gap-2.5">
            {/* Bear Account Pill (matching reference image top-right bear dropdown) */}
            <button
              onClick={() => setIsAccountModalOpen(true)}
              className="px-3 py-1.5 rounded-2xl bg-[#1E1E26]/90 hover:bg-[#282832] border border-white/10 hover:border-[#F5B041]/40 text-xs font-medium text-[#F9F9FB] flex items-center gap-2 transition"
              title="계정 전환 및 클라우드 DB 설정"
            >
              <span className="w-6 h-6 rounded-full bg-gradient-to-br from-[#F5B041] to-[#FF5722] flex items-center justify-center text-xs shadow-inner">
                {activeAccount.avatarEmoji}
              </span>
              <span className="font-mono font-bold text-[#F9F9FB]">{activeAccount.accountId}</span>
              <span className="px-1.5 py-0.5 rounded-full bg-[#F5B041]/15 text-[#F5B041] font-mono text-[10px]">
                {isDbSyncing ? '...' : `${foundSongsHistory.length}곡`}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-[#A0A0AB]" />
            </button>

            {/* Warm Amber Outlined "계정 전환 / Cloud DB" Button (like 'Log In' in reference image) */}
            <button
              onClick={() => setIsAccountModalOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-1.5 rounded-2xl border border-[#F5B041]/60 bg-[#F5B041]/10 hover:bg-[#F5B041]/20 text-[#F5B041] font-semibold text-xs shadow-[0_0_16px_rgba(245,176,65,0.2)] transition"
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>계정 전환</span>
            </button>

            {/* API Key Settings Button */}
            <button
              onClick={() => setIsKeyModalOpen(true)}
              className="p-2 rounded-2xl bg-[#1E1E26]/90 hover:bg-[#282832] border border-white/10 text-[#A0A0AB] hover:text-[#F5B041] transition"
              title="Gemini API Key 설정"
            >
              <KeyRound className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* =====================================================================
          MAIN STUDIO LAYOUT: LEFT SIDEBAR + MAIN STAGE
         ===================================================================== */}
      <div className="relative z-10 max-w-[1440px] mx-auto px-4 sm:px-6 pt-5 flex gap-6 items-start">
        {/* 2. LEFT STUDIO SIDEBAR (Inspired by Hummit Reference Mockup) */}
        <aside className="hidden lg:flex flex-col w-56 shrink-0 sticky top-20 hummit-glass rounded-3xl p-4 border border-white/10">
          <div className="px-3 py-2 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#A0A0AB]">
              HUMMIT STUDIO MENU
            </span>
          </div>

          <nav className="space-y-1">
            {[
              { id: 'home' as NavSectionId, label: 'Home', sub: '허밍 스튜디오', icon: Home },
              { id: 'explore' as NavSectionId, label: 'Explore', sub: '트렌딩 차트', icon: Compass },
              {
                id: 'library' as NavSectionId,
                label: 'Library',
                sub: `내 보관함 (${foundSongsHistory.length})`,
                icon: Library,
              },
              {
                id: 'mymusic' as NavSectionId,
                label: 'My Music',
                sub: recordedAudioUrl ? '내 녹음 재생' : '내 흥얼거림',
                icon: Headphones,
              },
              {
                id: 'playlists' as NavSectionId,
                label: 'Playlists',
                sub: '시티팝 & 카페 LP',
                icon: ListMusic,
              },
              {
                id: 'settings' as NavSectionId,
                label: 'Settings',
                sub: '클라우드 계정 설정',
                icon: Settings,
              },
            ].map((item) => {
              const IconComp = item.icon;
              const isActive = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-left transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-[#F5B041]/20 to-[#FF5722]/10 border border-[#F5B041]/40 text-[#F9F9FB] shadow-[0_0_20px_rgba(245,176,65,0.15)]'
                      : 'text-[#A0A0AB] hover:text-[#F9F9FB] hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <IconComp
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-[#F5B041]' : 'text-[#A0A0AB]'
                      }`}
                    />
                    <div className="truncate">
                      <div className="text-xs font-bold leading-tight">{item.label}</div>
                      <div className="text-[10px] text-[#A0A0AB] truncate">{item.sub}</div>
                    </div>
                  </div>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#F5B041]" />}
                </button>
              );
            })}
          </nav>

          {/* Studio Ambience Status Card inside Sidebar */}
          <div className="mt-6 pt-4 border-t border-white/10">
            <div className="p-3.5 rounded-2xl bg-[#121216]/80 border border-[#F5B041]/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-bold text-[#F5B041] flex items-center gap-1">
                  <Radio className="w-3 h-3 animate-pulse" />
                  STUDIO ENGINE
                </span>
                <span className="text-[10px] font-mono text-emerald-400">ONLINE</span>
              </div>
              <p className="text-[11px] text-[#A0A0AB] leading-relaxed">
                가사를 몰라도 <span className="text-[#F9F9FB] font-semibold">음정·리듬·발음</span>만으로
                K-POP, J-POP, 팝송 원곡 하이라이트를 찾아드려요.
              </p>
              <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-[#A0A0AB] pt-2 border-t border-white/5">
                <span>ACTIVE USER</span>
                <span className="text-[#F5B041] font-bold">{activeAccount.accountId}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* =====================================================================
            MAIN CONTENT COLUMN
           ===================================================================== */}
        <main className="flex-1 min-w-0 space-y-8">
          {/* 3. HERO SECTION & CENTRAL COZY TEDDY BEAR STUDIO */}
          <section ref={heroSectionRef} className="space-y-5">
            {/* Hero Title Banner */}
            <div className="text-center max-w-3xl mx-auto space-y-2.5 pt-1">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#1E1E26]/90 border border-[#F5B041]/30 text-[#F5B041] text-xs font-medium shadow-[0_0_20px_rgba(245,176,65,0.15)]">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Cozy Retro AI Humming Studio · Hummit (허밋)</span>
              </div>
              <h1 className="font-display font-black text-2xl sm:text-4xl lg:text-[42px] tracking-tight text-[#F9F9FB] leading-[1.18]">
                듣고 있는 멜로디,{' '}
                <span className="amber-gradient-text">웅얼거려도 다 알아들어요</span>
              </h1>
              <p className="text-xs sm:text-sm text-[#A0A0AB] max-w-xl mx-auto">
                카페나 길거리에서 흘러나온 노래, 가사 없이{' '}
                <span className="text-[#F9F9FB] font-medium">&ldquo;음음~ 따단~&rdquo;</span> 흥얼거리기만
                하세요. 허밋 베어가 원곡 LP와 30초 하이라이트를 즉시 찾아줍니다.
              </p>
            </div>

            {/* Central Studio Stage Container (3D Bear + Floating Glassmorphic Cards + Interactive Pulsing Mic CTA) */}
            <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-[#16151c] shadow-[0_24px_80px_rgba(0,0,0,0.65)]">
              {/* 3D Cozy Retro Music Studio Canvas */}
              <div className="relative h-[430px] sm:h-[500px] w-full">
                <PopboyMascot3D
                  state={mascotState}
                  activeAccentColor={activeAccent}
                  currentSongTitle={currentSongTitle}
                  onBoop={handleMascotBoop}
                />

                {/* Top-Left Floating Dark Frosted Glass Studio Card (Matching Reference Image) */}
                <div className="hidden sm:flex flex-col gap-2 absolute top-4 left-4 z-10 w-60 p-3.5 rounded-2xl hummit-glass border border-white/15 shadow-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#F5B041] font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#FF5722] animate-ping" />
                      {isRecording
                        ? 'LIVE MIC INPUT'
                        : isAnalyzing
                        ? 'AI ANALYZING...'
                        : 'STUDIO MONITOR'}
                    </span>
                    <span className="text-[10px] font-mono text-[#A0A0AB]">
                      {isRecording ? `${recordSeconds}s / 12s` : '48kHz STEREO'}
                    </span>
                  </div>

                  {/* Mini Golden Equalizer Bars */}
                  <div className="flex items-end gap-1 h-7 pt-1">
                    {[0.45, 0.85, 0.6, 1, 0.75, 0.5, 0.9, 0.65, 0.95, 0.55, 0.8, 0.4, 0.7, 0.88].map(
                      (h, idx) => (
                        <div
                          key={idx}
                          className={`flex-1 rounded-full transition-all duration-300 ${
                            isRecording || currentPlayingId
                              ? 'bg-gradient-to-t from-[#FF5722] to-[#F5B041] eq-bar-anim'
                              : 'bg-[#F5B041]/40'
                          }`}
                          style={{
                            height: `${Math.round(h * 100)}%`,
                            animationDelay: `${idx * 0.07}s`,
                          }}
                        />
                      )
                    )}
                  </div>

                  <div className="text-[11px] text-[#F9F9FB] font-medium truncate">
                    {isRecording
                      ? liveTranscript || '마이크로 멜로디를 듣고 있어요...'
                      : liveDetectedNotes.length > 0
                      ? `감지된 음계: ${liveDetectedNotes
                          .slice(-5)
                          .map((n) => n.note)
                          .join(' → ')}`
                      : '허밋 베어를 클릭하면 귀를 쫑긋해요 🧸'}
                  </div>
                </div>

                {/* Top-Right Floating Dark Frosted Glass Vinyl Card (Matching Reference Image) */}
                <div className="hidden sm:flex items-center gap-3 absolute top-4 right-4 z-10 w-64 p-3 rounded-2xl hummit-glass border border-white/15 shadow-xl">
                  <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-[#F5B041] to-[#FF5722] p-0.5 shrink-0">
                    {topCandidate?.artworkUrl || currentSongArtwork ? (
                      <img
                        src={topCandidate?.artworkUrl || currentSongArtwork}
                        alt={currentSongTitle}
                        className="w-full h-full object-cover rounded-[10px]"
                      />
                    ) : (
                      <div className="w-full h-full rounded-[10px] bg-[#121216] flex items-center justify-center">
                        <Disc3 className="w-6 h-6 text-[#F5B041] animate-spin-slow" />
                      </div>
                    )}
                    <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded-full bg-[#FF5722] text-[9px] font-mono font-bold text-white shadow">
                      {topCandidate ? `${topCandidate.confidence}%` : 'LP'}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-mono text-[#F5B041] uppercase">
                      {topCandidate ? 'BEST STUDIO MATCH' : 'NOW IN STUDIO'}
                    </div>
                    <div className="text-xs font-bold text-[#F9F9FB] truncate">
                      {topCandidate ? topCandidate.title : currentSongTitle}
                    </div>
                    <div className="text-[11px] text-[#A0A0AB] truncate">
                      {topCandidate ? topCandidate.artist : currentSongArtist}
                    </div>
                  </div>
                </div>

                {/* Bottom Overlay Inside Studio Stage: Interactive Pulsing Humming Search Button & Live Equalizer */}
                <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-[#121216] via-[#121216]/90 to-transparent pt-10 pb-5 px-4 sm:px-8 flex flex-col items-center">
                  {/* Live Audio Spectrum Waveform / Equalizer Bars Around Button when Recording or Analyzing */}
                  {(isRecording || isAnalyzing) && (
                    <div className="mb-3 flex flex-col items-center gap-1.5 animate-fadeIn">
                      <div className="flex items-end justify-center gap-1.5 h-8 px-4">
                        {Array.from({ length: 24 }).map((_, idx) => (
                          <span
                            key={idx}
                            className="w-1.5 rounded-full bg-gradient-to-t from-[#FF5722] via-[#F5B041] to-[#FFF3B0] eq-bar-anim"
                            style={{
                              height: `${12 + ((idx * 17) % 20)}px`,
                              animationDelay: `${idx * 0.05}s`,
                            }}
                          />
                        ))}
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
                        <span className="px-2.5 py-0.5 rounded-full bg-[#FF5722]/20 border border-[#FF5722]/40 text-[#FF5722] font-mono font-bold">
                          {isRecording ? `● REC ${recordSeconds}초 / 12초` : '✨ AI 멜로디 대조 중...'}
                        </span>
                        {liveDetectedNotes.length > 0 && (
                          <span className="px-2.5 py-0.5 rounded-full bg-[#F5B041]/15 border border-[#F5B041]/30 text-[#F5B041] font-mono text-xs">
                            음계: {liveDetectedNotes.slice(-6).map((n) => n.note).join(' · ')}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Interactive Humming Search Button Row */}
                  <div className="flex flex-wrap items-center justify-center gap-3.5">
                    {!isRecording ? (
                      <button
                        onClick={startRecording}
                        disabled={isAnalyzing}
                        className="group relative inline-flex items-center gap-3.5 px-8 py-4 rounded-full bg-gradient-to-r from-[#F5B041] via-[#FFB300] to-[#FF5722] text-[#121216] font-display font-black text-base sm:text-lg tracking-tight ring-4 ring-amber-500/30 animate-pulse hover:animate-none hover:scale-[1.03] active:scale-[0.99] transition-all shadow-[0_0_40px_rgba(245,176,65,0.55)] disabled:opacity-50"
                      >
                        <span className="w-10 h-10 rounded-full bg-[#121216] text-[#F5B041] flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                          <Mic className="w-5 h-5" />
                        </span>
                        <div className="text-left">
                          <div className="leading-none">
                            {isAnalyzing ? '허밋 AI가 곡을 찾는 중...' : '흥얼거려서 노래 찾기'}
                          </div>
                          <div className="text-[11px] font-sans font-bold text-[#121216]/80 mt-0.5">
                            클릭 후 4~12초 동안 멜로디나 가사를 불러주세요
                          </div>
                        </div>
                      </button>
                    ) : (
                      <button
                        onClick={stopRecording}
                        className="inline-flex items-center gap-3.5 px-8 py-4 rounded-full bg-gradient-to-r from-[#FF5722] to-[#e11d48] text-white font-display font-black text-base sm:text-lg ring-4 ring-[#FF5722]/40 animate-pulse shadow-[0_0_45px_rgba(255,87,34,0.65)] hover:scale-[1.02] transition"
                      >
                        <span className="w-10 h-10 rounded-full bg-black/30 flex items-center justify-center">
                          <Square className="w-4 h-4 fill-current" />
                        </span>
                        <div className="text-left">
                          <div className="leading-none">녹음 완료하고 바로 분석하기 ({recordSeconds}s)</div>
                          <div className="text-[11px] font-sans font-medium text-white/85 mt-0.5">
                            충분히 흥얼거렸다면 눌러서 결과를 확인하세요
                          </div>
                        </div>
                      </button>
                    )}

                    {/* Replay My Recorded Humming Voice Button */}
                    {recordedAudioUrl && !isRecording && (
                      <button
                        onClick={handlePlayMyRecording}
                        className={`px-4 py-3.5 rounded-full border text-xs font-bold flex items-center gap-2 transition ${
                          currentPlayingId === 'my-recorded-voice'
                            ? 'bg-[#F5B041] text-[#121216] border-[#F5B041] shadow-[0_0_24px_rgba(245,176,65,0.45)]'
                            : 'bg-[#1E1E26]/90 hover:bg-[#282832] text-[#F9F9FB] border-white/15'
                        }`}
                      >
                        <Headphones className="w-4 h-4" />
                        <span>
                          {currentPlayingId === 'my-recorded-voice'
                            ? '내 목소리 재생 중 (정지)'
                            : '내 흥얼거림 다시 듣기'}
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Mobile / Quick Hint Input Bar right below Mic Button */}
                  <div className="mt-3 w-full max-w-lg flex md:hidden">
                    <input
                      type="text"
                      value={hintInput}
                      onChange={(e) => setHintInput(e.target.value)}
                      placeholder="기억나는 가사나 힌트 (예: 스테이 위드 미, 여자 보컬)..."
                      className="w-full px-4 py-2 rounded-2xl bg-[#1E1E26]/90 border border-white/10 text-xs text-[#F9F9FB] placeholder:text-[#A0A0AB] focus:outline-none focus:border-[#F5B041]"
                    />
                  </div>

                  {micError && (
                    <div className="mt-3 px-4 py-2 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs">
                      {micError}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* =====================================================================
              4. MATCH RESULT PREVIEW CARDS (Retro LP Vinyl Sleeve & Re-Inference)
             ===================================================================== */}
          {analysisResult && (
            <section ref={resultsSectionRef} className="space-y-6 animate-fadeIn">
              {/* Top Humming Telemetry Banner */}
              <div className="hummit-glass rounded-3xl p-5 sm:p-6 border border-[#F5B041]/30">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-3 py-1 rounded-full bg-[#FF5722]/20 border border-[#FF5722]/40 text-[#FF5722] text-xs font-mono font-bold">
                        ROUND #{roundNumber} MATCH RESULT
                      </span>
                      <span className="px-3 py-1 rounded-full bg-[#F5B041]/15 border border-[#F5B041]/30 text-[#F5B041] text-xs font-bold">
                        {analysisResult.userHummingSummary.chaosLevel}
                      </span>
                      <span className="text-xs font-mono text-[#A0A0AB]">
                        BPM {analysisResult.userHummingSummary.detectedBpm} · 음정 정확도{' '}
                        {analysisResult.userHummingSummary.pitchAccuracy}%
                      </span>
                    </div>
                    <h2 className="text-lg sm:text-xl font-extrabold text-[#F9F9FB]">
                      🧸 허밋 베어의 판독: &ldquo;{analysisResult.userHummingSummary.popboyComment}&rdquo;
                    </h2>
                    <p className="text-xs text-[#A0A0AB]">
                      채보된 허밍 발음:{' '}
                      <span className="text-[#F5B041] font-mono font-semibold">
                        &ldquo;{analysisResult.userHummingSummary.hummedPhonetics}&rdquo;
                      </span>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    {recordedAudioUrl && (
                      <button
                        onClick={handlePlayMyRecording}
                        className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 border transition ${
                          currentPlayingId === 'my-recorded-voice'
                            ? 'bg-[#F5B041] text-[#121216] border-[#F5B041]'
                            : 'bg-white/5 hover:bg-white/10 text-[#F9F9FB] border-white/15'
                        }`}
                      >
                        <Headphones className="w-4 h-4 text-[#F5B041]" />
                        <span>내가 부른 흥얼거림 원본 듣기</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleRetryInference()}
                      disabled={isAnalyzing}
                      className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#F5B041]/20 to-[#FF5722]/20 hover:from-[#F5B041]/30 hover:to-[#FF5722]/30 border border-[#F5B041]/50 text-[#F5B041] text-xs font-bold flex items-center gap-2 transition disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
                      <span>다른 후보 3곡 다시 추론하기 (재녹음 불필요)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Retro LP Vinyl Sleeve Match Cards Grid (3 Candidates) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {analysisResult.candidates.map((song, idx) => {
                  const isPlayingThis = currentPlayingId === `preview-${song.id}`;
                  const isTopMatch = idx === 0;

                  return (
                    <div
                      key={song.id}
                      className={`group relative rounded-3xl p-5 transition-all flex flex-col justify-between hummit-glass ${
                        isTopMatch
                          ? 'border-2 border-[#F5B041]/70 shadow-[0_0_40px_rgba(245,176,65,0.2)]'
                          : 'border border-white/10 hover:border-[#F5B041]/40'
                      }`}
                    >
                      <div>
                        {/* Card Top Row: Rank + Match Accuracy Percentage Badge ("98% Match!") */}
                        <div className="flex items-center justify-between gap-2 mb-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-mono font-bold ${
                              isTopMatch
                                ? 'bg-[#F5B041] text-[#121216]'
                                : 'bg-white/10 text-[#F9F9FB]'
                            }`}
                          >
                            {isTopMatch ? '🏆 BEST LP MATCH #1' : `CANDIDATE #${idx + 1}`}
                          </span>

                          <span className="px-3 py-1 rounded-full bg-gradient-to-r from-[#FF5722] to-[#F5B041] text-[#121216] font-mono font-black text-xs shadow-[0_0_16px_rgba(255,87,34,0.4)]">
                            {song.confidence}% Match!
                          </span>
                        </div>

                        {/* Retro LP Vinyl Sleeve Artwork Showcase */}
                        <div className="relative flex items-center mb-4 py-2">
                          {/* Album Sleeve Cover Art */}
                          <div className="relative z-10 w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border border-white/20 shadow-2xl bg-[#181820] shrink-0">
                            {song.artworkUrl ? (
                              <img
                                src={song.artworkUrl}
                                alt={song.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-[#F5B041]/40 via-[#FF5722]/30 to-[#121216] flex flex-col items-center justify-center p-2 text-center">
                                <Music2 className="w-8 h-8 text-[#F5B041] mb-1" />
                                <span className="text-[10px] font-mono text-[#F9F9FB] line-clamp-1">
                                  {song.artist}
                                </span>
                              </div>
                            )}

                            {/* Quick Play Overlay Button on Album Cover */}
                            {song.previewAudioUrl && (
                              <button
                                onClick={() => handlePlayRealPreview(song)}
                                className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                                title="원곡 30초 하이라이트 재생"
                              >
                                <span className="w-11 h-11 rounded-full bg-[#F5B041] text-[#121216] flex items-center justify-center shadow-lg">
                                  {isPlayingThis ? (
                                    <Pause className="w-5 h-5 fill-current" />
                                  ) : (
                                    <Play className="w-5 h-5 fill-current ml-0.5" />
                                  )}
                                </span>
                              </button>
                            )}
                          </div>

                          {/* Peeking Spinning LP Vinyl Record Behind Sleeve */}
                          <div
                            className={`relative -ml-10 w-28 h-28 sm:w-32 sm:h-32 rounded-full vinyl-disc-surface flex items-center justify-center transition-transform duration-500 ${
                              isPlayingThis
                                ? 'translate-x-4 animate-spin-slow'
                                : 'group-hover:translate-x-2'
                            }`}
                          >
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#F5B041] to-[#FF5722] flex items-center justify-center border-2 border-[#121216]">
                              <div className="w-2.5 h-2.5 rounded-full bg-[#121216]" />
                            </div>
                          </div>

                          {/* Genre & BPM Meta next to Vinyl */}
                          <div className="ml-3 min-w-0 flex-1 space-y-1">
                            <span className="inline-block px-2 py-0.5 rounded-md bg-[#F5B041]/15 text-[#F5B041] font-mono text-[10px] font-bold">
                              {song.genre}
                            </span>
                            <div className="text-[11px] font-mono text-[#A0A0AB]">
                              {song.releaseYear} · {song.bpm} BPM
                            </div>
                            <div className="text-[11px] text-[#F9F9FB] font-medium line-clamp-2">
                              📍 {song.moodTag}
                            </div>
                          </div>
                        </div>

                        {/* Song Title & Artist */}
                        <div className="mb-3">
                          <h3 className="font-display font-black text-xl text-[#F9F9FB] leading-snug line-clamp-1">
                            {song.title}
                          </h3>
                          <p className="text-sm font-semibold text-[#F5B041] line-clamp-1">
                            {song.artist}
                          </p>
                        </div>

                        {/* Lyric Snippet Box */}
                        <div className="p-3 rounded-2xl bg-[#121216]/80 border border-white/10 mb-3">
                          <div className="text-[10px] font-mono text-[#A0A0AB] mb-0.5">
                            MATCHED LYRIC HIGHLIGHT
                          </div>
                          <div className="text-xs text-[#F9F9FB] font-medium line-clamp-2">
                            &ldquo;{song.iconicLyricLine}&rdquo;
                          </div>
                        </div>

                        {/* AI 3-Step Reasoning Summary */}
                        <div className="space-y-1.5 mb-4 text-xs text-[#A0A0AB] bg-white/[0.03] p-3 rounded-2xl border border-white/5">
                          <div>
                            <span className="text-[#F5B041] font-bold">• 멜로디: </span>
                            {song.melodyMatchReason}
                          </div>
                          <div>
                            <span className="text-[#FF5722] font-bold">• 리듬/템포: </span>
                            {song.rhythmMatchReason}
                          </div>
                          <div>
                            <span className="text-[#F9F9FB] font-bold">• 발음/힌트: </span>
                            {song.lyricsOrVibeHint}
                          </div>
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="space-y-2 pt-2 border-t border-white/10">
                        <div className="grid grid-cols-2 gap-2">
                          {song.previewAudioUrl ? (
                            <button
                              onClick={() => handlePlayRealPreview(song)}
                              className={`py-2.5 px-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                                isPlayingThis
                                  ? 'bg-[#FF5722] text-white shadow-[0_0_20px_rgba(255,87,34,0.4)]'
                                  : 'bg-[#F5B041]/20 hover:bg-[#F5B041]/30 border border-[#F5B041]/50 text-[#F5B041]'
                              }`}
                            >
                              {isPlayingThis ? (
                                <>
                                  <Pause className="w-3.5 h-3.5 fill-current" />
                                  <span>하이라이트 정지</span>
                                </>
                              ) : (
                                <>
                                  <Play className="w-3.5 h-3.5 fill-current" />
                                  <span>30초 원곡 미리듣기</span>
                                </>
                              )}
                            </button>
                          ) : (
                            <a
                              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(
                                song.youtubeQuery
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="py-2.5 px-3 rounded-2xl bg-white/10 hover:bg-white/15 text-[#F9F9FB] font-bold text-xs flex items-center justify-center gap-1.5 transition"
                            >
                              <Youtube className="w-4 h-4 text-[#FF5722]" />
                              <span>원곡 바로 듣기</span>
                            </a>
                          )}

                          <a
                            href={`https://www.youtube.com/results?search_query=${encodeURIComponent(
                              song.youtubeQuery
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="py-2.5 px-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-[#F9F9FB] font-semibold text-xs flex items-center justify-center gap-1.5 transition"
                          >
                            <Youtube className="w-4 h-4 text-[#FF5722]" />
                            <span>YouTube 원곡</span>
                          </a>
                        </div>

                        <button
                          onClick={() => handleConfirmMatch(song)}
                          className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#F5B041] via-[#FFB300] to-[#FF5722] text-[#121216] font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-[0_0_24px_rgba(245,176,65,0.3)] hover:opacity-95 transition"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>이 노래가 맞아! (내 보관함 저장 & LP 카드 공유)</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Re-Inference Panel ("찾는 노래가 후보 3개 중에 없나요?") */}
              <div className="hummit-glass rounded-3xl p-5 sm:p-6 border border-white/10 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-extrabold text-[#F9F9FB] flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-[#F5B041]" />
                      <span>찾는 노래가 후보 3곡 중에 없나요? 다시 부르지 말고 AI에게 재추론시켜 보세요!</span>
                    </h3>
                    <p className="text-xs text-[#A0A0AB] mt-0.5">
                      방금 녹음된 흥얼거림을 그대로 유지한 채, 이전 후보({excludedTitles.length}곡)를 제외하고 새로운 후보를 탐색합니다.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {RETRY_GENRE_CHIPS.map((chip) => {
                    const active = retryGenreFilter === chip.value;
                    return (
                      <button
                        key={chip.label}
                        onClick={() => handleRetryInference(chip.value)}
                        disabled={isAnalyzing}
                        className={`px-3.5 py-2 rounded-2xl text-xs font-bold border transition ${
                          active
                            ? 'bg-[#F5B041] text-[#121216] border-[#F5B041]'
                            : 'bg-[#121216]/70 hover:bg-white/10 text-[#F9F9FB] border-white/10'
                        }`}
                      >
                        {chip.label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5">
                  <input
                    type="text"
                    value={retryExtraHint}
                    onChange={(e) => setRetryExtraHint(e.target.value)}
                    placeholder="추가 힌트가 있다면 입력해 주세요 (예: 80년대 일본 여자 가수, 드라마 OST, 빠른 템포)"
                    className="flex-1 px-4 py-2.5 rounded-2xl bg-[#121216]/90 border border-white/10 text-xs text-[#F9F9FB] placeholder:text-[#A0A0AB] focus:outline-none focus:border-[#F5B041]"
                  />
                  <button
                    onClick={() => handleRetryInference()}
                    disabled={isAnalyzing}
                    className="px-6 py-2.5 rounded-2xl bg-[#F5B041] hover:bg-[#FFB300] text-[#121216] font-extrabold text-xs flex items-center justify-center gap-2 shrink-0 transition disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
                    <span>다른 후보 3곡 다시 추론하기</span>
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* =====================================================================
              5. TRENDING & RECENT HUMMED SONGS CAROUSEL / GRID
             ===================================================================== */}
          <section ref={trendingSectionRef} className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[#FF5722] uppercase">
                  <Flame className="w-4 h-4" />
                  <span>TRENDING HUMMED TRACKS TODAY</span>
                </div>
                <h2 className="font-display font-black text-xl sm:text-2xl text-[#F9F9FB] mt-0.5">
                  오늘 유저들이 가장 많이 흥얼거린 인기곡
                </h2>
              </div>
              <p className="text-xs text-[#A0A0AB]">
                카드를 클릭하면 실제 원곡 30초 하이라이트가 스튜디오에서 즉시 재생됩니다
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {TRENDING_HUMMED_SONGS.map((item) => {
                const media = trendingMediaMap[item.id];
                const isPlaying = currentPlayingId === `trending-${item.id}`;
                const isLoading = loadingTrendingId === item.id;

                return (
                  <div
                    key={item.id}
                    className={`group rounded-3xl p-4 hummit-glass hummit-card-hover border transition-all flex flex-col justify-between gap-3 ${
                      isPlaying ? 'border-[#F5B041]' : 'border-white/10'
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      {/* Retro Vinyl Sleeve Thumbnail */}
                      <button
                        onClick={() => handlePlayTrendingSong(item)}
                        className="relative w-20 h-20 rounded-2xl overflow-hidden shrink-0 border border-white/15 shadow-lg group/btn"
                        title="원곡 30초 하이라이트 듣기"
                      >
                        {media?.artworkUrl ? (
                          <img
                            src={media.artworkUrl}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover/btn:scale-105 transition-transform"
                          />
                        ) : (
                          <div
                            className={`w-full h-full bg-gradient-to-br ${item.coverGradient} flex items-center justify-center`}
                          >
                            <Disc3 className="w-8 h-8 text-[#F9F9FB]/90 animate-spin-slow" />
                          </div>
                        )}
                        <div
                          className={`absolute inset-0 bg-black/45 flex items-center justify-center transition-opacity ${
                            isPlaying ? 'opacity-100' : 'opacity-0 group-hover/btn:opacity-100'
                          }`}
                        >
                          <span className="w-9 h-9 rounded-full bg-[#F5B041] text-[#121216] flex items-center justify-center shadow">
                            {isLoading ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : isPlaying ? (
                              <Pause className="w-4 h-4 fill-current" />
                            ) : (
                              <Play className="w-4 h-4 fill-current ml-0.5" />
                            )}
                          </span>
                        </div>
                      </button>

                      {/* Song Info & Match Badge */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1.5 mb-1">
                          <span className="px-2 py-0.5 rounded-full bg-[#F5B041]/15 text-[#F5B041] font-mono text-[10px] font-bold truncate">
                            {item.badgeText}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-[#FF5722]/20 text-[#FF5722] font-mono text-[10px] font-extrabold shrink-0">
                            {item.matchRate}% Match
                          </span>
                        </div>

                        <h3 className="font-display font-bold text-base text-[#F9F9FB] truncate">
                          {item.title}
                        </h3>
                        <p className="text-xs font-semibold text-[#F5B041] truncate">
                          {item.artist}{' '}
                          <span className="text-[#A0A0AB] font-normal">· {item.releaseYear}</span>
                        </p>

                        <div className="mt-2 px-2.5 py-1.5 rounded-xl bg-[#121216]/75 border border-white/5 text-[11px] text-[#A0A0AB] truncate">
                          🎙️ &ldquo;{item.humSampleText}&rdquo;
                        </div>
                      </div>
                    </div>

                    {/* Bottom Meta & Quick Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[11px]">
                      <span className="font-mono text-[#A0A0AB]">
                        {item.genre} · <strong className="text-[#F9F9FB]">{item.humCountToday}</strong>
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handlePlayTrendingSong(item)}
                          className={`px-3 py-1 rounded-xl font-bold transition flex items-center gap-1 ${
                            isPlaying
                              ? 'bg-[#FF5722] text-white'
                              : 'bg-[#F5B041]/15 hover:bg-[#F5B041]/25 text-[#F5B041]'
                          }`}
                        >
                          {isPlaying ? (
                            <>
                              <Pause className="w-3 h-3 fill-current" />
                              <span>재생 중</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3 h-3 fill-current" />
                              <span>30초 듣기</span>
                            </>
                          )}
                        </button>
                        <a
                          href={`https://www.youtube.com/results?search_query=${encodeURIComponent(
                            item.youtubeQuery
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-[#A0A0AB] hover:text-[#F9F9FB] transition"
                          title="YouTube에서 원곡 보기"
                        >
                          <Youtube className="w-3.5 h-3.5 text-[#FF5722]" />
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* =====================================================================
              6. PER-ACCOUNT CLOUD DB ARCHIVE ("내가 찾은 노래 LP 보관함")
             ===================================================================== */}
          <section ref={librarySectionRef} className="space-y-4">
            <div className="hummit-glass rounded-3xl p-5 sm:p-6 border border-white/10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[#F5B041]">
                    <BookmarkCheck className="w-4 h-4" />
                    <span>CLOUD LP ARCHIVE // 계정별 내가 찾은 노래 히스토리</span>
                  </div>
                  <h2 className="font-display font-black text-xl sm:text-2xl text-[#F9F9FB] mt-0.5 flex items-center gap-2">
                    <span>
                      {activeAccount.avatarEmoji} {activeAccount.displayName} ({activeAccount.accountId})님의 보관함
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-[#F5B041]/20 text-[#F5B041]">
                      {foundSongsHistory.length}곡
                    </span>
                  </h2>
                </div>

                {/* Quick Account Switcher Pills */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {accountsList.map((acc) => {
                    const isCurr = acc.accountId === activeAccount.accountId;
                    return (
                      <button
                        key={acc.accountId}
                        onClick={() => handleSelectAccount(acc.accountId)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 border transition ${
                          isCurr
                            ? 'bg-[#F5B041] text-[#121216] border-[#F5B041]'
                            : 'bg-[#121216]/80 hover:bg-white/10 text-[#A0A0AB] border-white/10'
                        }`}
                      >
                        <span>{acc.avatarEmoji}</span>
                        <span>{acc.accountId}</span>
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setIsAccountModalOpen(true)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 border border-white/10 text-[#F5B041] flex items-center gap-1 transition"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+ 계정 추가</span>
                  </button>
                </div>
              </div>

              {foundSongsHistory.length === 0 ? (
                <div className="py-12 px-4 text-center rounded-2xl bg-[#121216]/60 border border-white/5 space-y-2">
                  <Disc3 className="w-10 h-10 text-[#F5B041]/60 mx-auto animate-spin-slow" />
                  <div className="text-sm font-bold text-[#F9F9FB]">
                    아직 {activeAccount.accountId} 계정에 저장된 노래가 없어요
                  </div>
                  <p className="text-xs text-[#A0A0AB] max-w-md mx-auto">
                    위 마이크 버튼을 눌러 노래를 흥얼거린 뒤 &ldquo;이 노래가 맞아!&rdquo; 버튼을 누르면
                    카페나 길거리에서 찾은 노래들이 이 계정의 클라우드 보관함에 차곡차곡 기록됩니다.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {foundSongsHistory.map((item) => {
                    const isPlaying = currentPlayingId === `history-${item.savedId}`;
                    return (
                      <div
                        key={item.savedId}
                        className="p-3.5 rounded-2xl bg-[#121216]/80 border border-white/10 hover:border-[#F5B041]/40 flex items-center justify-between gap-3 transition"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-[#1E1E26] border border-white/15 shrink-0">
                            {item.song.artworkUrl ? (
                              <img
                                src={item.song.artworkUrl}
                                alt={item.song.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#F5B041] to-[#FF5722]">
                                <Disc3 className="w-6 h-6 text-[#121216]" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-sm text-[#F9F9FB] truncate">
                                {item.song.title}
                              </span>
                              <span className="px-1.5 py-0.2 rounded bg-[#FF5722]/20 text-[#FF5722] font-mono text-[10px] font-bold">
                                {item.song.confidence}%
                              </span>
                            </div>
                            <div className="text-xs text-[#F5B041] truncate">
                              {item.song.artist} · {item.song.releaseYear}
                            </div>
                            <div className="text-[11px] text-[#A0A0AB] truncate flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3 shrink-0" />
                              <span className="truncate">
                                &ldquo;{item.hummedMemo}&rdquo;
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {item.song.previewAudioUrl && (
                            <button
                              onClick={() => handlePlayHistoryItem(item)}
                              className={`p-2.5 rounded-xl border transition ${
                                isPlaying
                                  ? 'bg-[#F5B041] text-[#121216] border-[#F5B041]'
                                  : 'bg-white/5 hover:bg-white/10 text-[#F5B041] border-white/10'
                              }`}
                              title="30초 하이라이트 듣기"
                            >
                              {isPlaying ? (
                                <Pause className="w-4 h-4 fill-current" />
                              ) : (
                                <Play className="w-4 h-4 fill-current" />
                              )}
                            </button>
                          )}
                          <a
                            href={`https://www.youtube.com/results?search_query=${encodeURIComponent(
                              item.song.youtubeQuery
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[#FF5722] transition"
                            title="YouTube 원곡 열기"
                          >
                            <Youtube className="w-4 h-4" />
                          </a>
                          <button
                            onClick={() => handleDeleteHistoryItem(item.savedId)}
                            className="p-2.5 rounded-xl bg-white/5 hover:bg-red-500/20 border border-white/10 text-[#A0A0AB] hover:text-red-300 transition"
                            title="보관함에서 삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </main>
      </div>

      {/* =====================================================================
          7. BOTTOM STUDIO WAVEFORM PLAYER BAR (Matching Reference Mockup)
         ===================================================================== */}
      <footer className="fixed bottom-0 inset-x-0 z-30 border-t border-white/10 bg-[#121216]/90 backdrop-blur-2xl">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-20 flex items-center justify-between gap-4">
          {/* Left: Currently Loaded LP Track Info */}
          <div className="flex items-center gap-3 min-w-0 w-56 sm:w-72">
            <div className="relative w-12 h-12 rounded-2xl overflow-hidden bg-gradient-to-br from-[#F5B041] to-[#FF5722] p-0.5 shrink-0 shadow-[0_0_20px_rgba(245,176,65,0.3)]">
              {currentSongArtwork ? (
                <img
                  src={currentSongArtwork}
                  alt={currentSongTitle}
                  className="w-full h-full object-cover rounded-[14px]"
                />
              ) : (
                <div className="w-full h-full rounded-[14px] bg-[#121216] flex items-center justify-center">
                  <Disc3
                    className={`w-6 h-6 text-[#F5B041] ${
                      currentPlayingId ? 'animate-spin-slow' : ''
                    }`}
                  />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-bold text-[#F9F9FB] truncate">
                {currentSongTitle}
              </div>
              <div className="text-[11px] text-[#F5B041] truncate">{currentSongArtist}</div>
            </div>
          </div>

          {/* Center: Golden Play/Pause/Skip Controls + Full-Width Golden Audio Spectrum Waveform */}
          <div className="flex-1 flex items-center gap-4 max-w-3xl">
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handlePlayTrendingSong(TRENDING_HUMMED_SONGS[0])}
                className="p-2 rounded-full text-[#A0A0AB] hover:text-[#F9F9FB] hover:bg-white/5 transition hidden sm:inline-flex"
                title="이전 트랙"
              >
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                onClick={handleToggleGlobalPlayer}
                className="w-11 h-11 rounded-full bg-gradient-to-br from-[#F5B041] via-[#FFB300] to-[#FF5722] text-[#121216] flex items-center justify-center shadow-[0_0_24px_rgba(245,176,65,0.5)] hover:scale-105 transition"
                title="재생 / 일시정지"
              >
                {currentPlayingId ? (
                  <Pause className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                )}
              </button>
              <button
                onClick={() => handlePlayTrendingSong(TRENDING_HUMMED_SONGS[2])}
                className="p-2 rounded-full text-[#A0A0AB] hover:text-[#F9F9FB] hover:bg-white/5 transition hidden sm:inline-flex"
                title="다음 트랙"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            {/* Golden & Coral Audio Spectrum Waveform Scrubber (Matching Reference Image Bottom Bar) */}
            <div
              onClick={handleToggleGlobalPlayer}
              className="flex-1 flex items-center gap-[3px] h-10 px-3 rounded-2xl bg-[#1E1E26]/70 border border-white/5 cursor-pointer overflow-hidden"
              title="클릭하여 하이라이트 재생/정지"
            >
              {Array.from({ length: 48 }).map((_, i) => {
                const waveHeight =
                  18 + Math.round((Math.sin(i * 0.55) * 0.5 + 0.5) * 65);
                const isActiveBar = currentPlayingId !== null || i < 18;
                return (
                  <div
                    key={i}
                    className={`flex-1 rounded-full transition-all duration-300 ${
                      currentPlayingId
                        ? 'bg-gradient-to-t from-[#FF5722] via-[#F5B041] to-[#FFF3B0] eq-bar-anim'
                        : isActiveBar
                        ? 'bg-gradient-to-t from-[#FF5722]/80 to-[#F5B041]/90'
                        : 'bg-white/15'
                    }`}
                    style={{
                      height: `${waveHeight}%`,
                      animationDelay: `${(i % 12) * 0.06}s`,
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* Right: Studio Status & Share Button */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-1.5 text-xs font-mono text-[#A0A0AB]">
              <Volume2 className="w-4 h-4 text-[#F5B041]" />
              <span>30s PREVIEW</span>
            </div>
            {topCandidate && (
              <button
                onClick={() => {
                  setSelectedSong(topCandidate);
                  setIsShareModalOpen(true);
                }}
                className="px-3.5 py-2 rounded-2xl bg-[#F5B041]/15 hover:bg-[#F5B041]/25 border border-[#F5B041]/40 text-[#F5B041] text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>LP 카드 공유</span>
              </button>
            )}
          </div>
        </div>
      </footer>

      {/* =====================================================================
          MODALS: ACCOUNT / CLOUD DB MODAL, API KEY MODAL, SHARE STORY MODAL
         ===================================================================== */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fadeIn">
          <div className="w-full max-w-lg hummit-glass rounded-3xl p-6 border border-[#F5B041]/30 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#F5B041]" />
                <h3 className="text-lg font-extrabold text-[#F9F9FB]">
                  허밋 스튜디오 계정 전환 & 클라우드 DB
                </h3>
              </div>
              <button
                onClick={() => setIsAccountModalOpen(false)}
                className="text-xs text-[#A0A0AB] hover:text-[#F9F9FB] px-2.5 py-1 rounded-lg bg-white/5"
              >
                닫기
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono text-[#A0A0AB] uppercase">
                등록된 계정 선택 (계정별 독립 노래 보관함)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {accountsList.map((acc) => {
                  const active = acc.accountId === activeAccount.accountId;
                  return (
                    <button
                      key={acc.accountId}
                      onClick={() => handleSelectAccount(acc.accountId)}
                      className={`p-3 rounded-2xl border text-left flex items-center justify-between transition ${
                        active
                          ? 'bg-[#F5B041]/15 border-[#F5B041] text-[#F9F9FB]'
                          : 'bg-white/5 border-white/10 text-[#A0A0AB] hover:text-[#F9F9FB]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xl">{acc.avatarEmoji}</span>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-[#F9F9FB] truncate">
                            {acc.displayName}
                          </div>
                          <div className="text-[11px] font-mono text-[#F5B041] truncate">
                            {acc.accountId}
                          </div>
                        </div>
                      </div>
                      {active && <Check className="w-4 h-4 text-[#F5B041] shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <form
              onSubmit={handleCreateOrSwitchNewAccount}
              className="p-4 rounded-2xl bg-[#121216]/80 border border-white/10 space-y-3"
            >
              <div className="text-xs font-bold text-[#F5B041]">+ 새 계정 생성 및 전환</div>
              <div className="flex gap-1.5 flex-wrap">
                {AVATAR_EMOJIS.map((em) => (
                  <button
                    type="button"
                    key={em}
                    onClick={() => setNewAccountEmoji(em)}
                    className={`w-8 h-8 rounded-xl text-sm flex items-center justify-center border ${
                      newAccountEmoji === em
                        ? 'bg-[#F5B041]/25 border-[#F5B041]'
                        : 'bg-white/5 border-white/10'
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={newAccountHandle}
                  onChange={(e) => setNewAccountHandle(e.target.value)}
                  placeholder="계정 ID (예: @music_lover)"
                  className="px-3.5 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-[#F9F9FB] focus:outline-none focus:border-[#F5B041]"
                />
                <input
                  type="text"
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  placeholder="표시 이름 (예: 카페 디깅러)"
                  className="px-3.5 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-[#F9F9FB] focus:outline-none focus:border-[#F5B041]"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#F5B041] text-[#121216] font-extrabold text-xs hover:bg-[#FFB300] transition"
              >
                이 계정으로 시작하기
              </button>
            </form>

            {/* Optional Firebase Realtime DB Endpoint */}
            <div className="p-4 rounded-2xl bg-[#121216]/80 border border-white/10 space-y-2">
              <div className="text-xs font-bold text-[#F9F9FB] flex items-center gap-1.5">
                <Cloud className="w-3.5 h-3.5 text-[#F5B041]" />
                <span>경량 클라우드 DB (IndexedDB 기본 내장 + Firebase REST 연동 옵션)</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={firebaseUrlDraft}
                  onChange={(e) => setFirebaseUrlDraft(e.target.value)}
                  placeholder="https://your-project-default-rtdb.firebaseio.com (선택)"
                  className="flex-1 px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs font-mono text-[#F9F9FB] focus:outline-none focus:border-[#F5B041]"
                />
                <button
                  type="button"
                  onClick={handleSaveFirebaseUrl}
                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-[#F5B041]"
                >
                  저장
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fadeIn">
          <div className="w-full max-w-md hummit-glass rounded-3xl p-6 border border-[#F5B041]/30 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-[#F9F9FB] flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-[#F5B041]" />
                <span>Gemini API Key 설정</span>
              </h3>
              <button
                onClick={() => setIsKeyModalOpen(false)}
                className="text-xs text-[#A0A0AB] hover:text-[#F9F9FB]"
              >
                닫기
              </button>
            </div>
            <p className="text-xs text-[#A0A0AB]">
              기본 `.env` 키가 자동으로 연결되어 있으며, 원하는 경우 직접 키를 변경할 수 있습니다.
            </p>
            <input
              type="password"
              value={apiKeyDraft}
              onChange={(e) => setApiKeyDraft(e.target.value)}
              placeholder="AIzaSy... 또는 AQ..."
              className="w-full px-4 py-2.5 rounded-2xl bg-black/60 border border-white/15 text-xs font-mono text-[#F9F9FB] focus:outline-none focus:border-[#F5B041]"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsKeyModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/5 text-xs text-[#A0A0AB]"
              >
                취소
              </button>
              <button
                onClick={handleSaveApiKey}
                className="px-5 py-2 rounded-xl bg-[#F5B041] text-[#121216] font-extrabold text-xs"
              >
                저장하기
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedSong && analysisResult && (
        <ShareCardModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          song={selectedSong}
          analysis={analysisResult}
        />
      )}
    </div>
  );
}
export default App;
