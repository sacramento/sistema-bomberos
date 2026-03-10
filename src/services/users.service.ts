
'use client';

import { User, LoggedInUser } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { logAction } from './audit.service';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const USERS_COLLECTION = 'users';

// Helper to clean undefined values for Firestore
const cleanData = (obj: any) => {
    return Object.fromEntries(
        Object.entries(obj).filter(([_, v]) => v !== undefined)
    );
};

const docToUser = (docSnap: any): User => {
    const data = docSnap.data();
    const rolesData = data.roles || {};
    const roles = {
        asistencia: rolesData.asistencia || 'Ninguno',
        semanas: rolesData.semanas || 'Ninguno',
        movilidad: rolesData.movilidad || 'Ninguno',
        materiales: rolesData.materiales || 'Ninguno',
        ayudantia: rolesData.ayudantia || 'Ninguno',
        roperia: rolesData.roperia || 'Ninguno',
        servicios: rolesData.servicios || 'Ninguno',
        cascada: rolesData.cascada || 'Ninguno',
        aspirantes: rolesData.aspirantes || 'Ninguno',
    };
    return {
        id: docSnap.id, 
        name: data.name,
        password: data.password,
        role: data.role,
        roles 
    } as User;
}

export const getUsers = async (): Promise<User[]> => {
    if (!db) return [];
    const colRef = collection(db, USERS_COLLECTION);
    return getDocs(colRef)
        .then((querySnapshot) => {
            const users: User[] = [];
            querySnapshot.forEach((doc) => {
                users.push(docToUser(doc));
            });
            return users;
        })
        .catch(async (error) => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: colRef.path,
                operation: 'list',
            }));
            return [];
        });
};

export const getUserById = async (id: string): Promise<User | null> => {
    if (!db) return null;
    const docRef = doc(db, USERS_COLLECTION, id);
    return getDoc(docRef)
        .then((docSnap) => {
            if (docSnap.exists()) {
                return docToUser(docSnap);
            }
            return null;
        })
        .catch(async (error) => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: docRef.path,
                operation: 'get',
            }));
            return null;
        });
}

export const addUser = (id: string, userData: Omit<User, 'id'>, actor: LoggedInUser) => {
    if (!db) return;
    const docRef = doc(db, USERS_COLLECTION, id);
    const cleaned = cleanData(userData);
    
    setDoc(docRef, cleaned).catch(async (serverError) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: docRef.path,
            operation: 'create',
            requestResourceData: cleaned,
        }));
    });

    if (actor) {
        logAction(actor, 'CREATE_USER', { entity: 'user', id }, cleaned);
    }
};

export const updateUser = (id: string, userData: Partial<Omit<User, 'id'>>, actor: LoggedInUser) => {
    if (!db) return;
    const docRef = doc(db, USERS_COLLECTION, id);

    const dataToUpdate = cleanData(userData);
    if (dataToUpdate.password === '') delete dataToUpdate.password;

    updateDoc(docRef, dataToUpdate).catch(async (serverError) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: dataToUpdate,
        }));
    });

    if (actor) {
        logAction(actor, 'UPDATE_USER', { entity: 'user', id }, dataToUpdate);
    }
};

export const deleteUser = (id: string, actor: LoggedInUser) => {
    if (!db) return;
    const docRef = doc(db, USERS_COLLECTION, id);
    
    deleteDoc(docRef).catch(async (serverError) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: docRef.path,
            operation: 'delete',
        }));
    });

    if (actor) {
        logAction(actor, 'DELETE_USER', { entity: 'user', id }, { legajo: id });
    }
};
