
'use server';

import { Task, Firefighter } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, addDoc, getDocs, query, where, doc, getDoc, updateDoc, deleteDoc, serverTimestamp, orderBy, Timestamp } from 'firebase/firestore';
import { getFirefighters } from './firefighters.service';

if (!db) {
    throw new Error("Firestore is not initialized. Check your Firebase configuration.");
}

const tasksCollection = collection(db, 'tasks');

const docToTask = async (docSnap: any, firefighterMap: Map<string, Firefighter>): Promise<Task> => {
    const data = docSnap.data();
    
    const assignedTo = (data.assignedToIds || []).map((id: string) => firefighterMap.get(id)).filter(Boolean) as Firefighter[];

    const task: Task = {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt : null, // Handle missing or incorrect timestamp
        assignedTo,
    };
    return task;
}

export const getAllTasks = async (): Promise<Task[]> => {
    // Order by creation date descending
    const q = query(tasksCollection, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const allFirefighters = await getFirefighters();
    const firefighterMap = new Map(allFirefighters.map(f => [f.id, f]));
    
    const tasksPromises = querySnapshot.docs.map(doc => docToTask(doc, firefighterMap));
    const tasks = await Promise.all(tasksPromises);

    return tasks;
};

export const getTasksByWeek = async (weekId: string): Promise<Task[]> => {
    // This can still be ordered as it's a more controlled query
    const q = query(tasksCollection, where('weekId', '==', weekId), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const allFirefighters = await getFirefighters();
    const firefighterMap = new Map(allFirefighters.map(f => [f.id, f]));
    
    const tasksPromises = querySnapshot.docs.map(doc => docToTask(doc, firefighterMap));
    const tasks = await Promise.all(tasksPromises);

    return tasks.sort((a, b) => a.title.localeCompare(b.title));
}

export const addTask = async (taskData: Omit<Task, 'id' | 'assignedTo' | 'createdAt'>): Promise<string> => {
    const dataToSave = {
        ...taskData,
        createdAt: serverTimestamp(),
    }
    const docRef = await addDoc(tasksCollection, dataToSave);
    return docRef.id;
}

export const updateTask = async (id: string, taskData: Partial<Omit<Task, 'id' | 'assignedTo'>>): Promise<void> => {
    const docRef = doc(db, 'tasks', id);
    await updateDoc(docRef, taskData);
}

export const deleteTask = async (id: string): Promise<void> => {
    const docRef = doc(db, 'tasks', id);
    await deleteDoc(docRef);
}
