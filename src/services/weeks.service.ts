
'use client';

import { Week, Firefighter, LoggedInUser } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, addDoc, getDocs, query, orderBy, doc, getDoc, updateDoc, deleteDoc, writeBatch, where, setDoc } from 'firebase/firestore';
import { getFirefighters } from './firefighters.service';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { logAction } from './audit.service';

const weeksCollection = collection(db, 'weeks');
const tasksCollection = collection(db, 'tasks');

// Helper to clean undefined values for Firestore
const cleanData = (obj: any) => {
    return Object.fromEntries(
        Object.entries(obj).filter(([_, v]) => v !== undefined)
    );
};

const docToWeek = async (docSnap: any, firefighterMap: Map<string, Firefighter>): Promise<Week> => {
    const data = docSnap.data();
    const getFirefighterObjects = (ids: string[]): Firefighter[] => {
        if (!ids) return [];
        return ids.map(id => firefighterMap.get(id)).filter(f => f !== undefined) as Firefighter[];
    };
    const lead = firefighterMap.get(data.leadId) || null;
    const driver = firefighterMap.get(data.driverId) || null;
    const members = getFirefighterObjects(data.memberIds || []);
    const allMembers: Firefighter[] = [];
    if (lead) allMembers.push(lead);
    if (driver) allMembers.push(driver);
    allMembers.push(...members);
    const uniqueMembers = Array.from(new Map(allMembers.map(m => [m.id, m])).values());
    return { id: docSnap.id, ...data, lead, driver, members, allMembers: uniqueMembers };
}

export const getWeeks = async (): Promise<Week[]> => {
    if (!db) return [];
    const q = query(weeksCollection, orderBy('periodStartDate', 'desc'));
    return getDocs(q)
        .then(async (querySnapshot) => {
            const firefighters = await getFirefighters();
            const firefighterMap = new Map(firefighters.map(f => [f.id, f]));
            const weeksPromises = querySnapshot.docs.map(doc => docToWeek(doc, firefighterMap));
            return await Promise.all(weeksPromises);
        })
        .catch(async (error) => {
            const permissionError = new FirestorePermissionError({
                path: weeksCollection.path,
                operation: 'list',
            });
            errorEmitter.emit('permission-error', permissionError);
            return [];
        });
}

export const getWeekById = async (id: string): Promise<Week | null> => {
    if (!db) return null;
    const docRef = doc(db, 'weeks', id);
    return getDoc(docRef)
        .then(async (docSnap) => {
            if (docSnap.exists()) {
                const firefighters = await getFirefighters();
                const firefighterMap = new Map(firefighters.map(f => [f.id, f]));
                return await docToWeek(docSnap, firefighterMap);
            }
            return null;
        })
        .catch(async (error) => {
            const permissionError = new FirestorePermissionError({
                path: docRef.path,
                operation: 'get',
            });
            errorEmitter.emit('permission-error', permissionError);
            return null;
        });
}

export const addWeek = async (weekData: Omit<Week, 'id' | 'allMembers' | 'allMemberIds'>, actor: LoggedInUser): Promise<string | void> => {
    if (!db) return;
    const allMemberIds = Array.from(new Set([weekData.leadId, weekData.driverId, ...weekData.memberIds]));
    const dataToSave = cleanData({
        name: weekData.name,
        firehouse: weekData.firehouse,
        periodStartDate: weekData.periodStartDate,
        periodEndDate: weekData.periodEndDate,
        leadId: weekData.leadId,
        driverId: weekData.driverId,
        memberIds: weekData.memberIds,
        allMemberIds: allMemberIds,
        observations: weekData.observations
    });
    const docRef = doc(weeksCollection);
    setDoc(docRef, dataToSave).catch(async (error) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'create',
            requestResourceData: dataToSave,
        });
        errorEmitter.emit('permission-error', permissionError);
    });
    if (actor) logAction(actor, 'CREATE_WEEK', { entity: 'week', id: docRef.id }, dataToSave);
    return docRef.id;
};

export const updateWeek = async (id: string, weekData: Partial<Omit<Week, 'id' | 'allMembers' | 'allMemberIds'>>, actor: LoggedInUser): Promise<void> => {
    if (!db) return;
    const docRef = doc(db, 'weeks', id);
    let dataToUpdate: any = cleanData(weekData);
    
    if (weekData.leadId || weekData.driverId || weekData.memberIds) {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const currentData = docSnap.data() as Week;
            const newLeadId = weekData.leadId ?? currentData.leadId;
            const newDriverId = weekData.driverId ?? currentData.driverId;
            const newMemberIds = weekData.memberIds ?? currentData.memberIds;
            dataToUpdate.allMemberIds = Array.from(new Set([newLeadId, newDriverId, ...newMemberIds]));
        }
    }
    
    updateDoc(docRef, dataToUpdate).catch(async (error) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: dataToUpdate,
        });
        errorEmitter.emit('permission-error', permissionError);
    });
    if (actor) logAction(actor, 'UPDATE_WEEK', { entity: 'week', id }, dataToUpdate);
};

export const deleteWeek = async (id: string, actor: LoggedInUser): Promise<void> => {
    if (!db) return;
    const batch = writeBatch(db);
    const weekDocRef = doc(db, 'weeks', id);
    batch.delete(weekDocRef);
    const tasksQuery = query(tasksCollection, where('weekId', '==', id));
    getDocs(tasksQuery).then(snapshot => {
        snapshot.forEach(taskDoc => batch.delete(taskDoc.ref));
        batch.commit().catch(async (error) => {
            const permissionError = new FirestorePermissionError({
                path: 'weeks/tasks',
                operation: 'delete',
            });
            errorEmitter.emit('permission-error', permissionError);
        });
    });
    if (actor) logAction(actor, 'DELETE_WEEK', { entity: 'week', id });
}
