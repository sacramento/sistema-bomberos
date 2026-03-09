'use client';

import { db } from '@/lib/firebase/firestore';
import { AuditLog, AuditLogAction, LoggedInUser } from '@/lib/types';
import { collection, serverTimestamp, query, orderBy, limit, getDocs, Timestamp, doc, setDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * Logs an action performed by a user.
 */
export const logAction = async (
    actor: LoggedInUser,
    action: AuditLogAction,
    target: { entity: string; id: string },
    details?: Record<string, any>
): Promise<void> => {
    if (!actor || !db) return;

    const auditCollection = collection(db, 'audit_logs');
    const logEntry = {
        timestamp: serverTimestamp(),
        userId: actor.id,
        userName: actor.name,
        action,
        targetEntity: target.entity,
        targetId: target.id,
        details: details || {},
    };

    const docRef = doc(auditCollection);
    setDoc(docRef, logEntry).catch(async (error) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'create',
            requestResourceData: logEntry,
        });
        errorEmitter.emit('permission-error', permissionError);
    });
};

/**
 * Retrieves the most recent audit logs.
 */
export const getLogs = async (): Promise<AuditLog[]> => {
    if (!db) return [];
    const auditCollection = collection(db, 'audit_logs');
    const q = query(auditCollection, orderBy('timestamp', 'desc'), limit(100));
    
    return getDocs(q)
        .then((querySnapshot) => {
            const logs: AuditLog[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const timestamp = data.timestamp instanceof Timestamp 
                    ? data.timestamp.toDate() 
                    : (data.timestamp?.seconds ? new Date(data.timestamp.seconds * 1000) : new Date());

                logs.push({ 
                    id: doc.id,
                    ...data,
                    timestamp: timestamp
                } as AuditLog);
            });
            return logs;
        })
        .catch(async (error) => {
            const permissionError = new FirestorePermissionError({
                path: auditCollection.path,
                operation: 'list',
            });
            errorEmitter.emit('permission-error', permissionError);
            return [];
        });
}