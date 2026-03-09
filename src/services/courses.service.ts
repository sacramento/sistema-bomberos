'use client';

import { Course, LoggedInUser } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, getDocs, doc, deleteDoc, updateDoc, query, writeBatch, setDoc } from 'firebase/firestore';
import { logAction } from './audit.service';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * Retrieves all courses.
 */
export const getCourses = async (): Promise<Course[]> => {
    if (!db) return [];
    const coursesCollection = collection(db, 'courses');
    
    return getDocs(coursesCollection)
        .then((querySnapshot) => {
            const courses: Course[] = [];
            querySnapshot.forEach((doc) => {
                courses.push({ id: doc.id, ...doc.data() } as Course);
            });
            return courses.sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));
        })
        .catch(async (error) => {
            const permissionError = new FirestorePermissionError({
                path: coursesCollection.path,
                operation: 'list',
            });
            errorEmitter.emit('permission-error', permissionError);
            return [];
        });
};

/**
 * Adds a new course.
 */
export const addCourse = (courseData: Omit<Course, 'id'>, actor: LoggedInUser) => {
    if (!db) return;
    const coursesCollection = collection(db, 'courses');
    const docRef = doc(coursesCollection);

    setDoc(docRef, courseData).catch(async (error) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'create',
            requestResourceData: courseData,
        });
        errorEmitter.emit('permission-error', permissionError);
    });

    if (actor) {
        logAction(actor, 'CREATE_COURSE', { entity: 'course', id: docRef.id }, courseData);
    }
};

/**
 * Batch adds multiple course records.
 */
export const batchAddCourses = (coursesData: Omit<Course, 'id'>[], actor: LoggedInUser) => {
    if (!db || !coursesData || coursesData.length === 0) return;
    const batch = writeBatch(db);
    const coursesCollection = collection(db, 'courses');

    coursesData.forEach(course => {
        const newDocRef = doc(coursesCollection);
        batch.set(newDocRef, course);
    });

    batch.commit().catch(async (error) => {
        const permissionError = new FirestorePermissionError({
            path: coursesCollection.path,
            operation: 'write',
        });
        errorEmitter.emit('permission-error', permissionError);
    });

    if (actor) {
        logAction(actor, 'BATCH_CREATE_COURSES', { entity: 'course', id: 'batch' }, { count: coursesData.length });
    }
};

/**
 * Updates an existing course.
 */
export const updateCourse = (id: string, courseData: Partial<Omit<Course, 'id'>>, actor: LoggedInUser) => {
    if (!db) return;
    const docRef = doc(db, 'courses', id);
    
    updateDoc(docRef, courseData).catch(async (error) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: courseData,
        });
        errorEmitter.emit('permission-error', permissionError);
    });

    if (actor) {
        logAction(actor, 'UPDATE_COURSE', { entity: 'course', id }, courseData);
    }
};

/**
 * Deletes a course record.
 */
export const deleteCourse = (id: string, actor: LoggedInUser) => {
    if (!db) return;
    const docRef = doc(db, 'courses', id);
    
    deleteDoc(docRef).catch(async (error) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
    });

    if (actor) {
        logAction(actor, 'DELETE_COURSE', { entity: 'course', id });
    }
};
