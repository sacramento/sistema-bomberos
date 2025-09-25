import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { app } from "@/lib/firebase/firebase";

if (!app) {
    throw new Error("Firebase is not initialized. Check your Firebase configuration.");
}

const storage = getStorage(app);

/**
 * Uploads a profile image for a user.
 * It will overwrite any existing image for that user.
 * @param userId The ID of the user.
 * @param file The image file to upload.
 * @returns The public URL of the uploaded image.
 */
export const uploadProfileImage = async (userId: string, file: File): Promise<string> => {
    // We use a fixed file name to ensure there's only one profile picture per user.
    const imagePath = `profile_images/${userId}/profile.jpg`;
    const storageRef = ref(storage, imagePath);

    try {
        // Upload the new file
        const snapshot = await uploadBytes(storageRef, file);
        
        // Get the public URL for the file
        const downloadURL = await getDownloadURL(snapshot.ref);
        
        return downloadURL;
    } catch (error) {
        console.error("Error uploading profile image: ", error);
        throw new Error("No se pudo subir la imagen de perfil.");
    }
};

/**
 * Deletes a user's profile image.
 * @param userId The ID of the user.
 */
export const deleteProfileImage = async (userId: string): Promise<void> => {
    const imagePath = `profile_images/${userId}/profile.jpg`;
    const storageRef = ref(storage, imagePath);

    try {
        await deleteObject(storageRef);
    } catch (error: any) {
        // It's okay if the file doesn't exist, we just ignore that error.
        if (error.code !== 'storage/object-not-found') {
            console.error("Error deleting profile image: ", error);
            throw new Error("No se pudo eliminar la imagen de perfil.");
        }
    }
};
