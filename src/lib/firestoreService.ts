import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  getDocs, 
  deleteDoc, 
  query, 
  orderBy, 
  onSnapshot,
  Unsubscribe,
  serverTimestamp,
  disableNetwork,
  enableNetwork
} from 'firebase/firestore';
import { db, auth } from './firebase';
import firebaseConfigJson from '../../firebase-applet-config.json';
import { JournalReflection, UserProfile, Scrapbook } from '../types';
import { idbSet, idbGet, idbDelete, idbClearGuestEntries } from './idbStorage';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Checks if an error is a Firestore quota exhaustion limit error
 */
export function isQuotaExceededError(err: unknown): boolean {
  if (!err) return false;
  const msg = err instanceof Error ? err.message : String(err);
  const code = (err as any)?.code;
  return (
    code === 'resource-exhausted' ||
    msg.includes('resource-exhausted') ||
    msg.includes('Quota limit exceeded') ||
    msg.includes('Quota exceeded') ||
    msg.includes('Free daily write units') ||
    msg.includes('Free daily read units')
  );
}

// Clear legacy global quota flag from previous projects
try {
  localStorage.removeItem('firestore_daily_write_quota_exceeded_timestamp');
} catch {}

// Project-specific state tracking whether daily quota is reached
const LS_QUOTA_KEY = `firestore_quota_exceeded_${firebaseConfigJson.projectId}`;

function checkInitialQuotaExceeded(): boolean {
  try {
    const raw = localStorage.getItem(LS_QUOTA_KEY);
    if (!raw || raw === 'false') return false;
    const recordedTime = parseInt(raw, 10);
    // Quota resets daily. If flagged within the last 24 hours on THIS project, consider quota still exceeded.
    if (!isNaN(recordedTime) && Date.now() - recordedTime < 24 * 60 * 60 * 1000) {
      return true;
    }
  } catch {}
  // Default to healthy for newly connected projects
  return false;
}

let isDailyQuotaExceeded = checkInitialQuotaExceeded();
const quotaListeners = new Set<(exceeded: boolean) => void>();

// Ensure network is enabled for healthy projects, or suspended if quota actually reached
if (isDailyQuotaExceeded) {
  try {
    disableNetwork(db).catch(() => {});
  } catch {}
} else {
  try {
    enableNetwork(db).catch(() => {});
  } catch {}
}

export function getQuotaExceededState(): boolean {
  return isDailyQuotaExceeded;
}

export function setQuotaExceededState(exceeded: boolean): void {
  if (exceeded) {
    try {
      localStorage.setItem(LS_QUOTA_KEY, Date.now().toString());
      disableNetwork(db).catch(() => {});
    } catch {}
  } else {
    try {
      localStorage.setItem(LS_QUOTA_KEY, 'false');
      enableNetwork(db).catch(() => {});
    } catch {}
  }

  if (isDailyQuotaExceeded !== exceeded) {
    isDailyQuotaExceeded = exceeded;
    quotaListeners.forEach(listener => listener(exceeded));
  }
}

export async function retryCloudSync(): Promise<boolean> {
  try {
    await enableNetwork(db);
    // If a user is signed in, test a small ping write to check if daily write quota actually reset
    if (auth.currentUser?.uid) {
      const pingRef = doc(db, 'users', auth.currentUser.uid, 'system', 'quota_ping');
      await setDoc(pingRef, { ping: Date.now() }, { merge: true });
    }
    localStorage.setItem(LS_QUOTA_KEY, 'false');
    isDailyQuotaExceeded = false;
    quotaListeners.forEach(listener => listener(false));
    return true;
  } catch (err) {
    if (isQuotaExceededError(err)) {
      setQuotaExceededState(true);
      return false;
    }
    console.warn('Could not re-enable Firestore network or quota still active:', err);
    setQuotaExceededState(true);
    return false;
  }
}

export function subscribeQuotaExceeded(listener: (exceeded: boolean) => void): () => void {
  quotaListeners.add(listener);
  listener(isDailyQuotaExceeded);
  return () => quotaListeners.delete(listener);
}

/**
 * Local Storage & IndexedDB Dual Fallback Cache
 * Guarantees zero data loss even when base64 audio/images exceed localStorage limits.
 */
