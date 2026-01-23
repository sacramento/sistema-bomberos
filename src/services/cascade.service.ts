
'use server';

import { CascadeCharge, Material, LoggedInUser, CascadeSystemCharge } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, addDoc, getDocs, query, where, serverTimestamp, orderBy, Timestamp, doc } from 'firebase/firestore';
import { logAction } from './audit.service';

if (!db) {
    throw new Error("Firestore is not initialized. Check your Firebase configuration.");
}

const cascadeCollection = collection(db, 'cascade_charges');
const cascadeSystemCollection = collection(db, 'cascade_system_charges');
const materialsCollection = collection(db, 'materials');

export const addCascadeCharge = async (materialCode: string, actor: LoggedInUser): Promise<string> => {
    if (!actor) {
        throw new Error("Usuario no autenticado.");
    }

    // Find the material (ERA tube) by its code
    const materialQuery = query(materialsCollection, where("codigo", "==", materialCode));
    const materialSnapshot = await getDocs(materialQuery);

    if (materialSnapshot.empty) {
        throw new Error(`No se encontró ningún material con el código QR: ${materialCode}`);
    }

    const materialDoc = materialSnapshot.docs[0];
    const material = { id: materialDoc.id, ...materialDoc.data() } as Material;

    if (material.tipo !== 'RESPIRACIÓN') {
        throw new Error(`El material escaneado (código: ${materialCode}) no es un equipo de respiración.`);
    }

    const chargeData = {
        materialId: material.id,
        materialCode: material.codigo,
        chargeTimestamp: serverTimestamp(),
        cuartel: material.cuartel,
        actorId: actor.id,
        actorName: actor.name,
    };

    const docRef = await addDoc(cascadeCollection, chargeData);
    await logAction(actor, 'CREATE_CASCADE_CHARGE', { entity: 'cascadeCharge', id: docRef.id }, { materialCode: material.codigo });
    
    return docRef.id;
};

export const getCascadeCharges = async (): Promise<CascadeCharge[]> => {
    const q = query(cascadeCollection, orderBy('chargeTimestamp', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const charges: CascadeCharge[] = [];
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        let timestamp = '';
        if (data.chargeTimestamp) {
            if (data.chargeTimestamp instanceof Timestamp) {
                timestamp = data.chargeTimestamp.toDate().toISOString();
            } else if (data.chargeTimestamp.seconds) {
                timestamp = new Date(data.chargeTimestamp.seconds * 1000).toISOString();
            }
        }


        charges.push({ 
            id: doc.id,
            ...data,
            chargeTimestamp: timestamp,
         } as CascadeCharge);
    });

    return charges;
};

export const addCascadeSystemCharge = async (chargeData: Omit<CascadeSystemCharge, 'id' | 'actorId' | 'actorName'>, actor: LoggedInUser): Promise<string> => {
    if (!actor) {
        throw new Error("Usuario no autenticado.");
    }

    const dataToSave = {
        ...chargeData,
        actorId: actor.id,
        actorName: actor.name,
    };

    const docRef = await addDoc(cascadeSystemCollection, dataToSave);
    await logAction(actor, 'CREATE_CASCADE_SYSTEM_CHARGE', { entity: 'cascadeSystemCharge', id: docRef.id }, { tubes: chargeData.tubes });
    
    return docRef.id;
};

export const getCascadeSystemCharges = async (): Promise<CascadeSystemCharge[]> => {
    const q = query(cascadeSystemCollection, orderBy('startTime', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const charges: CascadeSystemCharge[] = [];
    querySnapshot.forEach((doc) => {
        const data = doc.data();

        let startTime = '';
        if (data.startTime) {
            const d = new Date(data.startTime instanceof Timestamp ? data.startTime.toDate() : data.startTime);
            if (!isNaN(d.getTime())) {
                startTime = d.toISOString();
            }
        }
        
        let endTime = '';
        if (data.endTime) {
            const d = new Date(data.endTime instanceof Timestamp ? data.endTime.toDate() : data.endTime);
            if (!isNaN(d.getTime())) {
                endTime = d.toISOString();
            }
        }

        charges.push({ 
            id: doc.id,
            tubes: data.tubes || [],
            startTime,
            endTime,
            actorId: data.actorId,
            actorName: data.actorName,
         } as CascadeSystemCharge);
    });

    return charges;
};
