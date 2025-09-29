
'use server';

import { Week, Firefighter } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, addDoc, getDocs, query, orderBy, doc, getDoc, updateDoc } from 'firebase/firestore';
import { getFirefighters } from './firefighters.service';

if (!db) {
    throw new Error("Firestore is not initialized. Check your Firebase configuration.");
}

const weeksCollection = collection(db, 'weeks');

// Helper to enrich week data with full firefighter objects
const docToWeek = async (docSnap: any, firefighterMap: Map<string, Firefighter>): Promise<Week> => {
    const data = docSnap.data();
    
    const lead = firefighterMap.get(data.leadId);
    const driver = firefighterMap.get(data.driverId);
    // 'members' are the ones that are not lead or driver
    const members = (data.memberIds || []).map((id: string) => firefighterMap.get(id)).filter(Boolean) as Firefighter[];
    
    // 'allMembers' are all firefighters associated with the week for filtering/display
    const allMembers = (data.allMemberIds || []).map((id: string) => firefighterMap.get(id)).filter(Boolean) as Firefighter[];

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
    const allMemberIds = Array.from(new Set([weekData.leadId, weekData.driverId, ...weekData.memberIds]));
    
    const dataToSave = {
        name: weekData.name,
        firehouse: weekData.firehouse,
        periodStartDate: weekData.periodStartDate,
        periodEndDate: weekData.periodEndDate,
        leadId: weekData.leadId,
        driverId: weekData.driverId,
        memberIds: weekData.memberIds,
        allMemberIds: allMemberIds, // Save the complete list of everyone
        observations: weekData.observations
    };

    const docRef = await addDoc(weeksCollection, dataToSave);
    return docRef.id;
};

export const updateWeek = async (id: string, weekData: Partial<Pick<Week, 'observations'>>): Promise<void> => {
    const docRef = doc(db, 'weeks', id);
    await updateDoc(docRef, weekData);
};
