
'use server';

import { Course, LoggedInUser } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, getDocs, doc, deleteDoc, addDoc, updateDoc, query, orderBy, writeBatch, getDoc } from 'firebase/firestore';
import { logAction } from './audit.service';

if (!db) {
    throw new Error("Firestore is not initialized. Check your Firebase configuration.");
}

const coursesCollection = collection(db, 'courses');

export const getCourses = async (): Promise<Course[]> => {
    const q = query(coursesCollection, orderBy('startDate', 'desc'));
    const querySnapshot = await getDocs(q);
    const courses: Course[] = [];
    querySnapshot.forEach((doc) => {
        courses.push({ id: doc.id, ...doc.data() } as Course);
    });
    return courses;
};

export const addCourse = async (courseData: Omit<Course, 'id'>, actor: LoggedInUser): Promise<string> => {
    const docRef = await addDoc(coursesCollection, courseData);
    await logAction(actor, 'CREATE_COURSE', { entity: 'course', id: docRef.id }, courseData);
    return docRef.id;
};

export const batchAddCourses = async (coursesData: Omit<Course, 'id'>[], actor: LoggedInUser): Promise<void> => {
    if (!coursesData || coursesData.length === 0) return;

    const batch = writeBatch(db);

    coursesData.forEach(course => {
        const newDocRef = doc(coursesCollection);
        batch.set(newDocRef, course);
    });

    await batch.commit();
    await logAction(actor, 'BATCH_CREATE_COURSES', { entity: 'course', id: 'batch' }, { count: coursesData.length });
}

export const updateCourse = async (id: string, courseData: Partial<Omit<Course, 'id'>>, actor: LoggedInUser): Promise<void> => {
    const docRef = doc(db, 'courses', id);
    await updateDoc(docRef, courseData);
    await logAction(actor, 'UPDATE_COURSE', { entity: 'course', id }, courseData);
};

export const deleteCourse = async (id: string, actor: LoggedInUser): Promise<void> => {
    const docRef = doc(db, 'courses', id);
    const docSnap = await getDoc(docRef);
    const details = docSnap.exists() ? { firefighterName: docSnap.data().firefighterName } : {};
    await deleteDoc(docRef);
    await logAction(actor, 'DELETE_COURSE', { entity: 'course', id }, details);
};
