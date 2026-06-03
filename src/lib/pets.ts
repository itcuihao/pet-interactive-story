import type { PetProfile } from "@/types";

const PETS_KEY = "pet-memory-pets";

export function getPets(): PetProfile[] {
  const stored = localStorage.getItem(PETS_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function savePets(pets: PetProfile[]): void {
  localStorage.setItem(PETS_KEY, JSON.stringify(pets));
}

export function getPetById(id: string): PetProfile | null {
  const pets = getPets();
  return pets.find((p) => p.id === id) || null;
}

export function addPet(pet: Omit<PetProfile, "id">): PetProfile {
  const pets = getPets();
  const newPet: PetProfile = {
    ...pet,
    id: crypto.randomUUID(),
  };
  savePets([...pets, newPet]);
  return newPet;
}

export function updatePet(id: string, updates: Partial<PetProfile>): void {
  const pets = getPets();
  const updated = pets.map((p) => (p.id === id ? { ...p, ...updates } : p));
  savePets(updated);
}

export function deletePet(id: string): void {
  const pets = getPets();
  const updated = pets.filter((p) => p.id !== id);
  savePets(updated);
}
