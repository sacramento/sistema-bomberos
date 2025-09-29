
'use server';

import { Week, Firefighter } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, addDoc, getDocs, query, orderBy } from 'firebase/firestore';
import { getFirefighters } from './firefighters.service';

if (!db) {
    throw new Error("Firestore is not initialized. Check your Firebase configuration.");
}

const weeksCollection = collection(db, 'weeks');

// Helper to enrich week data with full firefighter objects
const docToWeek = async (docSnap: any, firefighterMap: Map<string, Firefighter>): Promise<Week> => {
    const data = docSnap.data();
    
    // Helper to safely get an array of firefighter objects from IDs
    const getFirefighterObjects = (ids: string[] | undefined): Firefighter[] => {
        if (!ids) return [];
        return ids.map(id => firefighterMap.get(id)).filter(f => f !== undefined) as Firefighter[];
    };
    
    // Create an enriched object that matches the Week type more closely for client-side use
    const week: Week & { lead?: Firefighter, driver?: Firefighter, members?: Firefighter[] } = {
        id: docSnap.id,
        ...data,
        lead: firefighterMap.get(data.leadId),
        driver: firefighterMap.get(data.driverId),
        members: getFirefighterObjects(data.memberIds),
    };
    return week as Week;
}


export const getWeeks = async (): Promise<Week[]> => {
    const q = query(weeksCollection, orderBy('periodStartDate', 'desc'));
    const querySnapshot = await getDocs(q);

    // Fetch all firefighters once to create a lookup map
    const allFirefighters = await getFirefighters();
    const firefighterMap = new Map(allFirefighters.map(f => [f.id, f]));
    
    // Process all weeks asynchronously
    const weeksPromises = querySnapshot.docs.map(doc => docToWeek(doc, firefighterMap));
    const weeks = await Promise.all(weeksPromises);

    return weeks;
}


export const addWeek = async (weekData: Omit<Week, 'id'>): Promise<string> => {
    // Ensure all members are included in the memberIds list for consistency
    const allMemberIds = Array.from(new Set([weekData.leadId, weekData.driverId, ...weekData.memberIds]));
    
    const dataToSave = {
        ...weekData,
        memberIds: allMemberIds
    };

    const docRef = await addDoc(weeksCollection, dataToSave);
    return docRef.id;
};
