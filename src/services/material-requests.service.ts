'use client';

import { MaterialRequest, LoggedInUser } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, getDocs, query, where, doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { logAction } from './audit.service';
import { updateMaterial, deleteMaterial } from './materials.service';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const REQUESTS_COLLECTION = 'material_requests';

export const getPendingMaterialRequests = async (): Promise<MaterialRequest[]> => {
    if (!db) return [];
    const colRef = collection(db, REQUESTS_COLLECTION);
    const q = query(colRef, where('status', '==', 'PENDING'));
    
    return getDocs(q)
        .then((querySnapshot) => {
            const requests: MaterialRequest[] = querySnapshot.docs.map(docSnap => ({
                id: docSnap.id,
                ...docSnap.data()
            } as MaterialRequest));
            
            return requests.sort((a, b) => (a.requestedAt || '').localeCompare(b.requestedAt || ''));
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

export const createMaterialRequest = (requestData: Omit<MaterialRequest, 'id' | 'status' | 'requestedAt'>) => {
    if (!db) return;
    const colRef = collection(db, REQUESTS_COLLECTION);
    const dataToSave = {
        ...requestData,
        status: 'PENDING' as const,
        requestedAt: new Date().toISOString(),
    };
    
    const docRef = doc(colRef);
    setDoc(docRef, dataToSave).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'create',
            requestResourceData: dataToSave,
        });
        errorEmitter.emit('permission-error', permissionError);
    });
};

export const resolveMaterialRequest = async (requestId: string, status: 'APPROVED' | 'REJECTED', actor: LoggedInUser) => {
    if (!db || !actor) return;
    const docRef = doc(db, REQUESTS_COLLECTION, requestId);
    
    const requestSnap = await getDoc(docRef).catch(async () => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'get' }));
        return null;
    });

    if (!requestSnap || !requestSnap.exists()) return;
    const request = requestSnap.data() as MaterialRequest;

    if (status === 'APPROVED') {
        if (request.type === 'UPDATE') {
            updateMaterial(request.materialId, request.data, actor);
        } else if (request.type === 'DELETE') {
            deleteMaterial(request.materialId, actor);
        }
    }
    
    const updateData = {
        status,
        resolvedAt: new Date().toISOString(),
        resolvedById: actor.id,
        resolvedByName: actor.name,
    };

    updateDoc(docRef, updateData).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: updateData,
        });
        errorEmitter.emit('permission-error', permissionError);
    });

    logAction(actor, status === 'APPROVED' ? 'UPDATE_MATERIAL' : 'UPDATE_USER', { entity: 'materialRequest', id: requestId }, { result: status });
};
