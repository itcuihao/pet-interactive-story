import { useState } from "react";
import { Settings, Check, X, Loader2, Sparkles, PawPrint, Plus } from "lucide-react";
import {
  getMediaToken, setMediaToken, getMediaBaseUrl, setMediaBaseUrl,
  isMediaHostConfigured, testMediaConnection,
} from "@/lib/settings";
import {
  getAiProfiles, setAiProfiles,
  getActiveAiProfileId, setActiveAiProfileId,
  isAiConfigured, AI_PRESETS,
  type AiProfile
} from "@/lib/ai";
import { Button } from "@/components/ui/button";
import { PanelCard } from "@/components/ui/PanelCard";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger, DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { getPets, deletePet, addPet, updatePet } from "@/lib/pets";
import { PetDialog } from "@/components/ui/PetDialog";
import type { PetProfile } from "@/types";

export function WorkspaceHeader({ message }: { message: string }) {
  return (
    <PanelCard tone="soft" className="flex justify-between items-center gap-4 !px-5 !py-[18px]">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent text-accent-foreground text-xs tracking-wider uppercase">温柔整理中</div>
        <strong className="block mt-2.5 text-base font-semibold">{message}</strong>
      </div>
      <div className="flex items-center gap-2">
        <PetsManagerDialog />
        <SettingsDialog />
      </div>
    </PanelCard>
  );
}

