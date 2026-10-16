import { SavedSongItem, SongCandidate, UserAccount } from '../types';

const ACTIVE_ACCOUNT_STORAGE_KEY = 'POPBOY_ACTIVE_ACCOUNT_V1';
const ACCOUNTS_LIST_STORAGE_KEY = 'POPBOY_ACCOUNTS_LIST_V1';
const ACCOUNT_SONGS_PREFIX = 'POPBOY_CLOUD_SONGS_V1_';
const LEGACY_STORAGE_KEY = 'POPBOY_FOUND_SONGS_ARCHIVE_V1';
const CUSTOM_FIREBASE_URL_KEY = 'POPBOY_FIREBASE_RTDB_URL_V1';

const IDB_NAME = 'PopboyCloudArchiveDB';
const IDB_VERSION = 1;
const IDB_STORE = 'account_songs';

const DEFAULT_ACCOUNTS: UserAccount[] = [
  {
    accountId: '@huiju',
    displayName: '희주 (My Archive)',
    avatarEmoji: '🧸',
    lastActiveAt: '방금 전',
  },
  {
    accountId: '@popboymp3',
    displayName: 'PopBoy 골방 크리에이터',
    avatarEmoji: '🎤',
    lastActiveAt: '오늘',
  },
  {
    accountId: '@cafe_digger',
    displayName: '성수동 카페 디깅러',
    avatarEmoji: '🎧',
    lastActiveAt: '오늘',
  },
];

export function normalizeAccountId(raw: string): string {
  const cleaned = raw.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_@ㄱ-ㅎㅏ-ㅣ가-힣.-]/g, '');
  if (!cleaned) return '@huiju';
  return cleaned.startsWith('@') ? cleaned : `@${cleaned}`;
}

export function getCustomFirebaseUrl(): string {
  try {
    return (localStorage.getItem(CUSTOM_FIREBASE_URL_KEY) || '').trim().replace(/\/+$/, '');
  } catch {
    return '';
  }
}

export function setCustomFirebaseUrl(url: string): void {
  try {
    const cleaned = url.trim().replace(/\/+$/, '');
    if (cleaned) {
      localStorage.setItem(CUSTOM_FIREBASE_URL_KEY, cleaned);
    } else {
      localStorage.removeItem(CUSTOM_FIREBASE_URL_KEY);
    }
  } catch {
    // ignore
  }
}

/**
 * Open browser IndexedDB store for durable per-account storage
 */
function openIndexedDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(IDB_NAME, IDB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE, { keyPath: 'accountId' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbGetAccountSongs(accountId: string): Promise<SavedSongItem[] | null> {
  const db = await openIndexedDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(accountId);
      req.onsuccess = () => {
        const result = req.result as { accountId: string; items: SavedSongItem[] } | undefined;
        resolve(result?.items || null);
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbSetAccountSongs(accountId: string, items: SavedSongItem[]): Promise<void> {
  const db = await openIndexedDb();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put({ accountId, items, updatedAt: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

/**
 * Optional Firebase Realtime Database REST Sync (if Firebase URL is provided)
 */
async function syncWithFirebaseRest(
  accountId: string,
  method: 'GET' | 'PUT',
  items?: SavedSongItem[]
): Promise<SavedSongItem[] | null> {
  const baseUrl = getCustomFirebaseUrl();
  if (!baseUrl) return null;

  const safeKey = encodeURIComponent(accountId.replace(/^@/, 'user_'));
  const endpoint = `${baseUrl}/popboy_accounts/${safeKey}/songs.json`;

  try {
    if (method === 'GET') {
      const res = await fetch(endpoint);
      if (!res.ok) return null;
      const data = await res.json();
      if (Array.isArray(data)) return data as SavedSongItem[];
      return [];
    } else {
      await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(items || []),
      });
      return items || [];
    }
  } catch {
    return null;
  }
}

/**
 * Enrich a song with official iTunes 30s preview & artwork if missing
 */
async function enrichSongPreviewIfNeeded(song: SongCandidate): Promise<SongCandidate> {
  if (song.previewAudioUrl && song.artworkUrl) return song;
  try {
    const query = encodeURIComponent(`${song.artist} ${song.title}`);
    const res = await fetch(`https://itunes.apple.com/search?term=${query}&entity=song&limit=1&country=KR`);
    if (!res.ok) return song;
    const data = await res.json();
    const match = data?.results?.[0];
    if (!match) return song;
    return {
      ...song,
      previewAudioUrl: match.previewUrl || song.previewAudioUrl,
      artworkUrl: match.artworkUrl100
        ? match.artworkUrl100.replace('100x100bb', '400x400bb')
        : song.artworkUrl,
    };
  } catch {
    return song;
  }
}

/**
 * Seed initial songs for @popboymp3 demo creator account and migrate legacy localStorage into @huiju
 */
async function ensureInitialSeedAndMigration(): Promise<void> {
  try {
    // 1. Migrate legacy single-user songs into @huiju if present
    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
    const huijuKey = `${ACCOUNT_SONGS_PREFIX}@huiju`;
    if (legacyRaw && !localStorage.getItem(huijuKey)) {
      const parsed = JSON.parse(legacyRaw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const migrated: SavedSongItem[] = parsed.map((item: SavedSongItem) => ({
          ...item,
          accountId: '@huiju',
        }));
        localStorage.setItem(huijuKey, JSON.stringify(migrated));
        await idbSetAccountSongs('@huiju', migrated);
      }
    }

    // 2. Seed @popboymp3 account with 1 creator pick if empty
    const popboyKey = `${ACCOUNT_SONGS_PREFIX}@popboymp3`;
    if (!localStorage.getItem(popboyKey)) {
      const sampleSong: SongCandidate = {
        id: 'seed-popboy-1',
        title: 'See You Again (feat. Kali Uchis)',
        artist: 'Tyler, The Creator',
        releaseYear: '2017',
        genre: 'Alternative R&B / Pop',
        confidence: 96,
        bpm: 79,
        melodyMatchReason: '후렴구 "Can I get a kiss?" 파트의 몽환적인 상승 멜로디 라인이 일치합니다.',
        rhythmMatchReason: '79 BPM의 레이드백 네오소울 그루브와 스네어 바운스가 동일합니다.',
        lyricsOrVibeHint: '@popboymp3 골방 라이브에서 자주 흥얼거리던 시그니처 칠(Chill) 바이브 트랙',
        iconicLyricLine: 'Can I get a kiss? And can you make it last forever?',
        youtubeQuery: 'Tyler The Creator See You Again Kali Uchis',
        accentColor: '#ffa940',
        moodTag: '#골방곰돌이애창곡 #핀터레스트감성',
      };
      const enriched = await enrichSongPreviewIfNeeded(sampleSong);
      const seededList: SavedSongItem[] = [
        {
          savedId: 'seed-popboy-item-1',
          accountId: '@popboymp3',
          savedAt: '골방 스튜디오 픽',
          hummedMemo: '흠흠~ 캔 아이 겟 어 키스~ 멜로디',
          song: enriched,
        },
      ];
      localStorage.setItem(popboyKey, JSON.stringify(seededList));
      await idbSetAccountSongs('@popboymp3', seededList);
    }
  } catch {
    // ignore seed errors
  }
}

export function getRegisteredAccounts(): UserAccount[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_LIST_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  localStorage.setItem(ACCOUNTS_LIST_STORAGE_KEY, JSON.stringify(DEFAULT_ACCOUNTS));
  return DEFAULT_ACCOUNTS;
}

export function getActiveAccount(): UserAccount {
  const accounts = getRegisteredAccounts();
  try {
    const activeId = localStorage.getItem(ACTIVE_ACCOUNT_STORAGE_KEY);
    if (activeId) {
      const found = accounts.find((a) => a.accountId === activeId);
      if (found) return found;
    }
  } catch {
    // ignore
  }
  return accounts[0];
}

export function switchOrCreateAccount(
  rawAccountId: string,
  displayName?: string,
  avatarEmoji = '🧸'
): UserAccount {
  const normalizedId = normalizeAccountId(rawAccountId);
  const accounts = getRegisteredAccounts();
  const existingIdx = accounts.findIndex((a) => a.accountId === normalizedId);

  let targetAccount: UserAccount;
  if (existingIdx >= 0) {
    targetAccount = {
      ...accounts[existingIdx],
      displayName: displayName?.trim() || accounts[existingIdx].displayName,
      avatarEmoji: avatarEmoji || accounts[existingIdx].avatarEmoji,
      lastActiveAt: '방금 전',
    };
    accounts[existingIdx] = targetAccount;
  } else {
    targetAccount = {
      accountId: normalizedId,
      displayName: displayName?.trim() || `${normalizedId.replace(/^@/, '')}님의 보관함`,
      avatarEmoji,
      lastActiveAt: '방금 전',
    };
    accounts.unshift(targetAccount);
  }

  try {
    localStorage.setItem(ACCOUNTS_LIST_STORAGE_KEY, JSON.stringify(accounts));
    localStorage.setItem(ACTIVE_ACCOUNT_STORAGE_KEY, targetAccount.accountId);
  } catch {
    // ignore
  }
  return targetAccount;
}

/**
 * Fetch saved songs for a specific accountId from Cloud REST / IndexedDB / LocalStorage
 */
export async function fetchAccountSongsFromCloudDb(accountId: string): Promise<SavedSongItem[]> {
  await ensureInitialSeedAndMigration();
  const normalized = normalizeAccountId(accountId);
  const localKey = `${ACCOUNT_SONGS_PREFIX}${normalized}`;

  // 1. Try Firebase Realtime DB REST if configured
  const remoteItems = await syncWithFirebaseRest(normalized, 'GET');
  if (remoteItems) {
    localStorage.setItem(localKey, JSON.stringify(remoteItems));
    await idbSetAccountSongs(normalized, remoteItems);
    return remoteItems;
  }

  // 2. Try IndexedDB
  const idbItems = await idbGetAccountSongs(normalized);
  if (idbItems && idbItems.length > 0) {
    localStorage.setItem(localKey, JSON.stringify(idbItems));
    return idbItems;
  }

  // 3. Fallback to localStorage partition
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        await idbSetAccountSongs(normalized, parsed);
        return parsed;
      }
    }
  } catch {
    // ignore
  }

  return [];
}

/**
 * Save a newly matched song to the active account's Cloud DB
 */
export async function saveSongToAccountCloudDb(
  accountId: string,
  song: SongCandidate,
  hummedMemo: string
): Promise<SavedSongItem[]> {
  const normalized = normalizeAccountId(accountId);
  const currentList = await fetchAccountSongsFromCloudDb(normalized);

  const now = new Date();
  const formattedDate = `${now.getMonth() + 1}월 ${now.getDate()}일 ${now.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;

  const newItem: SavedSongItem = {
    savedId: `cloud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    accountId: normalized,
    savedAt: formattedDate,
    hummedMemo: hummedMemo.trim() || '마이크 흥얼거림으로 찾은 노래',
    song,
  };

  // Deduplicate by title + artist within the same account
  const filtered = currentList.filter(
    (item) =>
      !(
        item.song.title.toLowerCase() === song.title.toLowerCase() &&
        item.song.artist.toLowerCase() === song.artist.toLowerCase()
      )
  );

  const updated = [newItem, ...filtered];
  const localKey = `${ACCOUNT_SONGS_PREFIX}${normalized}`;

  try {
    localStorage.setItem(localKey, JSON.stringify(updated));
  } catch {
    // ignore
  }
  await idbSetAccountSongs(normalized, updated);
  await syncWithFirebaseRest(normalized, 'PUT', updated);

  return updated;
}

/**
 * Remove a saved song from an account's Cloud DB
 */
export async function removeSongFromAccountCloudDb(
  accountId: string,
  savedId: string
): Promise<SavedSongItem[]> {
  const normalized = normalizeAccountId(accountId);
  const currentList = await fetchAccountSongsFromCloudDb(normalized);
  const updated = currentList.filter((item) => item.savedId !== savedId);
  const localKey = `${ACCOUNT_SONGS_PREFIX}${normalized}`;

  try {
    localStorage.setItem(localKey, JSON.stringify(updated));
  } catch {
    // ignore
  }
  await idbSetAccountSongs(normalized, updated);
  await syncWithFirebaseRest(normalized, 'PUT', updated);

  return updated;
}
