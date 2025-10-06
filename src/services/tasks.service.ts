
'use server';

import { Task, Firefighter } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, addDoc, getDocs, query, where, doc, getDoc, updateDoc, deleteDoc, serverTimestamp, orderBy, Timestamp } from 'firebase/firestore';
import { getFirefighters } from './firefighters.service';
import { parseISO } from 'date-fns';

if (!db) {
    throw new Error("Firestore is not initialized. Check your Firebase configuration.");
}

const tasksCollection = collection(db, 'tasks');

const docToTask = async (docSnap: any, firefighterMap: Map<string, Firefighter>): Promise<Task> => {
    const data = docSnap.data();
    
    const assignedTo = (data.assignedToIds || []).map((id: string) => firefighterMap.get(id)).filter(Boolean) as Firefighter[];

    let createdAtString: string | null = null;
    if (data.createdAt && typeof data.createdAt.toDate === 'function') {
        // This is the most reliable way to check for a Firestore Timestamp
        createdAtString = data.createdAt.toDate().toISOString();
    } else if (typeof data.createdAt === 'string') {
        // If it's already a string, use it directly
        createdAtString = data.createdAt;
    } else if (data.createdAt?.seconds) { 
        // Fallback for plain object representation of Timestamp
        try {
            const timestamp = new Timestamp(data.createdAt.seconds, data.createdAt.nanoseconds);
            createdAtString = timestamp.toDate().toISOString();
        } catch (e) {
            console.error("Could not parse createdAt object", data.createdAt);
        }
    }

    const task: Task = {
        id: docSnap.id,
        weekId: data.weekId,
        title: data.title,
        description: data.description,
        assignedToIds: data.assignedToIds,
        status: data.status,
        createdAt: createdAtString,
        assignedTo,
    };
    return task;
}

export const getAllTasks = async (): Promise<Task[]> => {
    const q = query(tasksCollection);
    const querySnapshot = await getDocs(q);
    
    const allFirefighters = await getFirefighters();
    const firefighterMap = new Map(allFirefighters.map(f => [f.id, f]));
    
    const tasksPromises = querySnapshot.docs.map(doc => docToTask(doc, firefighterMap));
    let tasks = await Promise.all(tasksPromises);

    // Sort by creation date descending (newest first) on the server-side after fetching.
    tasks.sort((a, b) => {
        const dateA = a.createdAt ? parseISO(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? parseISO(b.createdAt).getTime() : 0;
        return dateB - dateA;
    });

    return tasks;
};

export const getTasksByWeek = async (weekId: string): Promise<Task[]> => {
    const q = query(tasksCollection, where('weekId', '==', weekId));
    const querySnapshot = await getDocs(q);
    
    const allFirefighters = await getFirefighters();
    const firefighterMap = new Map(allFirefighters.map(f => [f.id, f]));
    
    const tasksPromises = querySnapshot.docs.map(doc => docToTask(doc, firefighterMap));
    let tasks = await Promise.all(tasksPromises);

    // Sort by title client-side
    tasks = tasks.sort((a, b) => a.title.localeCompare(b.title));
    return tasks;
}

export const addTask = async (taskData: Omit<Task, 'id' | 'assignedTo' | 'createdAt'>): Promise<string> => {
    const dataToSave = {
        ...taskData,
        createdAt: serverTimestamp(),
    };
    const docRef = await addDoc(tasksCollection, dataToSave);
    return docRef.id;
}

export const updateTask = async (id: string, taskData: Partial<Omit<Task, 'id' | 'assignedTo' | 'createdAt'>>): Promise<void> => {
    const docRef = doc(db, 'tasks', id);
    const dataToUpdate: any = { ...taskData };
    
     // Prevent 'createdAt' from being overwritten on updates.
    delete dataToUpdate.createdAt;
    
    await updateDoc(docRef, dataToUpdate);
}

export const deleteTask = async (id: string): Promise<void> => {
    const docRef = doc(db, 'tasks', id);
    await deleteDoc(docRef);
}

    