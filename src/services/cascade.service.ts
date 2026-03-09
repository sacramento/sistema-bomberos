'use client';

import { CascadeCharge, LoggedInUser, CascadeSystemCharge } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, getDocs, query, where, serverTimestamp, orderBy, doc, setDoc } from 'firebase/firestore';
import { logAction } from './audit.service';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * Adds a new ERA tube charge.
 */
export const addCascadeCharge = async (materialCode: string, actor: LoggedInUser) => {
    if (!db || !actor) return;
    const materialsCollection = collection(db, 'materials');
    const cascadeCollection = collection(db, 'cascade_charges');
    
    const materialQuery = query(materialsCollection, where("codigo", "==", materialCode));
    
    return getDocs(materialQuery).then(async (materialSnapshot) => {
        if (materialSnapshot.empty) {
            throw new Error(`No se encontró ningún material con el código: ${materialCode}`);
        }

        const materialDoc = materialSnapshot.docs[0];
        const materialData = materialDoc.data();

        if (materialData.itemTypeId !== '01.5.3') {
            throw new Error(`El material ${materialCode} no es un tubo de aire (01.5.3).`);
        }

        const chargeData = {
            materialId: materialDoc.id,
            materialCode: materialData.codigo,
            chargeTimestamp: serverTimestamp(),
            cuartel: materialData.cuartel,
            actorId: actor.id,
            actorName: actor.name,
        };

        const docRef = doc(cascadeCollection);
        setDoc(docRef, chargeData).catch(async (error) => {
            const permissionError = new FirestorePermissionError({
                path: docRef.path,
                operation: 'create',
                requestResourceData: chargeData,
            });
            errorEmitter.emit('permission-error', permissionError);
        });

        logAction(actor, 'CREATE_CASCADE_CHARGE', { entity: 'cascadeCharge', id: docRef.id }, { materialCode: materialData.codigo });
    });
};

/**
 * Retrieves recent cascade charges.
 */
export const getCascadeCharges = async (): Promise<CascadeCharge[]> => {
    if (!db) return [];
    const cascadeCollection = collection(db, 'cascade_charges');
    
    return getDocs(cascadeCollection)
        .then((querySnapshot) => {
            const charges: CascadeCharge[] = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                chargeTimestamp: doc.data().chargeTimestamp?.toDate?.()?.toISOString() || null
            } as CascadeCharge));
            
            return charges.sort((a, b) => (b.chargeTimestamp || '').localeCompare(a.chargeTimestamp || ''));
        })
        .catch(async (error) => {
            const permissionError = new FirestorePermissionError({
                path: cascadeCollection.path,
                operation: 'list',
            });
            errorEmitter.emit('permission-error', permissionError);
            return [];
        });
};

/**
 * Adds a new system cascade charge.
 */
export const addCascadeSystemCharge = (chargeData: Omit<CascadeSystemCharge, 'id' | 'actorId' | 'actorName'>, actor: LoggedInUser) => {
    if (!db || !actor) return;
    const cascadeSystemCollection = collection(db, 'cascade_system_charges');
    const docRef = doc(cascadeSystemCollection);

    const dataToSave = {
        ...chargeData,
        actorId: actor.id,
        actorName: actor.name,
    };

    setDoc(docRef, dataToSave).catch(async (error) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'create',
            requestResourceData: dataToSave,
        });
        errorEmitter.emit('permission-error', permissionError);
    });

    logAction(actor, 'CREATE_CASCADE_SYSTEM_CHARGE', { entity: 'cascadeSystemCharge', id: docRef.id }, { tubes: chargeData.tubes });
};

/**
 * Retrieves system cascade charges.
 */
export const getCascadeSystemCharges = async (): Promise<CascadeSystemCharge[]> => {
    if (!db) return [];
    const cascadeSystemCollection = collection(db, 'cascade_system_charges');
    
    return getDocs(cascadeSystemCollection)
        .then((querySnapshot) => {
            const charges: CascadeSystemCharge[] = querySnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    startTime: data.startTime ? new Date(data.startTime).toISOString() : null,
                    endTime: data.endTime ? new Date(data.endTime).toISOString() : null,
                } as CascadeSystemCharge;
            });
            return charges.sort((a, b) => (b.startTime || '').localeCompare(a.startTime || ''));
        })
        .catch(async (error) => {
            const permissionError = new FirestorePermissionError({
                path: cascadeSystemCollection.path,
                operation: 'list',
            });
            errorEmitter.emit('permission-error', permissionError);
            return [];
        });
};
