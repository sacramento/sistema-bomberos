
'use server';

import { Week, Firefighter } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, addDoc, getDocs, query, orderBy, doc, getDoc, updateDoc, deleteDoc, writeBatch, where } from 'firebase/firestore';
import { getFirefighters } from './firefighters.service';

if (!db) {
    throw new Error("Firestore is not initialized. Check your Firebase configuration.");
}

const weeksCollection = collection(db, 'weeks');
const tasksCollection = collection(db, 'tasks');

// Helper to enrich week data with full firefighter objects
const docToWeek = async (docSnap: any, firefighterMap: Map<string, Firefighter>): Promise<Week> => {
    const data = docSnap.data();
    
    // Correctly read from allMemberIds
    const allMembers = (data.allMemberIds || []).map((id: string) => firefighterMap.get(id)).filter(Boolean) as Firefighter[];
    
    const lead = allMembers.find(m => m.id === data.leadId);
    const driver = allMembers.find(m => m.id === data.driverId);
    // Members are everyone who is not the lead or driver
    const members = allMembers.filter(m => m.id !== data.leadId && m.id !== data.driverId);

    const week: Week = {
        id: docSnap.id,
        ...data,
        lead,
        driver,
        members,
        allMembers,
    };
    return week;
}


export const getWeeks = async (): Promise<Week[]> => {
    const q = query(weeksCollection, orderBy('periodStartDate', 'desc'));
    const querySnapshot = await getDocs(q);

    const allFirefighters = await getFirefighters();
    const firefighterMap = new Map(allFirefighters.map(f => [f.id, f]));
    
    const weeksPromises = querySnapshot.docs.map(doc => docToWeek(doc, firefighterMap));
    const weeks = await Promise.all(weeksPromises);

    return weeks;
}

export const getWeekById = async (id: string): Promise<Week | null> => {
    const docRef = doc(db, 'weeks', id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const allFirefighters = await getFirefighters();
        const firefighterMap = new Map(allFirefighters.map(f => [f.id, f]));
        return await docToWeek(docSnap, firefighterMap);
    }
    return null;
}


export const addWeek = async (weekData: Omit<Week, 'id' | 'allMembers' | 'allMemberIds'>): Promise<string> => {
    // Combine all unique IDs.
    const allMemberIds = Array.from(new Set([weekData.leadId, weekData.driverId, ...weekData.memberIds]));
    
    const dataToSave = {
        name: weekData.name,
        firehouse: weekData.firehouse,
        periodStartDate: weekData.periodStartDate,
        periodEndDate: weekData.periodEndDate,
        leadId: weekData.leadId,
        driverId: weekData.driverId,
        // The individual members list (without lead/driver) is primarily for editing convenience.
        memberIds: weekData.memberIds,
        // This is the crucial field for reading and displaying the full team.
        allMemberIds: allMemberIds,
        observations: weekData.observations
    };

    const docRef = await addDoc(weeksCollection, dataToSave);
    return docRef.id;
};

export const updateWeek = async (id: string, weekData: Partial<Omit<Week, 'id' | 'allMembers' | 'allMemberIds'>>): Promise<void> => {
    const docRef = doc(db, 'weeks', id);

    const dataToUpdate: any = { ...weekData };

    // If roles or members change, recalculate allMemberIds
    if (weekData.leadId || weekData.driverId || weekData.memberIds) {
        const docSnap = await getDoc(docRef);
        const currentData = docSnap.data() as Week;

        const newLeadId = weekData.leadId ?? currentData.leadId;
        const newDriverId = weekData.driverId ?? currentData.driverId;
        const newMemberIds = weekData.memberIds ?? currentData.memberIds;
        
        const allMemberIds = Array.from(new Set([newLeadId, newDriverId, ...newMemberIds]));
        dataToUpdate.allMemberIds = allMemberIds;
    }
    
    // Remove undefined fields so they don't overwrite existing data
    Object.keys(dataToUpdate).forEach(key => dataToUpdate[key] === undefined && delete dataToUpdate[key]);

    await updateDoc(docRef, dataToUpdate);
};

export const deleteWeek = async (id: string): Promise<void> => {
    const batch = writeBatch(db);

    // 1. Delete the week itself
    const weekDocRef = doc(db, 'weeks', id);
    batch.delete(weekDocRef);

    // 2. Find and delete all tasks associated with that week
    const tasksQuery = query(tasksCollection, where('weekId', '==', id));
    const tasksSnapshot = await getDocs(tasksQuery);
    tasksSnapshot.forEach(taskDoc => {
        batch.delete(taskDoc.ref);
    });

    // 3. Commit the batch
    await batch.commit();
}
