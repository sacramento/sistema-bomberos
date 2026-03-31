
'use client';

import { Task, Firefighter, LoggedInUser } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, getDocs, query, where, doc, updateDoc, deleteDoc, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore';
import { getFirefighters } from './firefighters.service';
import { logAction } from './audit.service';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * Helper para eliminar campos con valor 'undefined' sin romper objetos especiales de Firestore.
 */
const cleanData = (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    // No limpiar ni recorrer recursivamente objetos de Firestore ni Fechas
    // Detectamos FieldValue por sus propiedades internas o nombre de constructor
    if (obj instanceof Date || obj.constructor?.name === 'Timestamp' || obj.constructor?.name === 'FieldValue' || obj._methodName) {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(cleanData);
    }

    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
            cleaned[key] = cleanData(value);
        }
    }
    return cleaned;
};

const docToTask = (docSnap: any, firefighterMap: Map<string, Firefighter>): Task => {
    const data = docSnap.data();
    const assignedTo = (data.assignedToIds || []).map((id: string) => firefighterMap.get(id)).filter(Boolean) as Firefighter[];
    let createdAtString: string | null = null;
    
    if (data.createdAt) {
        if (data.createdAt instanceof Timestamp) {
            createdAtString = data.createdAt.toDate().toISOString();
        } else if (typeof data.createdAt.toDate === 'function') {
            createdAtString = data.createdAt.toDate().toISOString();
        } else if (data.createdAt.seconds) {
            createdAtString = new Date(data.createdAt.seconds * 1000).toISOString();
        } else if (data.createdAt instanceof Date) {
            createdAtString = data.createdAt.toISOString();
        } else if (typeof data.createdAt === 'string') {
            createdAtString = data.createdAt;
        }
    }

    return { 
        id: docSnap.id, 
        weekId: data.weekId, 
        title: data.title, 
        description: data.description, 
        assignedToIds: data.assignedToIds, 
        status: data.status, 
        createdAt: createdAtString, 
        startDate: data.startDate, 
        endDate: data.endDate, 
        assignedTo 
    };
}

export const getAllTasks = async (): Promise<Task[]> => {
    if (!db) return [];
    const tasksCollection = collection(db, 'tasks');
    return getDocs(tasksCollection)
        .then(async (querySnapshot) => {
            const firefighters = await getFirefighters();
            const firefighterMap = new Map(firefighters.map(f => [f.id, f]));
            const tasks = querySnapshot.docs.map(doc => docToTask(doc, firefighterMap));
            return tasks.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        })
        .catch(async (error) => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: tasksCollection.path,
                operation: 'list',
            }));
            return [];
        });
};

export const getTasksByWeek = async (weekId: string): Promise<Task[]> => {
    if (!db) return [];
    const tasksCollection = collection(db, 'tasks');
    const q = query(tasksCollection, where('weekId', '==', weekId));
    return getDocs(q)
        .then(async (querySnapshot) => {
            const firefighters = await getFirefighters();
            const firefighterMap = new Map(firefighters.map(f => [f.id, f]));
            const tasks = querySnapshot.docs.map(doc => docToTask(doc, firefighterMap));
            return tasks.sort((a, b) => a.title.localeCompare(b.title));
        })
        .catch(async (error) => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: tasksCollection.path,
                operation: 'list',
            }));
            return [];
        });
}

export const addTask = async (taskData: Omit<Task, 'id' | 'assignedTo' | 'createdAt'>, actor: LoggedInUser): Promise<string | void> => {
    if (!db) return;
    const tasksCollection = collection(db, 'tasks');
    
    // Limpiamos los datos base y añadimos el serverTimestamp por separado
    const cleanedTaskData = cleanData(taskData);
    const dataToSave = { 
        ...cleanedTaskData, 
        createdAt: serverTimestamp() 
    };

    const docRef = doc(tasksCollection);
    setDoc(docRef, dataToSave).catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: docRef.path,
            operation: 'create',
            requestResourceData: dataToSave,
        }));
    });

    if (actor) {
        logAction(actor, 'CREATE_TASK', { entity: 'task', id: docRef.id }, taskData);
    }
    return docRef.id;
}

export const updateTask = async (id: string, taskData: Partial<Omit<Task, 'id' | 'assignedTo' | 'createdAt'>>, actor: LoggedInUser): Promise<void> => {
    if (!db) return;
    const docRef = doc(db, 'tasks', id);
    
    const dataToUpdate = cleanData({ ...taskData });
    // Nos aseguramos de no sobreescribir el createdAt original al actualizar
    delete dataToUpdate.createdAt;

    updateDoc(docRef, dataToUpdate).catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: dataToUpdate,
        }));
    });

    if (actor) {
        logAction(actor, 'UPDATE_TASK', { entity: 'task', id }, dataToUpdate);
    }
}

export const deleteTask = async (id: string, actor: LoggedInUser): Promise<void> => {
    if (!db) return;
    const docRef = doc(db, 'tasks', id);
    
    deleteDoc(docRef).catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: docRef.path,
            operation: 'delete',
        }));
    });

    if (actor) {
        logAction(actor, 'DELETE_TASK', { entity: 'task', id });
    }
}
