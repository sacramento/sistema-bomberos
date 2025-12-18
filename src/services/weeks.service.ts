
'use server';

import { Week, Firefighter, LoggedInUser } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, addDoc, getDocs, query, orderBy, doc, getDoc, updateDoc, deleteDoc, writeBatch, where } from 'firebase/firestore';
import { getFirefighters } from './firefighters.service';
import { cache } from 'react';
import { logAction } from './audit.service';

if (!db) {
    throw new Error("Firestore is not initialized. Check your Firebase configuration.");
}

const weeksCollection = collection(db, 'weeks');
const tasksCollection = collection(db, 'tasks');

// Cache all firefighters for the duration of a single request
const getAllFirefightersCached = cache(async () => {
    const firefighters = await getFirefighters();
    return new Map(firefighters.map(f => [f.id, f]));
});


// Helper to enrich week data with full firefighter objects
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

    const week: Week = {
        id: docSnap.id,
        ...data,
        lead,
        driver,
        members,
        allMembers: uniqueMembers,
    };
    return week;
}


export const getWeeks = async (): Promise<Week[]> => {
    const q = query(weeksCollection, orderBy('periodStartDate', 'desc'));
    const querySnapshot = await getDocs(q);

    const firefighterMap = await getAllFirefightersCached();
    
    const weeksPromises = querySnapshot.docs.map(doc => docToWeek(doc, firefighterMap));
    const weeks = await Promise.all(weeksPromises);

    return weeks;
}

export const getWeekById = async (id: string): Promise<Week | null> => {
    const docRef = doc(db, 'weeks', id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const firefighterMap = await getAllFirefightersCached();
        return await docToWeek(docSnap, firefighterMap);
    }
    return null;
}


export const addWeek = async (weekData: Omit<Week, 'id' | 'allMembers' | 'allMemberIds'>, actor: LoggedInUser): Promise<string> => {
    const allMemberIds = Array.from(new Set([weekData.leadId, weekData.driverId, ...weekData.memberIds]));
    
    const dataToSave = {
        name: weekData.name,
        firehouse: weekData.firehouse,
        periodStartDate: weekData.periodStartDate,
        periodEndDate: weekData.periodEndDate,
        leadId: weekData.leadId,
        driverId: weekData.driverId,
        memberIds: weekData.memberIds,
        allMemberIds: allMemberIds,
        observations: weekData.observations
    };

    const docRef = await addDoc(weeksCollection, dataToSave);
    await logAction(actor, 'CREATE_WEEK', { entity: 'week', id: docRef.id }, dataToSave);
    return docRef.id;
};

export const updateWeek = async (id: string, weekData: Partial<Omit<Week, 'id' | 'allMembers' | 'allMemberIds'>>, actor: LoggedInUser): Promise<void> => {
    const docRef = doc(db, 'weeks', id);

    const dataToUpdate: any = { ...weekData };

    if (weekData.leadId || weekData.driverId || weekData.memberIds) {
        const docSnap = await getDoc(docRef);
        const currentData = docSnap.data() as Week;

        const newLeadId = weekData.leadId ?? currentData.leadId;
        const newDriverId = weekData.driverId ?? currentData.driverId;
        const newMemberIds = weekData.memberIds ?? currentData.memberIds;
        
        const allMemberIds = Array.from(new Set([newLeadId, newDriverId, ...newMemberIds]));
        dataToUpdate.allMemberIds = allMemberIds;
    }
    
    Object.keys(dataToUpdate).forEach(key => dataToUpdate[key] === undefined && delete dataToUpdate[key]);

    await updateDoc(docRef, dataToUpdate);
    await logAction(actor, 'UPDATE_WEEK', { entity: 'week', id }, dataToUpdate);
};

export const deleteWeek = async (id: string, actor: LoggedInUser): Promise<void> => {
    const batch = writeBatch(db);

    const weekDocRef = doc(db, 'weeks', id);
    batch.delete(weekDocRef);

    const tasksQuery = query(tasksCollection, where('weekId', '==', id));
    const tasksSnapshot = await getDocs(tasksQuery);
    tasksSnapshot.forEach(taskDoc => {
        batch.delete(taskDoc.ref);
    });

    await batch.commit();
    await logAction(actor, 'DELETE_WEEK', { entity: 'week', id });
}
