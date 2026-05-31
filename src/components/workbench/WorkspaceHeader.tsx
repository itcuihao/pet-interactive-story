import { useState } from "react";
import { Settings, Check, X, Loader2 } from "lucide-react";
import {
  getMediaToken,
  setMediaToken,
  getMediaBaseUrl,
  setMediaBaseUrl,
  isMediaHostConfigured,
  testMediaConnection,
} from "@/lib/settings";
import { Button } from "@/components/ui/button";
import { PanelCard } from "@/components/ui/PanelCard";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const [baseUrl, setBaseUrl] = useState(() => getMediaBaseUrl());
  const [token, setToken] = useState(() => getMediaToken());
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const configured = isMediaHostConfigured();

  function handleSave() {
    setMediaBaseUrl(baseUrl);
    setMediaToken(token);
    setTestResult(null);
    setOpen(false);
  }

  function handleClear() {
    setBaseUrl("https://firefly.petyu.top");
    setToken("");
    setMediaBaseUrl("https://firefly.petyu.top");
    setMediaToken("");
    setTestResult(null);
    setOpen(false);
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    // Temporarily save so test uses current values
    setMediaBaseUrl(baseUrl);
    setMediaToken(token);
    const result = await testMediaConnection();
    setTestResult(result);
    setTesting(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) { setBaseUrl(getMediaBaseUrl()); setToken(getMediaToken()); setTestResult(null); } }}>
      <DialogTrigger render={<Button variant="ghost" size="icon" className={configured ? "text-primary" : "text-muted-foreground"} />}>
        <Settings className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>图床设置</DialogTitle>
          <DialogDescription>
            配置图床服务后，上传的图片和视频会自动转为公开链接，方便导出分享。可以使用远程服务，也可以指向本地服务。
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="base-url">服务地址</Label>
            <Input
              id="base-url"
              value={baseUrl}
              placeholder="https://firefly.petyu.top"
              onChange={(e) => { setBaseUrl(e.target.value); setTestResult(null); }}
            />
            <p className="text-xs text-muted-foreground">
              远程服务如 <code className="text-xs bg-muted px-1 py-0.5 rounded">https://firefly.petyu.top</code>，
              本地服务如 <code className="text-xs bg-muted px-1 py-0.5 rounded">http://localhost:3000</code>
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="token">服务令牌</Label>
            <Input
              id="token"
              type="password"
              value={token}
              placeholder="填入图床服务 Token"
              onChange={(e) => { setToken(e.target.value); setTestResult(null); }}
            />
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleTest} disabled={testing || !token}>
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

        <DialogFooter>
          {configured && (
            <Button variant="destructive" onClick={handleClear}>清除配置</Button>
          )}
          <DialogClose render={<Button variant="outline" />}>取消</DialogClose>
          <Button onClick={handleSave}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
