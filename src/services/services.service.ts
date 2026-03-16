
'use client';

import { db } from '@/lib/firebase/firestore';
import { Service, Firefighter, Vehicle, LoggedInUser } from '@/lib/types';
import { collection, getDocs, query, orderBy, doc, updateDoc, deleteDoc, setDoc, getDoc } from 'firebase/firestore';
import { getFirefighters } from './firefighters.service';
import { getVehicles } from './vehicles.service';
import { logAction } from './audit.service';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const cleanData = (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) return obj;
    return Object.fromEntries(
        Object.entries(obj)
            .filter(([_, v]) => v !== undefined)
            .map(([k, v]) => [k, v === Object(v) && !Array.isArray(v) ? cleanData(v) : v])
    );
};

/**
 * Retrieves all services.
 */
export const getServices = async (): Promise<Service[]> => {
    if (!db) return [];
    const servicesCollection = collection(db, 'services');
    const q = query(servicesCollection, orderBy('startDateTime', 'desc'));
    
    return getDocs(q)
        .then(async (servicesSnapshot) => {
            const [firefighters, vehicles] = await Promise.all([getFirefighters(), getVehicles()]);
            const firefighterMap = new Map(firefighters.map(f => [f.id, f]));
            const vehicleMap = new Map(vehicles.map(v => [v.id, v]));
            
            const results: Service[] = servicesSnapshot.docs.map(docSnap => {
                const data = docSnap.data();
                const getPersonnel = (id?: string) => id ? firefighterMap.get(id) : undefined;
                const getPersonnelList = (ids?: string[]) => ids?.map(id => firefighterMap.get(id)).filter((f): f is Firefighter => !!f) || [];

                return {
                    id: docSnap.id,
                    ...data,
                    status: data.status || 'Activo',
                    command: getPersonnel(data.commandId),
                    serviceChief: getPersonnel(data.serviceChiefId),
                    stationOfficer: getPersonnel(data.stationOfficerId),
                    onDutyPersonnel: getPersonnelList(data.onDutyIds),
                    offDutyPersonnel: getPersonnelList(data.offDutyIds),
                } as Service;
            });
            return results;
        })
        .catch(async (error) => {
            const permissionError = new FirestorePermissionError({
                path: servicesCollection.path,
                operation: 'list',
            });
            errorEmitter.emit('permission-error', permissionError);
            return [];
        });
};

/**
 * Retrieves a single service by ID with enriched personnel data.
 */
export const getServiceById = async (id: string): Promise<Service | null> => {
    if (!db) return null;
    const docRef = doc(db, 'services', id);
    
    return getDoc(docRef)
        .then(async (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const firefighters = await getFirefighters();
                const firefighterMap = new Map(firefighters.map(f => [f.id, f]));
                
                const getPersonnel = (id?: string) => id ? firefighterMap.get(id) : undefined;
                const getPersonnelList = (ids?: string[]) => ids?.map(id => firefighterMap.get(id)).filter((f): f is Firefighter => !!f) || [];

                return {
                    id: docSnap.id,
                    ...data,
                    status: data.status || 'Activo',
                    command: getPersonnel(data.commandId),
                    serviceChief: getPersonnel(data.serviceChiefId),
                    stationOfficer: getPersonnel(data.stationOfficerId),
                    onDutyPersonnel: getPersonnelList(data.onDutyIds),
                    offDutyPersonnel: getPersonnelList(data.offDutyIds),
                } as Service;
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
};

/**
 * Adds a new service record.
 */
export const addService = (serviceData: any, actor: LoggedInUser) => {
    if (!db) return;
    const servicesCollection = collection(db, 'services');
    const docRef = doc(servicesCollection);
    
    const dataToSave = cleanData({ 
        ...serviceData,
        year: new Date(serviceData.startDateTime).getFullYear(),
        manualId: Number(serviceData.manualId),
        zone: Number(serviceData.zone),
        status: serviceData.status || 'Activo',
        endDateTime: serviceData.endDateTime || serviceData.startDateTime
    });

    setDoc(docRef, dataToSave).catch(async (error) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'create',
            requestResourceData: dataToSave,
        });
        errorEmitter.emit('permission-error', permissionError);
    });

    if (actor) {
        logAction(actor, 'CREATE_SERVICE', { entity: 'service', id: docRef.id }, dataToSave);
    }
};

/**
 * Updates an existing service record.
 */
export const updateService = (id: string, serviceData: Partial<Service>, actor: LoggedInUser) => {
    if (!db) return;
    const docRef = doc(db, 'services', id);
    
    const dataToUpdate: any = cleanData({ ...serviceData });
    if (dataToUpdate.startDateTime) dataToUpdate.year = new Date(dataToUpdate.startDateTime).getFullYear();
    if (dataToUpdate.manualId) dataToUpdate.manualId = Number(dataToUpdate.manualId);
    if (dataToUpdate.zone) dataToUpdate.zone = Number(dataToUpdate.zone);

    updateDoc(docRef, dataToUpdate).catch(async (error) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: dataToUpdate,
        });
        errorEmitter.emit('permission-error', permissionError);
    });

    if (actor) {
        logAction(actor, 'UPDATE_SERVICE', { entity: 'service', id }, dataToUpdate);
    }
};

/**
 * Deletes a service record.
 */
export const deleteService = (id: string, actor: LoggedInUser) => {
    if (!db) return;
    const docRef = doc(db, 'services', id);
    
    deleteDoc(docRef).catch(async (error) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
    });

    if (actor) {
        logAction(actor, 'DELETE_SERVICE', { entity: 'service', id });
    }
};