const LS_REFLECTIONS = (uid: string) => `craft_reflections_${uid}`;
const LS_SCRAPBOOKS = (uid: string) => `craft_scrapbooks_${uid}`;
const LS_INITIALIZED = (uid: string) => `has_initialized_scrapbooks_${uid}`;

// In-memory runtime cache to guarantee immediate synchronous retrieval
const memoryReflectionsCache: Record<string, JournalReflection[]> = {};

// Local subscriber registry to keep local and guest UI reactively updated on mutations
type LocalReflectionsListener = (reflections: JournalReflection[]) => void;
const localReflectionsListeners: Record<string, Set<LocalReflectionsListener>> = {};

function notifyLocalReflections(userId: string, reflections: JournalReflection[]): void {
  if (localReflectionsListeners[userId]) {
    localReflectionsListeners[userId].forEach((listener) => {
      try {
        listener(reflections);
      } catch (err) {
        console.warn('Local reflections listener error:', err);
      }
    });
  }
}

type LocalScrapbooksListener = (scrapbooks: Scrapbook[]) => void;
const localScrapbooksListeners: Record<string, Set<LocalScrapbooksListener>> = {};

function notifyLocalScrapbooks(userId: string, scrapbooks: Scrapbook[]): void {
  if (localScrapbooksListeners[userId]) {
    localScrapbooksListeners[userId].forEach((listener) => {
      try {
        listener(scrapbooks);
      } catch (err) {
        console.warn('Local scrapbooks listener error:', err);
      }
    });
  }
}

export function getLocalReflections(userId: string): JournalReflection[] {
  if (!userId) return [];
  const sanitize = (items: JournalReflection[]) =>
    items.filter(item => !item.id.startsWith('ref_welcome_') && item.title !== 'Welcome to My World 🌱');

  if (memoryReflectionsCache[userId] && memoryReflectionsCache[userId].length > 0) {
    return sanitize(memoryReflectionsCache[userId]);
  }
  try {
    const raw = localStorage.getItem(LS_REFLECTIONS(userId));
    if (raw) {
      const parsed = JSON.parse(raw);
      const clean = sanitize(parsed);
      memoryReflectionsCache[userId] = clean;
      return clean;
    }
  } catch {}
  return [];
}

export function isStarterScrapbook(item: Scrapbook): boolean {
  if (!item) return false;
  return (
    (item.id && (
      item.id.startsWith('scrapbook_raj_') ||
      item.id.startsWith('scrapbook_coffee_') ||
      item.id.startsWith('scrapbook_pines_')
    )) ||
    item.title === 'Rajasthan' ||
    item.title === 'Weekend Calm' ||
    item.title === 'Alpine Trails'
  );
}

/**
 * Ephemeral Sandbox (Option A) for Explorer / Guest mode.
 * Completely purges all local storage items, IndexedDB records, and in-memory caches
 * created during the guest session so no trace remains upon logout.
 */
export async function clearEphemeralGuestData(guestUid?: string): Promise<void> {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        if (
          key.includes('guest') ||
          (guestUid && key.includes(guestUid)) ||
          key === 'craft_guest_session' ||
          key === 'craft_guest_uid' ||
          key.includes('scrapbook_raj_') ||
          key.includes('has_initialized_scrapbooks_') ||
          key.includes('has_initialized_reflections_')
        ) {
          keysToRemove.push(key);
        }
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch (err) {
    console.warn('LocalStorage guest cleanup warning:', err);
  }

  // Clear in-memory cache
  if (guestUid && memoryReflectionsCache[guestUid]) {
    delete memoryReflectionsCache[guestUid];
  }
  Object.keys(memoryReflectionsCache).forEach((k) => {
    if (k.includes('guest_')) {
      delete memoryReflectionsCache[k];
    }
  });

  // Clear IndexedDB
  if (guestUid) {
    await idbDelete(LS_REFLECTIONS(guestUid)).catch(() => {});
    await idbDelete(LS_SCRAPBOOKS(guestUid)).catch(() => {});
  }
  await idbClearGuestEntries().catch(() => {});
}

