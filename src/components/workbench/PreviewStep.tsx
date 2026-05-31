import type { StoryDocument } from "@/types";
import type { ExportValidationIssue } from "@/lib/export";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export function PreviewStep({ draft, onBack, onPreview, onSharePreview, onExportJson, onExportHtml, exportIssues }: {
  draft: StoryDocument; onBack: () => void; onPreview: () => void; onSharePreview: () => void;
  onExportJson: () => void; onExportHtml: () => void; exportIssues: ExportValidationIssue[];
}) {
  return (
    <section className="grid gap-4">
      <div className="flex justify-between items-center gap-4 p-3 rounded-[20px] bg-secondary border border-primary/10">
        <h2 className="font-serif text-xl font-semibold">3. 分享导出</h2>
        <Button variant="outline" onClick={onBack}>上一步</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>预览故事</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <p className="text-sm text-muted-foreground">在新页面中预览完整的故事效果。</p>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={onPreview}>工作台预览</Button>
            <Button variant="outline" onClick={onSharePreview}>单页分享预览</Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            导出文件
            {exportIssues.length ? <Badge variant="destructive">{exportIssues.length} 个问题</Badge> : null}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={onExportJson}>导出 JSON</Button>
            <Button onClick={onExportHtml}>导出分享页</Button>
          </div>
          {exportIssues.length ? (
            <div className="border border-amber-500/20 bg-amber-50/78 rounded-[18px] p-3 px-3.5">
              <strong className="block mb-2 text-foreground">导出检查</strong>
              <ul className="m-0 pl-5 grid gap-1.5 text-sm">
                {exportIssues.map((issue) => (<li key={`${issue.code}-${issue.path}`} className="text-muted">{issue.message}</li>))}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}
