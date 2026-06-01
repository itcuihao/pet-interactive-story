import { useState } from "react";
import { Settings, Check, X, Loader2, Sparkles } from "lucide-react";
import {
  getMediaToken, setMediaToken, getMediaBaseUrl, setMediaBaseUrl,
  isMediaHostConfigured, testMediaConnection,
} from "@/lib/settings";
import {
  getAiApiKey, setAiApiKey, getAiBaseUrl, setAiBaseUrl,
  getAiModel, setAiModel, isAiConfigured, AI_PRESETS,
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

export function WorkspaceHeader({ message }: { message: string }) {
  return (
    <PanelCard tone="soft" className="flex justify-between items-center gap-4 !px-5 !py-[18px]">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent text-accent-foreground text-xs tracking-wider uppercase">温柔整理中</div>
        <strong className="block mt-1 text-base font-semibold">{message}</strong>
      </div>
      <SettingsDialog />
    </PanelCard>
  );
}

function SettingsDialog() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"media" | "ai">("media");

  // Media settings
  const [baseUrl, setBaseUrl] = useState(() => getMediaBaseUrl());
  const [token, setToken] = useState(() => getMediaToken());
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const configured = isMediaHostConfigured();

  // AI settings
  const [aiUrl, setAiUrl] = useState(() => getAiBaseUrl());
  const [aiModel, setAiModelState] = useState(() => getAiModel());
  const [aiKey, setAiKey] = useState(() => getAiApiKey());
  const [aiTesting, setAiTesting] = useState(false);
  const [aiTestResult, setAiTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const aiConfigured = isAiConfigured();

  function handleOpen(v: boolean) {
    setOpen(v);
    if (v) {
      setBaseUrl(getMediaBaseUrl());
      setToken(getMediaToken());
      setTestResult(null);
      setAiUrl(getAiBaseUrl());
      setAiModelState(getAiModel());
      setAiKey(getAiApiKey());
      setAiTestResult(null);
    }
  }

  function handleMediaSave() {
    setMediaBaseUrl(baseUrl);
    setMediaToken(token);
    setTestResult(null);
    setOpen(false);
  }

  function handleMediaClear() {
    setBaseUrl("https://firefly.petyu.top");
    setToken("");
    setMediaBaseUrl("https://firefly.petyu.top");
    setMediaToken("");
    setTestResult(null);
    setOpen(false);
  }

  async function handleMediaTest() {
    setTesting(true);
    setTestResult(null);
    setMediaBaseUrl(baseUrl);
    setMediaToken(token);
    const result = await testMediaConnection();
    setTestResult(result);
    setTesting(false);
  }

  function handleAiSave() {
    setAiBaseUrl(aiUrl);
    setAiModel(aiModel);
    setAiApiKey(aiKey);
    setAiTestResult(null);
    setOpen(false);
  }

  function handleAiClear() {
    setAiUrl("");
    setAiModelState("");
    setAiKey("");
    setAiBaseUrl("");
    setAiModel("");
    setAiApiKey("");
    setAiTestResult(null);
    setOpen(false);
  }

  async function handleAiTest() {
    setAiTesting(true);
    setAiTestResult(null);
    setAiBaseUrl(aiUrl);
    setAiModel(aiModel);
    setAiApiKey(aiKey);
    try {
      const res = await fetch(`${aiUrl.replace(/\/+$/, "")}/v1/models`, {
        headers: { Authorization: `Bearer ${aiKey}` },
      });
      if (res.ok) {
        setAiTestResult({ ok: true, message: "连接成功" });
      } else if (res.status === 401 || res.status === 403) {
        setAiTestResult({ ok: false, message: "API Key 无效" });
      } else {
        setAiTestResult({ ok: false, message: `服务器返回 ${res.status}` });
      }
    } catch {
      setAiTestResult({ ok: false, message: "无法连接，请检查地址" });
    }
    setAiTesting(false);
  }

  function applyPreset(preset: typeof AI_PRESETS[number]) {
    setAiUrl(preset.baseUrl);
    setAiModelState(preset.model);
    setAiTestResult(null);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon" className={configured ? "text-primary" : "text-muted-foreground"} />}>
        <Settings className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>设置</DialogTitle>
          <DialogDescription>配置图床和 AI 助手服务。</DialogDescription>
        </DialogHeader>

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

        {tab === "media" ? (
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="base-url">服务地址</Label>
              <Input id="base-url" value={baseUrl} placeholder="https://firefly.petyu.top" onChange={(e) => { setBaseUrl(e.target.value); setTestResult(null); }} />
              <p className="text-xs text-muted-foreground">
                远程服务如 <code className="text-xs bg-muted px-1 py-0.5 rounded">https://firefly.petyu.top</code>，
                本地服务如 <code className="text-xs bg-muted px-1 py-0.5 rounded">http://localhost:3000</code>
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="token">服务令牌</Label>
              <Input id="token" type="password" value={token} placeholder="填入图床服务 Token" onChange={(e) => { setToken(e.target.value); setTestResult(null); }} />
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleMediaTest} disabled={testing || !token}>
                {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "测试连接"}
              </Button>
              {testResult && (
                <span className={`flex items-center gap-1 text-xs ${testResult.ok ? "text-green-600" : "text-destructive"}`}>
                  {testResult.ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  {testResult.message}
                </span>
              )}
            </div>
            <DialogFooter>
              {configured && <Button variant="destructive" onClick={handleMediaClear}>清除配置</Button>}
              <DialogClose render={<Button variant="outline" />}>取消</DialogClose>
              <Button onClick={handleMediaSave}>保存</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>快捷配置</Label>
              <div className="flex flex-wrap gap-2">
                {AI_PRESETS.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            <div className="grid gap-2">
              <Label htmlFor="ai-url">API 地址</Label>
              <Input id="ai-url" value={aiUrl} placeholder="https://api.deepseek.com" onChange={(e) => { setAiUrl(e.target.value); setAiTestResult(null); }} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ai-model">模型名称</Label>
              <Input id="ai-model" value={aiModel} placeholder="deepseek-chat" onChange={(e) => { setAiModelState(e.target.value); setAiTestResult(null); }} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ai-key">API Key</Label>
              <Input id="ai-key" type="password" value={aiKey} placeholder="sk-..." onChange={(e) => { setAiKey(e.target.value); setAiTestResult(null); }} />
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleAiTest} disabled={aiTesting || !aiKey || !aiUrl}>
                {aiTesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "测试连接"}
              </Button>
              {aiTestResult && (
                <span className={`flex items-center gap-1 text-xs ${aiTestResult.ok ? "text-green-600" : "text-destructive"}`}>
                  {aiTestResult.ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  {aiTestResult.message}
                </span>
              )}
            </div>
            <DialogFooter>
              {aiConfigured && <Button variant="destructive" onClick={handleAiClear}>清除配置</Button>}
              <DialogClose render={<Button variant="outline" />}>取消</DialogClose>
              <Button onClick={handleAiSave}>保存</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