export function saveLocalReflections(userId: string, reflections: JournalReflection[]): void {
  if (!userId) return;
  memoryReflectionsCache[userId] = reflections;
  try {
    localStorage.setItem(LS_REFLECTIONS(userId), JSON.stringify(reflections));
  } catch (err) {
    console.warn('LocalStorage quota warning (storing safely in IndexedDB):', err);
  }
  // Resiliently persist full payload with audio/images in IndexedDB
  idbSet(LS_REFLECTIONS(userId), reflections).catch(() => {});
  // Reactively notify any active subscribers
  notifyLocalReflections(userId, reflections);
}

export function saveLocalReflectionItem(userId: string, item: JournalReflection): void {
  const list = getLocalReflections(userId);
  const idx = list.findIndex(r => r.id === item.id);
  if (idx !== -1) {
    list[idx] = item;
  } else {
    list.unshift(item);
  }
  saveLocalReflections(userId, list);
}

export function deleteLocalReflectionItem(userId: string, reflectionId: string): void {
  const list = getLocalReflections(userId);
  saveLocalReflections(userId, list.filter(r => r.id !== reflectionId));
}

export function getLocalScrapbooks(userId: string): Scrapbook[] {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(LS_SCRAPBOOKS(userId));
    if (!raw) return [];
    const list: Scrapbook[] = JSON.parse(raw);
    const clean = Array.isArray(list) ? list.filter((s) => !isStarterScrapbook(s)) : [];
    if (clean.length !== list.length) {
      localStorage.setItem(LS_SCRAPBOOKS(userId), JSON.stringify(clean));
    }
    return clean;
  } catch {
    return [];
  }
}

export function saveLocalScrapbooks(userId: string, scrapbooks: Scrapbook[]): void {
  if (!userId) return;
  try {
    localStorage.setItem(LS_SCRAPBOOKS(userId), JSON.stringify(scrapbooks));
  } catch (err) {
    console.warn('LocalStorage save warning:', err);
  }
  notifyLocalScrapbooks(userId, scrapbooks);
}

export function saveLocalScrapbookItem(userId: string, item: Scrapbook): void {
  const list = getLocalScrapbooks(userId);
  const idx = list.findIndex(s => s.id === item.id);
  if (idx !== -1) {
    list[idx] = item;
  } else {
    list.unshift(item);
  }
  saveLocalScrapbooks(userId, list);
}

export function deleteLocalScrapbookItem(userId: string, scrapbookId: string): void {
  const list = getLocalScrapbooks(userId);
  saveLocalScrapbooks(userId, list.filter(s => s.id !== scrapbookId));
}

/**
 * Defensive Undefined Stripper
 * Ensures zero undefined properties are passed to Firestore to prevent write crashes.
 */
export function cleanPayload<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => cleanPayload(item)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = typeof value === 'object' && value !== null ? cleanPayload(value) : value;
      }
    }
    return cleaned as T;
  }
  return obj;
}

/**
 * Sync or update the User Profile in /users/{userId}
 */
export async function syncUserProfile(user: UserProfile): Promise<void> {
  if (!user.uid) throw new Error('User ID is required for profile synchronization');
  
  // Always cache locally
  try {
    localStorage.setItem(`user_profile_${user.uid}`, JSON.stringify(user));
  } catch {}

  // If quota is already exhausted or unauthenticated guest mode, skip writing to avoid permission errors
  if (isDailyQuotaExceeded || !auth.currentUser) return;

  const userRef = doc(db, 'users', user.uid);
  const data = cleanPayload({
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    lastLoginAt: Date.now(),
    serverUpdated: serverTimestamp()
  });

  try {
    await setDoc(userRef, data, { merge: true });
  } catch (err: any) {
    if (isQuotaExceededError(err)) {
      setQuotaExceededState(true);
      console.warn('Daily write quota reached in syncUserProfile. Continuing with local profile.');
      return;
    }
    console.warn('Profile sync notice:', err?.message);
  }
}

/**
 * Fetch the User Profile document from /users/{userId}
 */
