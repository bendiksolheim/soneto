import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

type ModalProps = React.PropsWithChildren<{
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  className?: string;
}>;

export function Modal({ isOpen, setIsOpen, className, children }: ModalProps): React.ReactElement {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (isOpen) {
      ref.current?.showModal();
    } else {
      ref.current?.close();
    }
  }, [isOpen]);

  return (
    <dialog ref={ref} className={cn("modal", className)} onCancel={() => setIsOpen(false)}>
      <div className="modal-box">
        <form method="dialog">
          {/* if there is a button in form, it will close the modal */}
          <button
            className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
            onClick={() => setIsOpen(false)}
          >
            ✕
          </button>
        </form>
        {children}
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={() => setIsOpen(false)}>close</button>
      </form>
    </dialog>
  );
}
