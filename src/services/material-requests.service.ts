'use client';

import { MaterialRequest, LoggedInUser } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, addDoc, getDocs, query, where, orderBy, doc, updateDoc, getDoc, documentId } from 'firebase/firestore';
import { logAction } from './audit.service';
import { updateMaterial, deleteMaterial } from './materials.service';

/**
 * Obtiene las solicitudes pendientes.
 * Sincronizado exactamente con el índice compuesto solicitado por Firebase.
 */
export const getPendingMaterialRequests = async (): Promise<MaterialRequest[]> => {
    if (!db) return [];
    
    const requestsCollection = collection(db, 'material_requests');
    // Consulta optimizada e indexada
    const q = query(
        requestsCollection, 
        where('status', '==', 'PENDING'), 
        orderBy('requestedAt', 'desc'),
        orderBy(documentId(), 'desc')
    );
    
    try {
        const querySnapshot = await getDocs(q);
        const requests: MaterialRequest[] = [];
        querySnapshot.forEach((docSnap) => {
            requests.push({ id: docSnap.id, ...docSnap.data() } as MaterialRequest);
        });
        return requests;
    } catch (error) {
        console.error("Error fetching material requests:", error);
        return [];
    }
};

export const createMaterialRequest = async (requestData: Omit<MaterialRequest, 'id' | 'status' | 'requestedAt'>): Promise<string> => {
    if (!db) throw new Error("DB not initialized");
    const requestsCollection = collection(db, 'material_requests');
    const dataToSave = {
        ...requestData,
        status: 'PENDING' as const,
        requestedAt: new Date().toISOString(),
    };
    const docRef = await addDoc(requestsCollection, dataToSave);
    return docRef.id;
};

export const resolveMaterialRequest = async (
    requestId: string, 
    status: 'APPROVED' | 'REJECTED', 
    actor: LoggedInUser
): Promise<void> => {
    if (!db || !actor) throw new Error("Actor or DB required");
    const requestRef = doc(db, 'material_requests', requestId);
    const requestSnap = await getDoc(requestRef);
    if (!requestSnap.exists()) throw new Error("Request not found");
    const request = requestSnap.data() as MaterialRequest;

    if (status === 'APPROVED') {
        if (request.type === 'UPDATE') {
            await updateMaterial(request.materialId, request.data, actor);
        } else if (request.type === 'DELETE') {
            await deleteMaterial(request.materialId, actor);
        }
    }
    await updateDoc(requestRef, {
        status,
        resolvedAt: new Date().toISOString(),
        resolvedById: actor.id,
        resolvedByName: actor.name,
    });
    await logAction(actor, status === 'APPROVED' ? 'UPDATE_MATERIAL' : 'UPDATE_USER', { entity: 'materialRequest', id: requestId }, { result: status });
};
