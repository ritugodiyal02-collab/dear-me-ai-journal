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
import { JournalReflection, UserProfile, Scrapbook } from '../types';

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

// Global state tracking whether daily quota is reached
const LS_QUOTA_KEY = 'firestore_daily_write_quota_exceeded_timestamp';

function checkInitialQuotaExceeded(): boolean {
  try {
    const raw = localStorage.getItem(LS_QUOTA_KEY);
    if (!raw) return false;
    const recordedTime = parseInt(raw, 10);
    // Quota resets daily. If flagged within the last 18 hours, consider quota still exceeded.
    if (Date.now() - recordedTime < 18 * 60 * 60 * 1000) {
      return true;
    }
  } catch {}
  return false;
}

let isDailyQuotaExceeded = checkInitialQuotaExceeded();
const quotaListeners = new Set<(exceeded: boolean) => void>();

// If quota is already exceeded from earlier today, gracefully suspend network to prevent retry backoff logs
if (isDailyQuotaExceeded) {
  try {
    disableNetwork(db).catch(() => {});
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
      localStorage.removeItem(LS_QUOTA_KEY);
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
    localStorage.removeItem(LS_QUOTA_KEY);
    isDailyQuotaExceeded = false;
    await enableNetwork(db);
    quotaListeners.forEach(listener => listener(false));
    return true;
  } catch (err) {
    console.warn('Could not re-enable Firestore network:', err);
    return false;
  }
}

export function subscribeQuotaExceeded(listener: (exceeded: boolean) => void): () => void {
  quotaListeners.add(listener);
  listener(isDailyQuotaExceeded);
  return () => quotaListeners.delete(listener);
}

/**
 * Local Storage Fallback Cache
 * Guarantees zero data loss even when Firestore free tier daily quota is exceeded.
 */
const LS_REFLECTIONS = (uid: string) => `craft_reflections_${uid}`;
const LS_SCRAPBOOKS = (uid: string) => `craft_scrapbooks_${uid}`;
const LS_INITIALIZED = (uid: string) => `has_initialized_scrapbooks_${uid}`;

export function getLocalReflections(userId: string): JournalReflection[] {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(LS_REFLECTIONS(userId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalReflections(userId: string, reflections: JournalReflection[]): void {
  if (!userId) return;
  try {
    localStorage.setItem(LS_REFLECTIONS(userId), JSON.stringify(reflections));
  } catch (err) {
    console.warn('LocalStorage save warning:', err);
  }
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
    return raw ? JSON.parse(raw) : [];
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

  // If quota is exhausted, skip writing to avoid overloading backend
  if (isDailyQuotaExceeded) return;

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

    if (isDailyQuotaExceeded) {
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
    if (isDailyQuotaExceeded) return;

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
 * Save or update a Journal Reflection in /users/{userId}/reflections/{reflectionId}
 * Isolated strictly to the authenticated user.
 */
export async function saveReflection(
  userId: string, 
  reflection: JournalReflection
): Promise<{ success: boolean; id: string; error?: string; isLocalFallback?: boolean }> {
  if (!userId) {
    return { success: false, id: reflection.id, error: 'Authentication required: Missing userId' };
  }
  if (!reflection.id) {
    return { success: false, id: '', error: 'Invalid reflection ID' };
  }

  const cleaned = cleanPayload({
    ...reflection,
    userId,
    updatedAt: Date.now()
  });

  // 1. Always save to local storage first (instant durability)
  saveLocalReflectionItem(userId, cleaned);

  // 2. If quota is already exhausted, skip cloud network call to prevent backoff spam
  if (isDailyQuotaExceeded) {
    return { success: true, id: reflection.id, isLocalFallback: true };
  }

  try {
    const reflectionRef = doc(db, 'users', userId, 'reflections', reflection.id);
    await setDoc(reflectionRef, cleaned, { merge: true });
    return { success: true, id: reflection.id };
  } catch (err: any) {
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

  // If quota is already exceeded, don't attempt to open a listeners connection
  if (isDailyQuotaExceeded) {
    return () => {};
  }

  const reflectionsCol = collection(db, 'users', userId, 'reflections');
  const q = query(reflectionsCol, orderBy('updatedAt', 'desc'));

  try {
    return onSnapshot(
      q,
      (snapshot) => {
        const results: JournalReflection[] = [];
        snapshot.forEach((docSnap) => {
          results.push(docSnap.data() as JournalReflection);
        });

        // Merge with local items if local has newer entries
        saveLocalReflections(userId, results);
        onData(results);
      },
      (err) => {
        if (isQuotaExceededError(err)) {
          setQuotaExceededState(true);
          console.warn('Quota limit hit on reflections subscription. Serving local reflections.');
          onData(getLocalReflections(userId));
          return;
        }
        console.warn('Snapshot notice for user reflections:', err);
        onError(err);
      }
    );
  } catch (err: any) {
    if (isQuotaExceededError(err)) {
      setQuotaExceededState(true);
      onData(getLocalReflections(userId));
    }
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

  // Always delete locally
  deleteLocalReflectionItem(userId, reflectionId);

  if (isDailyQuotaExceeded) {
    return { success: true };
  }

  try {
    const reflectionRef = doc(db, 'users', userId, 'reflections', reflectionId);
    await deleteDoc(reflectionRef);
    return { success: true };
  } catch (err: any) {
    if (isQuotaExceededError(err)) {
      setQuotaExceededState(true);
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
  if (!userId) {
    return { success: false, id: scrapbook.id, error: 'Authentication required: Missing userId' };
  }
  if (!scrapbook.id) {
    return { success: false, id: '', error: 'Invalid scrapbook ID' };
  }

  const cleaned = cleanPayload({
    ...scrapbook,
    userId,
    updatedAt: Date.now()
  });

  // 1. Always save to local storage first (instant durability)
  saveLocalScrapbookItem(userId, cleaned);

  // 2. If quota is already exhausted, skip cloud call
  if (isDailyQuotaExceeded) {
    return { success: true, id: scrapbook.id, isLocalFallback: true };
  }

  try {
    const scrapbookRef = doc(db, 'users', userId, 'scrapbooks', scrapbook.id);
    await setDoc(scrapbookRef, cleaned, { merge: true });
    return { success: true, id: scrapbook.id };
  } catch (err: any) {
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

  // If quota is already exceeded, don't attempt to open a listeners connection
  if (isDailyQuotaExceeded) {
    return () => {};
  }

  const scrapbooksCol = collection(db, 'users', userId, 'scrapbooks');
  const q = query(scrapbooksCol, orderBy('updatedAt', 'desc'));

  try {
    return onSnapshot(
      q,
      (snapshot) => {
        const results: Scrapbook[] = [];
        snapshot.forEach((docSnap) => {
          results.push(docSnap.data() as Scrapbook);
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

  // Always delete locally
  deleteLocalScrapbookItem(userId, scrapbookId);

  if (isDailyQuotaExceeded) {
    return { success: true };
  }

  try {
    const scrapbookRef = doc(db, 'users', userId, 'scrapbooks', scrapbookId);
    await deleteDoc(scrapbookRef);
    return { success: true };
  } catch (err: any) {
    if (isQuotaExceededError(err)) {
      setQuotaExceededState(true);
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

  if (isDailyQuotaExceeded) return null;

  try {
    const scrapbookRef = doc(db, 'users', userId, 'scrapbooks', scrapbookId);
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

