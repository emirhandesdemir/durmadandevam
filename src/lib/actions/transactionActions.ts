// src/lib/actions/transactionActions.ts
'use server';

import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  serverTimestamp,
  addDoc,
  Transaction as FirestoreTransaction,
  query,
  orderBy,
  limit,
  getDocs
} from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { deepSerialize } from '../server-utils';
import type { Transaction } from '../types';

interface LogTransactionArgs {
    type: Transaction['type'];
    amount: number;
    description: string;
    relatedUserId?: string | null;
    roomId?: string | null;
    giftId?: string | null;
}

/**
 * Logs a financial transaction for a user within a Firestore transaction.
 * @param transaction The Firestore transaction object.
 * @param userId The ID of the user for whom the transaction is being logged.
 * @param data The transaction data.
 */
export async function logTransaction(
    transaction: FirestoreTransaction,
    userId: string,
    data: LogTransactionArgs
) {
  if (!userId) return;

  const transactionsRef = collection(db, 'users', userId, 'transactions');
  const newTxRef = doc(transactionsRef);

  transaction.set(newTxRef, {
    ...data,
    timestamp: serverTimestamp(),
  });
}

/**
 * Fetches the most recent transactions for a given user.
 * @param userId The ID of the user whose transactions are to be fetched.
 * @param txLimit The maximum number of transactions to fetch.
 * @returns A promise that resolves to an array of transaction objects.
 */
export async function getTransactions(userId: string, txLimit: number = 20): Promise<Transaction[]> {
    if (!userId) return [];

    const transactionsRef = collection(db, 'users', userId, 'transactions');
    const q = query(transactionsRef, orderBy('timestamp', 'desc'), limit(txLimit));

    const snapshot = await getDocs(q);
    if (snapshot.empty) {
        return [];
    }

    const transactions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as Transaction));
    
    // Server components'de prop olarak gönderilebilmesi için serileştir.
    return deepSerialize(transactions);
}
