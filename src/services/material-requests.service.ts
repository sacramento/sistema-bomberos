'use client';

import { MaterialRequest, LoggedInUser } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, getDocs, query, where, orderBy, doc, updateDoc, getDoc, documentId, setDoc } from 'firebase/firestore';
import { logAction } from './audit.service';
import { updateMaterial, deleteMaterial } from './materials.service';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * Obtiene las solicitudes pendientes.
 * La consulta se sincroniza con el índice compuesto necesario.
 */
export const getPendingMaterialRequests = async (): Promise<MaterialRequest[]> => {
    if (!db) return [];
    
    const requestsCollection = collection(db, 'material_requests');
    // Usamos una consulta que coincida exactamente con el índice compuesto solicitado por Firebase
    const q = query(
        requestsCollection, 
        where('status', '==', 'PENDING'), 
        orderBy('requestedAt', 'desc')
    );
    
    return getDocs(q)
        .then((querySnapshot) => {
            const requests: MaterialRequest[] = [];
            querySnapshot.forEach((docSnap) => {
                requests.push({ id: docSnap.id, ...docSnap.data() } as MaterialRequest);
            });
            return requests;
        })
        .catch(async (error) => {
            const permissionError = new FirestorePermissionError({
                path: requestsCollection.path,
                operation: 'list',
            });
            errorEmitter.emit('permission-error', permissionError);
            return [];
        });
};

export const createMaterialRequest = async (requestData: Omit<MaterialRequest, 'id' | 'status' | 'requestedAt'>): Promise<string> => {
    if (!db) throw new Error("DB not initialized");
    const requestsCollection = collection(db, 'material_requests');
    const dataToSave = {
        ...requestData,
        status: 'PENDING' as const,
        requestedAt: new Date().toISOString(),
    };
    
    const docRef = doc(requestsCollection);
    return setDoc(docRef, dataToSave)
        .then(() => docRef.id)
        .catch(async (error) => {
            const permissionError = new FirestorePermissionError({
                path: docRef.path,
                operation: 'create',
                requestResourceData: dataToSave,
            });
            errorEmitter.emit('permission-error', permissionError);
            throw permissionError;
        });
};

export const resolveMaterialRequest = async (
    requestId: string, 
    status: 'APPROVED' | 'REJECTED', 
    actor: LoggedInUser
): Promise<void> => {
    if (!db || !actor) throw new Error("Actor or DB required");
    const requestRef = doc(db, 'material_requests', requestId);
    
    const requestSnap = await getDoc(requestRef).catch(async () => {
        const permissionError = new FirestorePermissionError({
            path: requestRef.path,
            operation: 'get',
        });
        errorEmitter.emit('permission-error', permissionError);
        return null;
    });

    if (!requestSnap || !requestSnap.exists()) return;
    const request = requestSnap.data() as MaterialRequest;

    if (status === 'APPROVED') {
        if (request.type === 'UPDATE') {
            await updateMaterial(request.materialId, request.data, actor);
        } else if (request.type === 'DELETE') {
            await deleteMaterial(request.materialId, actor);
        }
    }
    
    return updateDoc(requestRef, {
        status,
        resolvedAt: new Date().toISOString(),
        resolvedById: actor.id,
        resolvedByName: actor.name,
    }).then(() => {
        if (actor) {
            logAction(actor, status === 'APPROVED' ? 'UPDATE_MATERIAL' : 'UPDATE_USER', { entity: 'materialRequest', id: requestId }, { result: status });
        }
    }).catch(async (error) => {
        const permissionError = new FirestorePermissionError({
            path: requestRef.path,
            operation: 'update',
            requestResourceData: { status },
        });
        errorEmitter.emit('permission-error', permissionError);
    });
};
