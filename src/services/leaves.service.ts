'use client';

import { Leave, LoggedInUser } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, getDocs, doc, deleteDoc, writeBatch, query, where, updateDoc, setDoc } from 'firebase/firestore';
import { isWithinInterval, parseISO } from 'date-fns';
import { logAction } from './audit.service';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * Retrieves all leaves.
 */
export const getLeaves = async (): Promise<Leave[]> => {
    if (!db) return [];
    const leavesCollection = collection(db, 'leaves');
    
    return getDocs(leavesCollection)
        .then((querySnapshot) => {
            const leaves: Leave[] = [];
            querySnapshot.forEach((doc) => {
                leaves.push({ id: doc.id, ...doc.data() } as Leave);
            });
            return leaves.sort((a, b) => parseISO(b.startDate).getTime() - parseISO(a.startDate).getTime());
        })
        .catch(async (error) => {
            const permissionError = new FirestorePermissionError({
                path: leavesCollection.path,
                operation: 'list',
            });
            errorEmitter.emit('permission-error', permissionError);
            return [];
        });
};

/**
 * Adds a new leave and justifications.
 */
export const addLeave = async (leaveData: Omit<Leave, 'id'>, actor: LoggedInUser) => {
    if (!db) return;
    const batch = writeBatch(db);
    const leaveDocRef = doc(collection(db, 'leaves'));
    const sessionsCollection = collection(db, 'sessions');
    
    batch.set(leaveDocRef, leaveData);

    const leaveStartDate = parseISO(leaveData.startDate);
    const leaveEndDate = parseISO(leaveData.endDate);

    const sessionsQuery = query(sessionsCollection, where('date', '>=', leaveData.startDate), where('date', '<=', leaveData.endDate));
    
    return getDocs(sessionsQuery).then(async (sessionsSnapshot) => {
        sessionsSnapshot.forEach(sessionDoc => {
            const sessionData = sessionDoc.data();
            const sessionDate = parseISO(sessionData.date);
            
            if (isWithinInterval(sessionDate, { start: leaveStartDate, end: leaveEndDate })) {
                const allParticipantIds = [
                    ...(sessionData.attendeeIds || []),
                    ...(sessionData.instructorIds || []),
                    ...(sessionData.assistantIds || [])
                ];
                
                if (allParticipantIds.includes(leaveData.firefighterId)) {
                    const attendancePath = `attendance.${leaveData.firefighterId}`;
                    batch.update(sessionDoc.ref, { [attendancePath]: 'excused' });
                }
            }
        });

        batch.commit().catch(async (error) => {
            const permissionError = new FirestorePermissionError({
                path: 'leaves/sessions',
                operation: 'write',
            });
            errorEmitter.emit('permission-error', permissionError);
        });

        if (actor) {
            logAction(actor, 'CREATE_LEAVE', { entity: 'leave', id: leaveDocRef.id }, leaveData);
        }
    });
};

/**
 * Updates an existing leave.
 */
export const updateLeave = (id: string, leaveData: Partial<Omit<Leave, 'id' | 'firefighterId' | 'firefighterName'>>, actor: LoggedInUser) => {
    if (!db) return;
    const docRef = doc(db, 'leaves', id);
    
    updateDoc(docRef, leaveData).catch(async (error) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: leaveData,
        });
        errorEmitter.emit('permission-error', permissionError);
    });

    if (actor) {
        logAction(actor, 'UPDATE_LEAVE', { entity: 'leave', id }, leaveData);
    }
};

/**
 * Deletes a leave.
 */
export const deleteLeave = (id: string, actor: LoggedInUser) => {
    if (!db) return;
    const docRef = doc(db, 'leaves', id);
    
    deleteDoc(docRef).catch(async (error) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
    });

    if (actor) {
        logAction(actor, 'DELETE_LEAVE', { entity: 'leave', id });
    }
};
