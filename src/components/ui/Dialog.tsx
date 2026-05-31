import type { ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Cross2Icon } from "@radix-ui/react-icons";
import { Button } from "./Button";

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  onConfirm,
}: {
  trigger: ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
}) {
  return (
    <DialogPrimitive.Root>
      <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="ui-dialog__overlay" />
        <DialogPrimitive.Content className="ui-dialog__content">
          <div className="ui-dialog__header">
            <div>
              <DialogPrimitive.Title>{title}</DialogPrimitive.Title>
              <DialogPrimitive.Description>{description}</DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close asChild>
              <Button size="sm" className="ui-dialog__close" aria-label="关闭">
                <Cross2Icon />
              </Button>
            </DialogPrimitive.Close>
          </div>
          <div className="ui-dialog__actions">
            <DialogPrimitive.Close asChild>
              <Button>先保留</Button>
            </DialogPrimitive.Close>
            <DialogPrimitive.Close asChild>
              <Button variant="danger" onClick={onConfirm}>
                {confirmLabel}
              </Button>
            </DialogPrimitive.Close>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