export async function getUserProfile(userId: string): Promise<Record<string, any> | null> {
  if (!userId) return null;
  try {
    // Check local storage first
    const localRaw = localStorage.getItem(`user_profile_${userId}`);
    const localProfile = localRaw ? JSON.parse(localRaw) : null;
    const isLocalInit = localStorage.getItem(LS_INITIALIZED(userId)) === 'true';

    if (isDailyQuotaExceeded || !auth.currentUser) {
      return { ...localProfile, hasInitializedScrapbooks: isLocalInit };
    }

    const userRef = doc(db, 'users', userId);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data.hasInitializedScrapbooks) {
        localStorage.setItem(LS_INITIALIZED(userId), 'true');
      }
      return data;
    }
    return localProfile ? { ...localProfile, hasInitializedScrapbooks: isLocalInit } : null;
  } catch (err) {
    if (isQuotaExceededError(err)) {
      setQuotaExceededState(true);
    }
    console.warn('Notice fetching user profile (using local fallback):', err);
    const isLocalInit = localStorage.getItem(LS_INITIALIZED(userId)) === 'true';
    return { hasInitializedScrapbooks: isLocalInit };
  }
}

/**
 * Permanently record in Firestore that this user has had their scrapbooks initialized.
 * This guarantees that when a user deletes their albums, they stay deleted across page refreshes and devices.
 */
export async function markUserScrapbooksInitialized(userId: string): Promise<void> {
  if (!userId) return;
  try {
    localStorage.setItem(LS_INITIALIZED(userId), 'true');
    if (isDailyQuotaExceeded || !auth.currentUser) return;

    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, { 
      hasInitializedScrapbooks: true, 
      scrapbooksInitializedAt: Date.now() 
    }, { merge: true });
  } catch (err) {
    if (isQuotaExceededError(err)) {
      setQuotaExceededState(true);
      return;
    }
    console.warn('Notice recording scrapbook initialization state in Firestore:', err);
  }
}

/**
 * Calculates estimated document size in bytes for Firestore (1,048,576 bytes limit)
 */
export function getEstimatedDocumentSize(obj: any): number {
  try {
    return new TextEncoder().encode(JSON.stringify(obj)).length;
  } catch {
    return 0;
  }
}

/**
 * Prepares a safe, lightweight cloud payload for Firestore.
 * Strips raw heavy media data URLs if approaching the 1MB Firestore document limit,
 * while preserving transcripts, note metadata, text, insights, and thumbnails.
 * (The full original audio and images remain safely stored locally in IndexedDB).
 */
export function prepareCloudReflectionPayload(reflection: JournalReflection): Record<string, any> {
  const cloudCopy: any = { ...reflection };
  let currentBytes = getEstimatedDocumentSize(cloudCopy);

  // If already under 500KB, it is safe to write directly
  if (currentBytes < 500000) {
    return cleanPayload(cloudCopy);
  }

  // 1. In audio notes: omit heavy base64 data URLs in the cloud document
  if (Array.isArray(cloudCopy.audioNotes) && cloudCopy.audioNotes.length > 0) {
    cloudCopy.audioNotes = cloudCopy.audioNotes.map((note: any) => {
      const isLargeDataUrl = typeof note.url === 'string' && note.url.startsWith('data:') && note.url.length > 25000;
      return {
        ...note,
        url: isLargeDataUrl ? '' : note.url, // Full audio note preserved locally in IndexedDB
        base64: undefined // Never store duplicate base64 in Firestore
      };
    });
    currentBytes = getEstimatedDocumentSize(cloudCopy);
  }

  // 2. In images: if still large, truncate data URL if oversized
  if (currentBytes > 500000 && Array.isArray(cloudCopy.images)) {
    cloudCopy.images = cloudCopy.images.map((img: any) => {
      if (typeof img.url === 'string' && img.url.length > 120000) {
        return {
          ...img,
          url: img.url.slice(0, 80000)
        };
      }
      return img;
    });
    currentBytes = getEstimatedDocumentSize(cloudCopy);
  }

  // 3. In messages: trim historical messages if document is still massive
  if (currentBytes > 750000 && Array.isArray(cloudCopy.messages) && cloudCopy.messages.length > 25) {
    cloudCopy.messages = cloudCopy.messages.slice(-25);
  }

  return cleanPayload(cloudCopy);
}

