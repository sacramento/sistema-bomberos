'use client';

import { User, LoggedInUser } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { logAction } from './audit.service';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const USERS_COLLECTION = 'users';

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
            const permissionError = new FirestorePermissionError({
                path: colRef.path,
                operation: 'list',
            });
            errorEmitter.emit('permission-error', permissionError);
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
            const permissionError = new FirestorePermissionError({
                path: docRef.path,
                operation: 'get',
            });
            errorEmitter.emit('permission-error', permissionError);
            return null;
        });
}

export const addUser = (id: string, userData: Omit<User, 'id'>, actor: LoggedInUser) => {
    if (!db) return;
    const docRef = doc(db, USERS_COLLECTION, id);
    
    setDoc(docRef, userData).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'create',
            requestResourceData: userData,
        });
        errorEmitter.emit('permission-error', permissionError);
    });

    if (actor) {
        logAction(actor, 'CREATE_USER', { entity: 'user', id }, userData);
    }
};

export const updateUser = (id: string, userData: Partial<Omit<User, 'id'>>, actor: LoggedInUser) => {
    if (!db) return;
    const docRef = doc(db, USERS_COLLECTION, id);

    const dataToUpdate = { ...userData };
    if (dataToUpdate.password === '') delete dataToUpdate.password;

    updateDoc(docRef, dataToUpdate).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: dataToUpdate,
        });
        errorEmitter.emit('permission-error', permissionError);
    });

    if (actor) {
        logAction(actor, 'UPDATE_USER', { entity: 'user', id }, dataToUpdate);
    }
};

export const deleteUser = (id: string, actor: LoggedInUser) => {
    if (!db) return;
    const docRef = doc(db, USERS_COLLECTION, id);
    
    deleteDoc(docRef).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
    });

    if (actor) {
        logAction(actor, 'DELETE_USER', { entity: 'user', id }, { legajo: id });
    }
};
