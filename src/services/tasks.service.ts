
'use server';

import { Task, Firefighter } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, addDoc, getDocs, query, where, orderBy, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
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
        assignedTo,
    };
    return task;
}

export const getTasksByWeek = async (weekId: string): Promise<Task[]> => {
    const q = query(tasksCollection, where('weekId', '==', weekId), orderBy('dueDate', 'asc'));
    const querySnapshot = await getDocs(q);
    
    const allFirefighters = await getFirefighters();
    const firefighterMap = new Map(allFirefighters.map(f => [f.id, f]));
    
    const tasksPromises = querySnapshot.docs.map(doc => docToTask(doc, firefighterMap));
    const tasks = await Promise.all(tasksPromises);

    return tasks;
}

export const addTask = async (taskData: Omit<Task, 'id' | 'assignedTo'>): Promise<string> => {
    const docRef = await addDoc(tasksCollection, taskData);
    return docRef.id;
}

export const updateTask = async (id: string, taskData: Partial<Omit<Task, 'id'>>): Promise<void> => {
    const docRef = doc(db, 'tasks', id);
    await updateDoc(docRef, taskData);
}

export const deleteTask = async (id: string): Promise<void> => {
    const docRef = doc(db, 'tasks', id);
    await deleteDoc(docRef);
}