/**
 * Save or update a Journal Reflection in /users/{userId}/reflections/{reflectionId}
 * Isolated strictly to the authenticated user.
 */
export async function saveReflection(
  userId: string, 
  reflection: JournalReflection
): Promise<{ success: boolean; id: string; error?: string; isLocalFallback?: boolean }> {
  // Always prioritize the active authenticated user ID to prevent permission mismatches
  const effectiveUserId = (auth.currentUser && auth.currentUser.uid) ? auth.currentUser.uid : userId;

  if (!effectiveUserId) {
    return { success: false, id: reflection.id, error: 'Authentication required: Missing userId' };
  }
  if (!reflection.id) {
    return { success: false, id: '', error: 'Invalid reflection ID' };
  }

  const cleaned = cleanPayload({
    ...reflection,
    userId: effectiveUserId,
    updatedAt: Date.now()
  });

  // 1. Always save the FULL fidelity reflection to local storage & IndexedDB first (zero data loss)
  saveLocalReflectionItem(effectiveUserId, cleaned);

  // 2. If quota is already exhausted or unauthenticated guest mode, return local fallback success
  if (isDailyQuotaExceeded || !auth.currentUser) {
    return { success: true, id: reflection.id, isLocalFallback: true };
  }

  try {
    const cloudPayload = prepareCloudReflectionPayload(cleaned);
    const reflectionRef = doc(db, 'users', effectiveUserId, 'reflections', reflection.id);
    await setDoc(reflectionRef, cloudPayload, { merge: true });
    return { success: true, id: reflection.id };
  } catch (err: any) {
    const errMsg = err?.message || String(err);

    // Auto-recovery if document size limit (1MB) was encountered
    if (errMsg.includes('exceeds the maximum allowed size') || errMsg.includes('1,048,576 bytes')) {
      console.warn('Firestore 1MB limit encountered. Pruning heavy audio/image data for cloud sync...');
      try {
        const leanPayload = cleanPayload({
          ...cleaned,
          audioNotes: (cleaned.audioNotes || []).map((an: any) => ({
            ...an,
            url: '',
            base64: undefined
          })),
          images: (cleaned.images || []).map((im: any) => ({
            ...im,
            url: typeof im.url === 'string' && im.url.length > 40000 ? '' : im.url
          }))
        });
        const reflectionRef = doc(db, 'users', effectiveUserId, 'reflections', reflection.id);
        await setDoc(reflectionRef, leanPayload, { merge: true });
        return { success: true, id: reflection.id };
      } catch (retryErr) {
        console.error('Lean cloud sync retry notice:', retryErr);
        // Fall back gracefully - the user's data is already safely stored locally
        return { success: true, id: reflection.id, isLocalFallback: true };
      }
    }

    if (isQuotaExceededError(err)) {
      setQuotaExceededState(true);
      console.warn('Daily write quota reached. Reflection saved safely to local storage.');
      return { 
        success: true, 
        id: reflection.id, 
        isLocalFallback: true, 
        error: 'Firestore daily write quota reached. Saved safely to your device.' 
      };
    }

    // If permission error occurred because user logged out or session expired
    if (errMsg.includes('Missing or insufficient permissions')) {
      console.warn('Firestore permission check failed. Data saved safely to local device.');
      return {
        success: true,
        id: reflection.id,
        isLocalFallback: true,
        error: 'Cloud sync paused. Saved safely to your device.'
      };
    }

    console.error('Firestore saveReflection error:', err);
    return { 
      success: false, 
      id: reflection.id, 
      error: err?.message || 'Failed to save reflection to Firestore' 
    };
  }
}

/**
 * Real-time listener for user reflections, ordered by latest update
 */
