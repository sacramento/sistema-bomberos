

'use server';

import { db } from '@/lib/firebase/firestore';
import { AuditLog, AuditLogAction, LoggedInUser } from '@/lib/types';
import { collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';

if (!db) {
    throw new Error("Firestore is not initialized. Check your Firebase configuration.");
}

const auditCollection = collection(db, 'audit_logs');

/**
 * Logs an action performed by a user.
 * @param actor The user performing the action.
 * @param action The type of action performed.
 * @param target The entity being affected.
 * @param details Additional details about the action.
 */
export const logAction = async (
    actor: LoggedInUser,
    action: AuditLogAction,
    target: { entity: string; id: string },
    details?: Record<string, any>
): Promise<void> => {
    if (!actor) {
        console.warn("Log attempt without an actor (user). Action:", action);
        return; // Do not log if the user is unknown
    }

    try {
        const logEntry = {
            timestamp: serverTimestamp(),
            userId: actor.id,
            userName: actor.name,
            action,
            targetEntity: target.entity,
            targetId: target.id,
            details: details || {},
        };
        await addDoc(auditCollection, logEntry);
    } catch (error) {
        console.error("Failed to write to audit log:", error);
        // We don't throw an error here because a logging failure should not block the main user action.
    }
};

/**
 * Retrieves the most recent audit logs.
 * @returns A promise that resolves to an array of audit logs.
 */
export const getLogs = async (): Promise<AuditLog[]> => {
    const q = query(auditCollection, orderBy('timestamp', 'desc'), limit(100));
    const querySnapshot = await getDocs(q);
    const logs: AuditLog[] = [];
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        // The timestamp field can be a Firestore Timestamp object or null if it's pending.
        // We convert it to a serializable format (or keep it as is if it's already one).
        const timestamp = data.timestamp instanceof Timestamp 
            ? data.timestamp.toDate() 
            : (data.timestamp?.seconds ? new Date(data.timestamp.seconds * 1000) : new Date());

        logs.push({ 
            id: doc.id,
            ...data,
            timestamp: timestamp // Now it's a JS Date object
        } as AuditLog);
    });
    return logs;
}
