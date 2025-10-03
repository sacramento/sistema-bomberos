
'use server';

import { Course } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, getDocs, doc, deleteDoc, addDoc, updateDoc, query, orderBy, writeBatch } from 'firebase/firestore';

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

export const addCourse = async (courseData: Omit<Course, 'id'>): Promise<string> => {
    const docRef = await addDoc(coursesCollection, courseData);
    return docRef.id;
};

export const batchAddCourses = async (coursesData: Omit<Course, 'id'>[]): Promise<void> => {
    if (!coursesData || coursesData.length === 0) return;

    const batch = writeBatch(db);

    coursesData.forEach(course => {
        const newDocRef = doc(coursesCollection);
        batch.set(newDocRef, course);
    });

    await batch.commit();
}

export const updateCourse = async (id: string, courseData: Partial<Omit<Course, 'id'>>): Promise<void> => {
    const docRef = doc(db, 'courses', id);
    await updateDoc(docRef, courseData);
};

export const deleteCourse = async (id: string): Promise<void> => {
    const docRef = doc(db, 'courses', id);
    await deleteDoc(docRef);
};
