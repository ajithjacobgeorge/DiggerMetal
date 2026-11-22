import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { useCallback, useEffect, useState } from 'react';
import { auth, googleProvider } from '../config/firebase';
import { ensureUserProfile, updateUserPreferences } from '../services/firestoreService';
import type { UserPreferences } from '../types/market';

const DEFAULT_PREFS: UserPreferences = {
  userId: '',
  displayName: 'Guest',
  preferredCurrency: 'INR',
  preferredUnit: '10g',
  indiaCity: 'Mumbai',
  includeIndiaTaxes: true,
  notificationsEnabled: false,
};

const LOCAL_PREFS_KEY = 'aurumpulse_prefs_v1';

function readLocalPrefs(): UserPreferences {
  try {
    const raw = localStorage.getItem(LOCAL_PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<UserPreferences>) };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profileReady, setProfileReady] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences>(() => readLocalPrefs());
  const [authError, setAuthError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);

      if (nextUser) {
        try {
          const profile = await ensureUserProfile(
            nextUser.uid,
            nextUser.displayName ?? nextUser.email?.split('@')[0] ?? 'Investor'
          );
          setPreferences(profile);
          setProfileReady(true);
        } catch (err) {
          console.error('Failed to load user profile:', err);
          setProfileReady(true);
        }
      } else {
        setProfileReady(false);
        setPreferences(readLocalPrefs());
      }
    });

    return () => unsub();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    setSigningIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign-in could not be completed';
      if (!msg.includes('popup-closed-by-user')) {
        setAuthError('Unable to sign in with Google. Please allow popups and try again.');
      }
    } finally {
      setSigningIn(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  const savePreferences = useCallback(
    async (patch: Partial<Omit<UserPreferences, 'userId'>>) => {
      setPreferences((prev) => {
        const next = { ...prev, ...patch };
        try {
          localStorage.setItem(LOCAL_PREFS_KEY, JSON.stringify(next));
        } catch {
          // Ignore storage error
        }
        return next;
      });

      if (user && profileReady) {
        try {
          await updateUserPreferences(user.uid, patch);
        } catch (err) {
          console.error('Failed to sync preferences:', err);
        }
      }
    },
    [user, profileReady]
  );

  return {
    user,
    authReady,
    profileReady,
    preferences,
    authError,
    signingIn,
    signInWithGoogle,
    logout,
    savePreferences,
  };
}
