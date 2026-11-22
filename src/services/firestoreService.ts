import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../config/firebase';
import type {
  AlertCondition,
  AlertStatus,
  CurrencyType,
  HoldingUnit,
  IndiaCity,
  MetalType,
  PortfolioHolding,
  PriceAlert,
  PurityGrade,
  UserPreferences,
  WeightUnit,
} from '../types/market';

const VALID_ID_REGEX = /^[a-zA-Z0-9_-]{1,128}$/;
const VALID_DATE_REGEX = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;

function generateDocId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  const ts = Date.now().toString(36);
  return `${prefix}_${ts}_${rand}`.replace(/[^a-zA-Z0-9_-]/g, '');
}

function clampString(val: string, maxLen: number): string {
  return val.trim().slice(0, maxLen);
}

export async function ensureUserProfile(
  userId: string,
  displayName: string
): Promise<UserPreferences> {
  if (!VALID_ID_REGEX.test(userId)) {
    throw new Error('Invalid user ID');
  }
  const path = `users/${userId}`;
  const ref = doc(db, 'users', userId);
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const d = snap.data();
      return {
        userId,
        displayName: String(d.displayName ?? displayName).slice(0, 80),
        preferredCurrency: (d.preferredCurrency === 'USD' ? 'USD' : 'INR') as CurrencyType,
        preferredUnit: (['10g', '1g', 'oz', 'kg'].includes(d.preferredUnit)
          ? d.preferredUnit
          : '10g') as WeightUnit,
        indiaCity: ([
          'Mumbai',
          'Delhi',
          'Chennai',
          'Bengaluru',
          'Kolkata',
          'Hyderabad',
        ].includes(d.indiaCity)
          ? d.indiaCity
          : 'Mumbai') as IndiaCity,
        includeIndiaTaxes: Boolean(d.includeIndiaTaxes ?? true),
        notificationsEnabled: Boolean(d.notificationsEnabled ?? false),
      };
    }

    const safeName = clampString(displayName || 'Investor', 80) || 'Investor';
    const initial: UserPreferences = {
      userId,
      displayName: safeName,
      preferredCurrency: 'INR',
      preferredUnit: '10g',
      indiaCity: 'Mumbai',
      includeIndiaTaxes: true,
      notificationsEnabled: false,
    };

    await setDoc(ref, {
      ...initial,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return initial;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateUserPreferences(
  userId: string,
  patch: Partial<Omit<UserPreferences, 'userId'>>
): Promise<void> {
  const path = `users/${userId}`;
  const ref = doc(db, 'users', userId);
  const sanitized: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };
  if (patch.displayName !== undefined) {
    sanitized.displayName = clampString(patch.displayName, 80) || 'Investor';
  }
  if (patch.preferredCurrency !== undefined) sanitized.preferredCurrency = patch.preferredCurrency;
  if (patch.preferredUnit !== undefined) sanitized.preferredUnit = patch.preferredUnit;
  if (patch.indiaCity !== undefined) sanitized.indiaCity = patch.indiaCity;
  if (patch.includeIndiaTaxes !== undefined) sanitized.includeIndiaTaxes = patch.includeIndiaTaxes;
  if (patch.notificationsEnabled !== undefined) {
    sanitized.notificationsEnabled = patch.notificationsEnabled;
  }

  try {
    await updateDoc(ref, sanitized);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribeHoldings(
  userId: string,
  onData: (items: PortfolioHolding[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = `users/${userId}/holdings`;
  const q = query(
    collection(db, 'users', userId, 'holdings'),
    where('userId', '==', userId),
    orderBy('purchaseDate', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const holdings: PortfolioHolding[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          userId: String(data.userId),
          metal: data.metal as MetalType,
          purity: data.purity as PurityGrade,
          quantity: Number(data.quantity),
          unit: data.unit as HoldingUnit,
          buyPrice: Number(data.buyPrice),
          currency: data.currency as CurrencyType,
          purchaseDate: String(data.purchaseDate),
          label: String(data.label ?? ''),
        };
      });
      onData(holdings);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError?.(wrapped as Error);
      }
    }
  );
}

export async function addPortfolioHolding(
  userId: string,
  input: Omit<PortfolioHolding, 'id' | 'userId'>
): Promise<string> {
  const holdingId = generateDocId('hld');
  const path = `users/${userId}/holdings/${holdingId}`;
  const purchaseDate = VALID_DATE_REGEX.test(input.purchaseDate)
    ? input.purchaseDate
    : new Date().toISOString().slice(0, 10);

  const payload = {
    userId,
    metal: input.metal,
    purity: input.purity,
    quantity: Math.min(Math.max(Number(input.quantity), 0.0001), 1_000_000),
    unit: input.unit,
    buyPrice: Math.min(Math.max(Number(input.buyPrice), 0.01), 1_000_000_000),
    currency: input.currency,
    purchaseDate,
    label: clampString(input.label, 60),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'users', userId, 'holdings', holdingId), payload);
    return holdingId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deletePortfolioHolding(userId: string, holdingId: string): Promise<void> {
  const path = `users/${userId}/holdings/${holdingId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'holdings', holdingId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeAlerts(
  userId: string,
  onData: (items: PriceAlert[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = `users/${userId}/alerts`;
  const q = query(
    collection(db, 'users', userId, 'alerts'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const alerts: PriceAlert[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          userId: String(data.userId),
          metal: data.metal as MetalType,
          condition: data.condition as AlertCondition,
          targetPrice: Number(data.targetPrice),
          currency: data.currency as CurrencyType,
          unit: data.unit as WeightUnit,
          status: data.status as AlertStatus,
          note: String(data.note ?? ''),
          triggeredPrice: Number(data.triggeredPrice ?? 0),
        };
      });
      onData(alerts);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError?.(wrapped as Error);
      }
    }
  );
}

export async function addPriceAlert(
  userId: string,
  input: Omit<PriceAlert, 'id' | 'userId' | 'status' | 'triggeredPrice'>
): Promise<string> {
  const alertId = generateDocId('alt');
  const path = `users/${userId}/alerts/${alertId}`;
  const payload = {
    userId,
    metal: input.metal,
    condition: input.condition,
    targetPrice: Math.min(Math.max(Number(input.targetPrice), 0.01), 1_000_000_000),
    currency: input.currency,
    unit: input.unit,
    status: 'active' as AlertStatus,
    note: clampString(input.note, 80),
    triggeredPrice: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'users', userId, 'alerts', alertId), payload);
    return alertId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function togglePriceAlertStatus(
  userId: string,
  alertId: string,
  nextStatus: 'active' | 'paused'
): Promise<void> {
  const path = `users/${userId}/alerts/${alertId}`;
  try {
    await updateDoc(doc(db, 'users', userId, 'alerts', alertId), {
      status: nextStatus,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function markPriceAlertTriggered(
  userId: string,
  alertId: string,
  observedPrice: number
): Promise<void> {
  const path = `users/${userId}/alerts/${alertId}`;
  try {
    await updateDoc(doc(db, 'users', userId, 'alerts', alertId), {
      status: 'triggered',
      triggeredPrice: Math.min(Math.max(Number(observedPrice.toFixed(2)), 0.01), 1_000_000_000),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deletePriceAlert(userId: string, alertId: string): Promise<void> {
  const path = `users/${userId}/alerts/${alertId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'alerts', alertId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
