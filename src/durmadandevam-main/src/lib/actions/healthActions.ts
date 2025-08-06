'use server';

import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';

export interface HealthCheckResult {
  service: string;
  status: 'ok' | 'error';
  details: string;
}

export async function checkSystemHealth(): Promise<HealthCheckResult[]> {
  const results: HealthCheckResult[] = [];

  // Firestore Check
  try {
    const healthCheckDoc = doc(db, 'config', 'healthCheck');
    await setDoc(healthCheckDoc, { timestamp: new Date().toISOString() });
    const docSnap = await getDoc(healthCheckDoc);
    if (!docSnap.exists()) {
      throw new Error("Test document could not be read back.");
    }
    await deleteDoc(healthCheckDoc);
    results.push({ service: 'Firestore', status: 'ok', details: 'Read/Write test successful.' });
  } catch (error: any) {
    results.push({ service: 'Firestore', status: 'error', details: error.message });
  }

  // Add other checks here in the future if needed (e.g., calling a Genkit flow)

  return results;
}