export function subscribeUserReflections(
  userId: string,
  onData: (reflections: JournalReflection[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  if (!userId) {
    onData([]);
    return () => {};
  }

  // 1. Immediately provide any local reflections so UI is instantaneous
  const localItems = getLocalReflections(userId);
  if (localItems.length > 0) {
    onData(localItems);
  }

  // If quota is already exceeded or unauthenticated guest mode (Explorer),
  // NEVER leave the listener hanging! Provide local data immediately.
  if (isDailyQuotaExceeded || !auth.currentUser) {
    // If localItems is empty (e.g., fresh guest session), immediately call onData([])
    // so loading state resolves without spinning indefinitely.
    if (localItems.length === 0) {
      onData([]);
    }

    // Also check IndexedDB asynchronously in case larger items exist
    idbGet<JournalReflection[]>(LS_REFLECTIONS(userId)).then((idbItems) => {
      if (idbItems && idbItems.length > 0) {
        memoryReflectionsCache[userId] = idbItems;
        onData(idbItems);
      }
    }).catch(() => {});

    // Register to local reflections listener so edits/deletions update in real-time
    if (!localReflectionsListeners[userId]) {
      localReflectionsListeners[userId] = new Set();
    }
    localReflectionsListeners[userId].add(onData);

    return () => {
      localReflectionsListeners[userId]?.delete(onData);
    };
  }

  const reflectionsCol = collection(db, 'users', userId, 'reflections');
  const q = query(reflectionsCol, orderBy('updatedAt', 'desc'));

  try {
    return onSnapshot(
      q,
      (snapshot) => {
        const localCurrent = getLocalReflections(userId);
        const results: JournalReflection[] = [];
        snapshot.forEach((docSnap) => {
          const cloudDoc = docSnap.data() as JournalReflection;
          // Filter out default starter reflections so they are never shown to normal users or explorers
          if (cloudDoc.id.startsWith('ref_welcome_') || cloudDoc.title === 'Welcome to My World 🌱') {
            deleteDoc(docSnap.ref).catch(() => {});
            return;
          }
          // Merge local audio and full-fidelity media if cloud document pruned them for 1MB limits
          const localMatch = localCurrent.find(l => l.id === cloudDoc.id);
          if (localMatch) {
            if (localMatch.audioNotes && localMatch.audioNotes.length > 0) {
              cloudDoc.audioNotes = cloudDoc.audioNotes?.map(an => {
                const localAn = localMatch.audioNotes?.find(l => l.id === an.id);
                return {
                  ...an,
                  url: an.url || localAn?.url || ''
                };
              }) || localMatch.audioNotes;
            }
            if (localMatch.images && localMatch.images.length > 0) {
              cloudDoc.images = cloudDoc.images?.map(im => {
                const localIm = localMatch.images?.find(l => l.id === im.id);
                return {
                  ...im,
                  url: (im.url && im.url.length > 50) ? im.url : (localIm?.url || im.url)
                };
              }) || localMatch.images;
            }
          }
          results.push(cloudDoc);
        });

        // Merge any locally pending items not yet reflected in Firestore snapshot
        const missingLocalItems = localCurrent.filter(
          loc => !results.some(cloud => cloud.id === loc.id)
        );
        const mergedResults = [...results, ...missingLocalItems].sort(
          (a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0)
        );

        saveLocalReflections(userId, mergedResults);
        onData(mergedResults);
      },
      (err) => {
        if (isQuotaExceededError(err)) {
          setQuotaExceededState(true);
          console.warn('Quota limit hit on reflections subscription. Serving local reflections.');
          onData(getLocalReflections(userId));
          return;
        }
        console.warn('Snapshot notice for user reflections (falling back to local):', err);
        onData(getLocalReflections(userId));
        onError(err);
      }
    );
  } catch (err: any) {
    if (isQuotaExceededError(err)) {
      setQuotaExceededState(true);
    }
    onData(getLocalReflections(userId));
    return () => {};
  }
}

/**
 * Delete a user reflection
 */
export async function deleteReflection(
  userId: string, 
  reflectionId: string
): Promise<{ success: boolean; error?: string }> {
  if (!userId || !reflectionId) {
    return { success: false, error: 'User ID and Reflection ID are required' };
  }

  // 1. Always delete locally first (instant UI update & offline durability)
  deleteLocalReflectionItem(userId, reflectionId);

  // Determine effective authenticated user ID
  const effectiveUserId = (auth.currentUser && auth.currentUser.uid) ? auth.currentUser.uid : userId;
  if (effectiveUserId !== userId) {
    deleteLocalReflectionItem(effectiveUserId, reflectionId);
  }

  // 2. If daily quota is exceeded, or unauthenticated, or guest mode, skip cloud call
  if (isDailyQuotaExceeded || !auth.currentUser || effectiveUserId.startsWith('guest_') || userId.startsWith('guest_')) {
    return { success: true };
  }

  try {
    const reflectionRef = doc(db, 'users', effectiveUserId, 'reflections', reflectionId);
    await deleteDoc(reflectionRef);
    return { success: true };
  } catch (err: any) {
    if (isQuotaExceededError(err)) {
      setQuotaExceededState(true);
      return { success: true };
    }
    // If the document has permission restrictions, was already deleted, or was created in guest mode
    if (err?.code === 'permission-denied' || err?.message?.includes('insufficient permissions')) {
      console.warn('Firestore deletion permission notice (item safely removed locally):', err?.message);
      return { success: true };
    }
    console.error('Error deleting reflection from Firestore:', err);
    return { success: false, error: err?.message || 'Failed to delete reflection' };
  }
}

/**
 * Save or update a Scrapbook in /users/{userId}/scrapbooks/{scrapbookId}
 */
export async function saveScrapbook(
  userId: string,
  scrapbook: Scrapbook
): Promise<{ success: boolean; id: string; error?: string; isLocalFallback?: boolean }> {
  const effectiveUserId = (auth.currentUser && auth.currentUser.uid) ? auth.currentUser.uid : userId;

  if (!effectiveUserId) {
    return { success: false, id: scrapbook.id, error: 'Authentication required: Missing userId' };
  }
  if (!scrapbook.id) {
    return { success: false, id: '', error: 'Invalid scrapbook ID' };
  }

  const cleaned = cleanPayload({
    ...scrapbook,
    userId: effectiveUserId,
    updatedAt: Date.now()
  });

  // 1. Always save to local storage first (instant durability)
  saveLocalScrapbookItem(effectiveUserId, cleaned);

  // 2. If quota is already exhausted or unauthenticated guest mode, skip cloud call
  if (isDailyQuotaExceeded || !auth.currentUser) {
    return { success: true, id: scrapbook.id, isLocalFallback: true };
  }

  try {
    const scrapbookRef = doc(db, 'users', effectiveUserId, 'scrapbooks', scrapbook.id);
    await setDoc(scrapbookRef, cleaned, { merge: true });
    return { success: true, id: scrapbook.id };
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    if (errMsg.includes('exceeds the maximum allowed size') || errMsg.includes('1,048,576 bytes')) {
      console.warn('Scrapbook exceeds 1MB limit for cloud sync. Saved locally.');
      return { success: true, id: scrapbook.id, isLocalFallback: true };
    }
    if (isQuotaExceededError(err)) {
      setQuotaExceededState(true);
      console.warn('Daily write quota reached. Scrapbook saved safely to local storage.');
      return { 
        success: true, 
        id: scrapbook.id, 
        isLocalFallback: true, 
        error: 'Firestore daily write quota reached. Saved safely to your device.' 
      };
    }
    if (errMsg.includes('Missing or insufficient permissions')) {
      console.warn('Firestore permission check failed for scrapbook. Saved safely to local device.');
      return { success: true, id: scrapbook.id, isLocalFallback: true };
    }
    console.error('Firestore saveScrapbook error:', err);
    return {
      success: false,
      id: scrapbook.id,
      error: err?.message || 'Failed to save scrapbook to Firestore'
    };
  }
}

/**
 * Real-time listener for user scrapbooks, ordered by latest update
 */
export function subscribeUserScrapbooks(
  userId: string,
  onData: (scrapbooks: Scrapbook[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  if (!userId) {
    onData([]);
    return () => {};
  }

  // 1. Immediately provide any local scrapbooks so UI is instantaneous
  const localBooks = getLocalScrapbooks(userId);
  if (localBooks.length > 0) {
    onData(localBooks);
  }

  // If quota is already exceeded or unauthenticated guest mode, don't attempt to open a listeners connection
  if (isDailyQuotaExceeded || !auth.currentUser) {
    if (localBooks.length === 0) {
      onData([]);
    }

    if (!localScrapbooksListeners[userId]) {
      localScrapbooksListeners[userId] = new Set();
    }
    localScrapbooksListeners[userId].add(onData);

    return () => {
      localScrapbooksListeners[userId]?.delete(onData);
    };
  }

  const scrapbooksCol = collection(db, 'users', userId, 'scrapbooks');
  const q = query(scrapbooksCol, orderBy('updatedAt', 'desc'));

  try {
    return onSnapshot(
      q,
      (snapshot) => {
        const results: Scrapbook[] = [];
        snapshot.forEach((docSnap) => {
          const cloudDoc = docSnap.data() as Scrapbook;
          if (isStarterScrapbook(cloudDoc)) {
            // Delete from Firestore so sample/test albums are permanently eliminated
            deleteDoc(docSnap.ref).catch(() => {});
            return;
          }
          results.push(cloudDoc);
        });
        saveLocalScrapbooks(userId, results);
        onData(results);
      },
      (err) => {
        if (isQuotaExceededError(err)) {
          setQuotaExceededState(true);
          console.warn('Quota limit hit on scrapbooks subscription. Serving local scrapbooks.');
          onData(getLocalScrapbooks(userId));
          return;
        }
        console.warn('Snapshot notice for user scrapbooks:', err);
        onError(err);
      }
    );
  } catch (err: any) {
    if (isQuotaExceededError(err)) {
      setQuotaExceededState(true);
      onData(getLocalScrapbooks(userId));
    }
    return () => {};
  }
}

/**
 * Delete a user scrapbook
 */
export async function deleteScrapbook(
  userId: string, 
  scrapbookId: string
): Promise<{ success: boolean; error?: string }> {
  if (!userId || !scrapbookId) {
    return { success: false, error: 'User ID and Scrapbook ID are required' };
  }

  // 1. Always delete locally first
  deleteLocalScrapbookItem(userId, scrapbookId);

  const effectiveUserId = (auth.currentUser && auth.currentUser.uid) ? auth.currentUser.uid : userId;
  if (effectiveUserId !== userId) {
    deleteLocalScrapbookItem(effectiveUserId, scrapbookId);
  }

  // 2. If daily quota is exceeded, or unauthenticated, or guest mode, skip cloud call
  if (isDailyQuotaExceeded || !auth.currentUser || effectiveUserId.startsWith('guest_') || userId.startsWith('guest_')) {
    return { success: true };
  }

  try {
    const scrapbookRef = doc(db, 'users', effectiveUserId, 'scrapbooks', scrapbookId);
    await deleteDoc(scrapbookRef);
    return { success: true };
  } catch (err: any) {
    if (isQuotaExceededError(err)) {
      setQuotaExceededState(true);
      return { success: true };
    }
    if (err?.code === 'permission-denied' || err?.message?.includes('insufficient permissions')) {
      console.warn('Firestore deletion permission notice (scrapbook safely removed locally):', err?.message);
      return { success: true };
    }
    console.error('Error deleting scrapbook from Firestore:', err);
    return { success: false, error: err?.message || 'Failed to delete scrapbook' };
  }
}

/**
 * Fetch a single scrapbook
 */
export async function getScrapbook(userId: string, scrapbookId: string): Promise<Scrapbook | null> {
  if (!userId || !scrapbookId) return null;

  // Check local first
  const localList = getLocalScrapbooks(userId);
  const found = localList.find(s => s.id === scrapbookId);
  if (found) return found;

  const effectiveUserId = (auth.currentUser && auth.currentUser.uid) ? auth.currentUser.uid : userId;
  if (isDailyQuotaExceeded || !auth.currentUser || effectiveUserId.startsWith('guest_')) return null;

  try {
    const scrapbookRef = doc(db, 'users', effectiveUserId, 'scrapbooks', scrapbookId);
    const snap = await getDoc(scrapbookRef);
    if (snap.exists()) {
      return snap.data() as Scrapbook;
    }
    return null;
  } catch (err) {
    if (isQuotaExceededError(err)) {
      setQuotaExceededState(true);
    }
    console.warn('Notice getting scrapbook:', err);
    return null;
  }
}