function PetsManagerDialog() {
  const [open, setOpen] = useState(false);
  const [pets, setPets] = useState<PetProfile[]>([]);
  const [isPetDialogOpen, setIsPetDialogOpen] = useState(false);
  const [editingPet, setEditingPet] = useState<PetProfile | null>(null);

  function handleOpen(v: boolean) {
    setOpen(v);
    if (v) {
      setPets(getPets());
    }
  }

  function handleAdd() {
    setEditingPet(null);
    setIsPetDialogOpen(true);
  }

  function handleEdit(pet: PetProfile) {
    setEditingPet(pet);
    setIsPetDialogOpen(true);
  }

  function handleDelete(id: string) {
    deletePet(id);
    setPets(getPets());
    window.dispatchEvent(new Event("pet-profiles-updated"));
  }

  function handleSavePet(petData: Omit<PetProfile, "id">) {
    if (editingPet) {
      updatePet(editingPet.id, petData);
    } else {
      addPet(petData);
    }
    setPets(getPets());
    window.dispatchEvent(new Event("pet-profiles-updated"));
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpen}>
        <DialogTrigger render={<Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary transition-colors" title="宠物档案" />}>
          <PawPrint className="h-4 w-4" />
        </DialogTrigger>
        <DialogContent className="sm:max-w-md !max-h-[85vh] !grid !grid-rows-[auto_1fr_auto]">
          <DialogHeader>
            <DialogTitle>宠物档案管理</DialogTitle>
            <DialogDescription>
              管理您的宠物人设，这将被用于 AI 智能润色和脚本生成。
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto -mx-4 px-4 py-2">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs text-muted-foreground">已保存的宠物档案</span>
              <Button size="sm" variant="outline" className="text-xs h-8 px-2.5" onClick={handleAdd}>
                <Plus className="h-3 w-3 mr-1" /> 添加档案
              </Button>
            </div>

            {pets.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-border rounded-2xl text-xs text-muted-foreground">
                暂无已保存的宠物人设，点击上方按钮添加。
              </div>
            ) : (
              <div className="grid gap-2 pr-1">
                {pets.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-border hover:border-primary/30 transition-all bg-card"
                  >
                    <div className="grid min-w-0">
                      <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <span className="truncate">{p.name}</span>
                        <span className="text-[10px] bg-secondary text-secondary-foreground px-1.5 py-0.2 rounded-full font-normal shrink-0">
                          {p.species === "cat" ? "猫咪" : p.species === "dog" ? "狗狗" : "其他"}
                        </span>
                      </span>
                      <span className="text-[10px] text-muted-foreground mt-0.5 truncate">
                        {p.breed} • {p.gender === "boy" ? "男孩子" : "女孩子"} • {p.ageText}
                        {p.personality ? ` • ${p.personality}` : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 ml-2 shrink-0">
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={() => handleEdit(p)}>
                        编辑
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-[11px] text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(p.id)}
                      >
                        删除
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <DialogClose render={<Button variant="default" />}>完成</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PetDialog
        open={isPetDialogOpen}
        onOpenChange={setIsPetDialogOpen}
        onSave={handleSavePet}
        editPet={editingPet}
      />
    </>
  );
}

function SettingsDialog() {
  const isLocalDev = (import.meta as any).env.DEV || (typeof window !== "undefined" && (
    window.location.hostname === "localhost" || 
    window.location.hostname === "127.0.0.1" || 
    window.location.hostname.endsWith(".local") ||
    /^192\.168\./.test(window.location.hostname) ||
    /^10\./.test(window.location.hostname) ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(window.location.hostname)
  ));
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"media" | "ai">(() => isLocalDev ? "media" : "ai");

  // Media Settings State
  const [baseUrl, setBaseUrl] = useState(() => getMediaBaseUrl());
  const [token, setToken] = useState(() => getMediaToken());
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const configured = isMediaHostConfigured();

  // AI Profiles State
  const [profiles, setProfiles] = useState<AiProfile[]>([]);
  const [activeId, setActiveId] = useState("");
  const [editingProfile, setEditingProfile] = useState<AiProfile | null>(null);
  
  // AI Editing Form State
  const [formName, setFormName] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formModel, setFormModel] = useState("");
  const [formKey, setFormKey] = useState("");
  const [aiTesting, setAiTesting] = useState(false);
  const [aiTestResult, setAiTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const aiConfigured = isAiConfigured();

  function handleOpen(v: boolean) {
    setOpen(v);
    if (v) {
      setBaseUrl(getMediaBaseUrl());
      setToken(getMediaToken());
      setTestResult(null);

      // Load AI configurations
      const currentProfiles = getAiProfiles();
      setProfiles(currentProfiles);
      setActiveId(getActiveAiProfileId());
      setEditingProfile(null);
      setAiTestResult(null);
    }
  }

  // Media actions
  function handleMediaSave() {
    setMediaBaseUrl(baseUrl);
    setMediaToken(token);
    setTestResult(null);
    setOpen(false);
  }

  function handleMediaClear() {
    const d = "https://firefly.petyu.top";
    setBaseUrl(d);
    setToken("");
    setMediaBaseUrl(d);
    setMediaToken("");
    setTestResult(null);
    setOpen(false);
  }

  async function handleMediaTest() {
    setTesting(true);
    setTestResult(null);
    setMediaBaseUrl(baseUrl);
    setMediaToken(token);
    setTestResult(await testMediaConnection());
    setTesting(false);
  }

  // AI actions
  function handleSelectActive(id: string) {
    setActiveId(id);
    setActiveAiProfileId(id);
  }

  function handleAdd() {
    setEditingProfile({
      id: crypto.randomUUID(),
      name: "",
      baseUrl: "",
      model: "",
      apiKey: "",
    });
    setFormName("");
    setFormUrl("");
    setFormModel("");
    setFormKey("");
    setAiTestResult(null);
  }

  function handleEdit(p: AiProfile) {
    setEditingProfile(p);
    setFormName(p.name);
    setFormUrl(p.baseUrl);
    setFormModel(p.model);
    setFormKey(p.apiKey);
    setAiTestResult(null);
  }

  function handleDeleteProfile(id: string) {
    const updated = profiles.filter((p) => p.id !== id);
    setProfiles(updated);
    setAiProfiles(updated);
    if (activeId === id) {
      const nextActive = updated[0]?.id || "";
      setActiveId(nextActive);
      setActiveAiProfileId(nextActive);
    }
  }

  function handleSelectPreset(p: { name: string; baseUrl: string; model: string }) {
    setFormName(p.name);
    setFormUrl(p.baseUrl);
    setFormModel(p.model);
    setAiTestResult(null);
  }

  async function handleAiTest() {
    setAiTesting(true);
    setAiTestResult(null);
    try {
      let url = formUrl.replace(/\/+$/, "");
      const hasVersionPath = /\/v\d+$/.test(url) || url.includes("/v1/") || url.includes("/v4/");
      if (!hasVersionPath && !url.endsWith("/chat/completions")) {
        url = `${url}/v1`;
      }
      if (!url.endsWith("/chat/completions")) {
        url = `${url}/chat/completions`;
      }
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${formKey}`,
        },
        body: JSON.stringify({
          model: formModel,
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 1,
        }),
      });
      if (res.ok) setAiTestResult({ ok: true, message: "连接成功" });
      else {
        const body = await res.text().catch(() => "");
        setAiTestResult({ ok: false, message: `失败 (${res.status}): ${body.slice(0, 50)}` });
      }
    } catch {
      setAiTestResult({ ok: false, message: "无法连接，请检查地址" });
    }
    setAiTesting(false);
  }

  function handleSaveProfile() {
    if (!formName.trim() || !formUrl.trim() || !formModel.trim() || !formKey.trim()) {
      return;
    }
    if (!editingProfile) return;

    const newProfile: AiProfile = {
      ...editingProfile,
      name: formName.trim(),
      baseUrl: formUrl.trim(),
      model: formModel.trim(),
      apiKey: formKey.trim(),
    };

    let updated: AiProfile[];
    const exists = profiles.some((p) => p.id === editingProfile.id);
    if (exists) {
      updated = profiles.map((p) => p.id === editingProfile.id ? newProfile : p);
    } else {
      updated = [...profiles, newProfile];
    }

    setProfiles(updated);
    setAiProfiles(updated);

    if (updated.length === 1 || !activeId) {
      setActiveId(newProfile.id);
      setActiveAiProfileId(newProfile.id);
    }

    setEditingProfile(null);
    setAiTestResult(null);
  }

  const footer = tab === "media" ? (
    <DialogFooter>
      {configured && <Button variant="destructive" onClick={handleMediaClear}>清除配置</Button>}
      <DialogClose render={<Button variant="outline" />}>取消</DialogClose>
      <Button onClick={handleMediaSave}>保存</Button>
    </DialogFooter>
  ) : (
    <DialogFooter>
      {!editingProfile ? (
        <DialogClose render={<Button variant="default" />}>完成</DialogClose>
      ) : (
        <div className="flex gap-2 justify-end w-full">
          <Button variant="outline" onClick={() => setEditingProfile(null)}>取消</Button>
          <Button onClick={handleSaveProfile} disabled={!formName.trim() || !formUrl.trim() || !formModel.trim() || !formKey.trim()}>
            保存配置
          </Button>
        </div>
      )}
    </DialogFooter>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon" className={configured ? "text-primary" : "text-muted-foreground"} />}>
        <Settings className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg !max-h-[85vh] !grid !grid-rows-[auto_auto_1fr_auto]">
        <DialogHeader>
          <DialogTitle>设置</DialogTitle>
          <DialogDescription>
            {isLocalDev ? "配置图床和 AI 助手服务。" : "配置 AI 助手服务。"}
          </DialogDescription>
        </DialogHeader>

        {isLocalDev && (
          <div className="flex gap-1 p-1 rounded-xl bg-secondary">
            <button
              type="button"
              onClick={() => setTab("media")}
              className={`flex-1 text-sm py-1.5 rounded-lg transition-colors ${tab === "media" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              图床
            </button>
            <button
              type="button"
              onClick={() => setTab("ai")}
              className={`flex-1 text-sm py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${tab === "ai" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              AI 助手
              {aiConfigured ? <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> : null}
            </button>
          </div>
        )}

        <div className="overflow-y-auto -mx-4 px-4 py-2">
          {tab === "media" && isLocalDev ? (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="base-url">服务地址</Label>
                <Input id="base-url" value={baseUrl} placeholder="https://firefly.petyu.top" onChange={(e) => { setBaseUrl(e.target.value); setTestResult(null); }} />
                <p className="text-xs text-muted-foreground">
                  远程如 <code className="text-xs bg-muted px-1 py-0.5 rounded">firefly.petyu.top</code>，
                  本地如 <code className="text-xs bg-muted px-1 py-0.5 rounded">localhost:3000</code>
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="token">服务令牌（可选）</Label>
                <Input id="token" type="password" value={token} placeholder="选填，默认图床无需填写" onChange={(e) => { setToken(e.target.value); setTestResult(null); }} />
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => void handleMediaTest()} disabled={testing}>
                  {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "测试连接"}
                </Button>
                {testResult && (
                  <span className={`flex items-center gap-1 text-xs ${testResult.ok ? "text-green-600" : "text-destructive"}`}>
                    {testResult.ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    {testResult.message}
                  </span>
                )}
              </div>
            </div>
          ) : (
            editingProfile ? (
              <div className="grid gap-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold text-sm">{formName ? `编辑配置: ${formName}` : "添加 AI 配置"}</h4>
                  <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setEditingProfile(null)}>返回列表</Button>
                </div>
                <div className="grid gap-2">
                  <Label>快捷预设</Label>
                  <div className="flex flex-wrap gap-2">
                    {AI_PRESETS.map((p) => (
                      <button key={p.name} type="button" onClick={() => handleSelectPreset(p)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors">
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
                <Separator />
                <div className="grid gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="ai-name">配置名称</Label>
                    <Input id="ai-name" value={formName} placeholder="例如：DeepSeek-Chat" onChange={(e) => { setFormName(e.target.value); setAiTestResult(null); }} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="ai-url">API 地址</Label>
                    <Input id="ai-url" value={formUrl} placeholder="https://api.deepseek.com" onChange={(e) => { setFormUrl(e.target.value); setAiTestResult(null); }} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="ai-model">模型名称</Label>
                    <Input id="ai-model" value={formModel} placeholder="deepseek-chat" onChange={(e) => { setFormModel(e.target.value); setAiTestResult(null); }} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="ai-key">API Key</Label>
                    <Input id="ai-key" type="password" value={formKey} placeholder="sk-..." onChange={(e) => { setFormKey(e.target.value); setAiTestResult(null); }} />
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Button size="sm" variant="outline" onClick={() => void handleAiTest()} disabled={aiTesting || !formKey || !formUrl}>
                      {aiTesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "测试连接"}
                    </Button>
                    {aiTestResult && (
                      <span className={`flex items-center gap-1 text-xs ${aiTestResult.ok ? "text-green-600" : "text-destructive"}`}>
                        {aiTestResult.ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        {aiTestResult.message}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid gap-4">
                <div className="flex justify-between items-center">
                  <Label className="text-xs text-muted-foreground">配置多个 AI 引擎，按需切换使用：</Label>
                  <Button size="sm" variant="outline" className="text-xs h-8 px-2.5" onClick={handleAdd}>+ 添加 AI 配置</Button>
                </div>
                {profiles.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-border rounded-2xl text-xs text-muted-foreground">
                    暂无已保存配置，请点击右上方按钮添加。
                  </div>
                ) : (
                  <div className="grid gap-2 max-h-[280px] overflow-y-auto pr-1">
                    {profiles.map((p) => {
                      const isActive = p.id === activeId;
                      return (
                        <div key={p.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${isActive ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/30"}`}>
                          <button type="button" onClick={() => handleSelectActive(p.id)} className="flex-1 text-left flex items-start gap-2.5">
                            <div className={`mt-1.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${isActive ? "border-primary text-primary" : "border-muted-foreground/30"}`}>
                              {isActive ? <span className="w-2 h-2 rounded-full bg-primary" /> : null}
                            </div>
                            <div className="grid min-w-0">
                              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                <span className="truncate">{p.name}</span>
                                {isActive && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.2 rounded-full font-normal shrink-0">当前激活</span>}
                              </span>
                              <span className="text-[10px] text-muted-foreground mt-0.5 truncate">{p.model} • {p.baseUrl}</span>
                            </div>
                          </button>
                          <div className="flex items-center gap-1 ml-2 shrink-0">
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={() => handleEdit(p)}>编辑</Button>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px] text-destructive hover:bg-destructive/10" onClick={() => handleDeleteProfile(p.id)}>删除</Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )
          )}
        </div>

        {footer}
      </DialogContent>
    </Dialog>
  );
}
