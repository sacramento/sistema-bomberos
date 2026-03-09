
'use client';

import { MaterialRequest, LoggedInUser } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, addDoc, getDocs, query, where, orderBy, doc, updateDoc, getDoc } from 'firebase/firestore';
import { logAction } from './audit.service';
import { updateMaterial, deleteMaterial } from './materials.service';

const getRequestsCollection = () => collection(db, 'material_requests');

export const getPendingMaterialRequests = async (): Promise<MaterialRequest[]> => {
    const q = query(
        getRequestsCollection(), 
        where('status', '==', 'PENDING'), 
        orderBy('requestedAt', 'desc')
    );
    
    try {
        const querySnapshot = await getDocs(q);
        const requests: MaterialRequest[] = [];
        querySnapshot.forEach((doc) => {
            requests.push({ id: doc.id, ...doc.data() } as MaterialRequest);
        });
        return requests;
    } catch (error) {
        console.error("Error fetching material requests:", error);
        return [];
    }
};

export const createMaterialRequest = async (requestData: Omit<MaterialRequest, 'id' | 'status' | 'requestedAt'>): Promise<string> => {
    const dataToSave = {
        ...requestData,
        status: 'PENDING' as const,
        requestedAt: new Date().toISOString(),
    };
    const docRef = await addDoc(getRequestsCollection(), dataToSave);
    return docRef.id;
};

export const resolveMaterialRequest = async (
    requestId: string, 
    status: 'APPROVED' | 'REJECTED', 
    actor: LoggedInUser
): Promise<void> => {
    if (!actor) throw new Error("Actor required");
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
