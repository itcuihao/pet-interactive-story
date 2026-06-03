import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/SelectField";
import type { PetProfile } from "@/types";

export function PetDialog({
  open,
  onOpenChange,
  onSave,
  editPet,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (pet: Omit<PetProfile, "id">) => void;
  editPet?: PetProfile | null;
}) {
  const [name, setName] = useState("");
  const [species, setSpecies] = useState<"cat" | "dog" | "other">("cat");
  const [breed, setBreed] = useState("");
  const [gender, setGender] = useState<"boy" | "girl">("boy");
  const [ageText, setAgeText] = useState("");
  const [personality, setPersonality] = useState("");

  useEffect(() => {
    if (open) {
      if (editPet) {
        setName(editPet.name);
        setSpecies(editPet.species);
        setBreed(editPet.breed);
        setGender(editPet.gender);
        setAgeText(editPet.ageText);
        setPersonality(editPet.personality || "");
      } else {
        setName("");
        setSpecies("cat");
        setBreed("");
        setGender("boy");
        setAgeText("");
        setPersonality("");
      }
    }
  }, [open, editPet]);

  function handleSave() {
    if (!name.trim() || !breed.trim() || !ageText.trim()) return;
    onSave({
      name: name.trim(),
      species,
      breed: breed.trim(),
      gender,
      ageText: ageText.trim(),
      personality: personality.trim() || undefined,
    });
    onOpenChange(false);
  }

  const speciesOptions = [
    { value: "cat", label: "猫咪" },
    { value: "dog", label: "狗狗" },
    { value: "other", label: "其他" },
  ];

  const genderOptions = [
    { value: "boy", label: "男孩子" },
    { value: "girl", label: "女孩子" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md !grid !grid-rows-[auto_1fr_auto]">
        <DialogHeader>
          <DialogTitle>{editPet ? "编辑宠物档案" : "新建宠物档案"}</DialogTitle>
          <DialogDescription>建立你的宠物人设档案，让 AI 故事更有温度。</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3.5">
            <div className="grid gap-1.5">
              <Label htmlFor="pet-name">宠物名字</Label>
              <Input id="pet-name" value={name} placeholder="例如：嘿嘿" onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>宠物种类</Label>
              <SelectField value={species} options={speciesOptions} onValueChange={(v) => setSpecies(v as any)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div className="grid gap-1.5">
              <Label htmlFor="pet-breed">品种</Label>
              <Input id="pet-breed" value={breed} placeholder="例如：金毛、美短起司" onChange={(e) => setBreed(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>性别</Label>
              <SelectField value={gender} options={genderOptions} onValueChange={(v) => setGender(v as any)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div className="grid gap-1.5">
              <Label htmlFor="pet-age">年龄阶段</Label>
              <Input id="pet-age" value={ageText} placeholder="例如：3岁、6个月、老年" onChange={(e) => setAgeText(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="pet-personality">性格特征 (选填)</Label>
              <Input id="pet-personality" value={personality} placeholder="例如：活泼好动、高冷粘人、贪吃" onChange={(e) => setPersonality(e.target.value)} />
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2 justify-end mt-4">
          <DialogClose render={<Button variant="outline" />}>取消</DialogClose>
          <Button onClick={handleSave} disabled={!name.trim() || !breed.trim() || !ageText.trim()}>
            保存档案
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
