'use client';

import { Task, Firefighter, LoggedInUser } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, addDoc, getDocs, query, where, doc, getDoc, updateDoc, deleteDoc, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore';
import { getFirefighters } from './firefighters.service';
import { parseISO } from 'date-fns';
import { logAction } from './audit.service';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const tasksCollection = collection(db, 'tasks');

const docToTask = async (docSnap: any, firefighterMap: Map<string, Firefighter>): Promise<Task> => {
    const data = docSnap.data();
    const assignedTo = (data.assignedToIds || []).map((id: string) => firefighterMap.get(id)).filter(Boolean) as Firefighter[];
    let createdAtString: string | null = null;
    if (data.createdAt && typeof data.createdAt.toDate === 'function') {
        createdAtString = data.createdAt.toDate().toISOString();
    } else if (typeof data.createdAt === 'string') {
        createdAtString = data.createdAt;
    } else if (data.createdAt?.seconds) { 
        try {
            const timestamp = new Timestamp(data.createdAt.seconds, data.createdAt.nanoseconds);
            createdAtString = timestamp.toDate().toISOString();
        } catch (e) {}
    }
    return { id: docSnap.id, weekId: data.weekId, title: data.title, description: data.description, assignedToIds: data.assignedToIds, status: data.status, createdAt: createdAtString, startDate: data.startDate, endDate: data.endDate, assignedTo };
}

export const getAllTasks = async (): Promise<Task[]> => {
    if (!db) return [];
    return getDocs(tasksCollection)
        .then(async (querySnapshot) => {
            const firefighters = await getFirefighters();
            const firefighterMap = new Map(firefighters.map(f => [f.id, f]));
            const tasksPromises = querySnapshot.docs.map(doc => docToTask(doc, firefighterMap));
            const tasks = await Promise.all(tasksPromises);
            return tasks.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        })
        .catch(async (error) => {
            const permissionError = new FirestorePermissionError({
                path: tasksCollection.path,
                operation: 'list',
            });
            errorEmitter.emit('permission-error', permissionError);
            return [];
        });
};

export const getTasksByWeek = async (weekId: string): Promise<Task[]> => {
    if (!db) return [];
    const q = query(tasksCollection, where('weekId', '==', weekId));
    return getDocs(q)
        .then(async (querySnapshot) => {
            const firefighters = await getFirefighters();
            const firefighterMap = new Map(firefighters.map(f => [f.id, f]));
            const tasksPromises = querySnapshot.docs.map(doc => docToTask(doc, firefighterMap));
            const tasks = await Promise.all(tasksPromises);
            return tasks.sort((a, b) => a.title.localeCompare(b.title));
        })
        .catch(async (error) => {
            const permissionError = new FirestorePermissionError({
                path: tasksCollection.path,
                operation: 'list',
            });
            errorEmitter.emit('permission-error', permissionError);
            return [];
        });
}

export const addTask = async (taskData: Omit<Task, 'id' | 'assignedTo' | 'createdAt'>, actor: LoggedInUser): Promise<string | void> => {
    if (!db) return;
    const dataToSave = { ...taskData, createdAt: serverTimestamp() };
    const docRef = doc(tasksCollection);
    setDoc(docRef, dataToSave).catch(async (error) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'create',
            requestResourceData: dataToSave,
        });
        errorEmitter.emit('permission-error', permissionError);
    });
    if (actor) logAction(actor, 'CREATE_TASK', { entity: 'task', id: docRef.id }, taskData);
    return docRef.id;
}

export const updateTask = async (id: string, taskData: Partial<Omit<Task, 'id' | 'assignedTo' | 'createdAt'>>, actor: LoggedInUser): Promise<void> => {
    if (!db) return;
    const docRef = doc(db, 'tasks', id);
    const dataToUpdate: any = { ...taskData };
    delete dataToUpdate.createdAt;
    updateDoc(docRef, dataToUpdate).catch(async (error) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: dataToUpdate,
        });
        errorEmitter.emit('permission-error', permissionError);
    });
    if (actor) logAction(actor, 'UPDATE_TASK', { entity: 'task', id }, dataToUpdate);
}

export const deleteTask = async (id: string, actor: LoggedInUser): Promise<void> => {
    if (!db) return;
    const docRef = doc(db, 'tasks', id);
    deleteDoc(docRef).catch(async (error) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
    });
    if (actor) logAction(actor, 'DELETE_TASK', { entity: 'task', id });
}
