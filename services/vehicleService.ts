import { collection, doc, getDocs, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "./firebaseService";
import { Vehicle } from "../types";

const COLLECTION_NAME = "vehicles";

export const getVehicles = async (): Promise<Vehicle[]> => {
    const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
    return querySnapshot.docs.map(doc => doc.data() as Vehicle);
};

export const saveVehicle = async (vehicle: Vehicle): Promise<void> => {
    await setDoc(doc(db, COLLECTION_NAME, vehicle.id), vehicle);
};

export const deleteVehicle = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
};
