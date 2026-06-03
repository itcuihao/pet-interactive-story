import { useState, useEffect } from "react";
import type { StoryDocument, StoryMedia, PetProfile } from "@/types";
import type { SelectOption } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SelectField } from "@/components/ui/SelectField";
import { AiButton } from "@/components/ui/AiButton";
import { PetDialog } from "@/components/ui/PetDialog";
import { polishTitle, polishSummary } from "@/lib/ai";
import { getPets, addPet } from "@/lib/pets";
import { MediaField } from "./MediaField";
import { Plus } from "lucide-react";

export function StoryInfoStep({ draft, sceneOptions, onNext, onPatchStory, onSetCover }: {
  draft: StoryDocument;
  sceneOptions: SelectOption[];
  onNext: () => void;
  onPatchStory: (patch: Partial<StoryDocument>) => void;
  onSetCover: (media?: StoryMedia) => void;
}) {
  const [pets, setPets] = useState<PetProfile[]>(() => getPets());
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    // Sync state if it changed between mount or tab switch
    const syncPets = () => setPets(getPets());
    window.addEventListener("pet-profiles-updated", syncPets);
    return () => {
      window.removeEventListener("pet-profiles-updated", syncPets);
    };
  }, []);

  const petOptions = pets.map((p) => ({
    value: p.id,
    label: `${p.name} (${p.breed})`,
  }));

  const selectedPet = pets.find((p) => p.id === draft.petId);

  function handleSelectPet(petId: string) {
    const selected = pets.find((p) => p.id === petId);
    if (selected) {
      onPatchStory({
        petId: selected.id,
        petName: selected.name,
      });
    }
  }

  function handleAddPet(petData: Omit<PetProfile, "id">) {
    const newPet = addPet(petData);
    setPets(getPets());
    onPatchStory({
      petId: newPet.id,
      petName: newPet.name,
    });
  }

  return (
    <section className="grid gap-4">
      <div className="flex justify-between items-center gap-4 p-3 rounded-[20px] bg-secondary border border-primary/10">
        <div className="flex items-center gap-3">
          <h2 className="font-serif text-xl font-semibold">1. 基本信息</h2>
          {draft.templateName ? (
            <Badge variant="secondary">{draft.templateName}</Badge>
          ) : null}
        </div>
        <Button onClick={onNext}>下一步</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div className="grid gap-2 sm:col-span-2">
          <div className="flex justify-between items-center">
            <Label>选择宠物档案</Label>
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
            >
              <Plus className="h-3 w-3" /> 新建档案
            </button>
          </div>
          {petOptions.length > 0 ? (
            <SelectField
              value={draft.petId || ""}
              options={petOptions}
              placeholder="选择已有的宠物"
              onValueChange={handleSelectPet}
            />
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(true)}
              className="w-full h-8 text-xs border-dashed text-muted-foreground hover:text-foreground"
            >
              暂无档案，点击创建首个宠物人设
            </Button>
          )}
        </div>

        <div className="grid gap-2 sm:col-span-2">
          <div className="flex justify-between items-center">
            <Label>故事标题</Label>
            <AiButton label="故事标题" fetchOptions={() => polishTitle(draft.petName, draft.title, draft.petId)} onSelect={(r) => onPatchStory({ title: r })} />
          </div>
          <Input value={draft.title} onChange={(e) => onPatchStory({ title: e.target.value })} />
        </div>

        {selectedPet && (
          <div className="sm:col-span-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 p-3 rounded-xl bg-primary/5 border border-primary/10 animate-fade-in">
            <span className="text-[10px] font-semibold text-primary px-2 py-0.5 rounded-full bg-primary/15 tracking-wider uppercase shrink-0">
              AI 人设已同步
            </span>
            <span className="text-xs text-foreground font-semibold">
              {selectedPet.name}
            </span>
            <span className="text-xs text-muted-foreground/30">•</span>
            <span className="text-xs text-muted-foreground font-medium">
              {selectedPet.species === "cat" ? "猫咪" : selectedPet.species === "dog" ? "狗狗" : "其他"} ({selectedPet.breed})
            </span>
            <span className="text-xs text-muted-foreground/30">•</span>
            <span className="text-xs text-muted-foreground">{selectedPet.gender === "boy" ? "男孩子" : "女孩子"}</span>
            <span className="text-xs text-muted-foreground/30">•</span>
            <span className="text-xs text-muted-foreground">{selectedPet.ageText}</span>
            {selectedPet.personality && (
              <>
                <span className="text-xs text-muted-foreground/30">•</span>
                <span className="text-xs text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-md italic">
                  “{selectedPet.personality}”
                </span>
              </>
            )}
          </div>
        )}

        <div className="grid gap-2 sm:col-span-2">
          <div className="flex justify-between items-center">
            <Label>一句话摘要</Label>
            <AiButton label="摘要" fetchOptions={() => polishSummary(draft.petName, draft.title, draft.summary ?? "", draft.petId)} onSelect={(r) => onPatchStory({ summary: r })} />
          </div>
          <Textarea value={draft.summary ?? ""} onChange={(e) => onPatchStory({ summary: e.target.value })} />
        </div>

        <div className="grid gap-2">
          <Label>起始片段</Label>
          <SelectField value={draft.startSceneId} options={sceneOptions} placeholder="选择作为开场的片段" onValueChange={(value) => onPatchStory({ startSceneId: value })} />
        </div>
      </div>

      <MediaField label="封面图片 / 视频链接" media={draft.cover} onChange={onSetCover} hint="图片会跟随导出文件一起走；视频请使用可公开访问的链接。" usage="cover" />

      <PetDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleAddPet}
      />
    </section>
  );
}
