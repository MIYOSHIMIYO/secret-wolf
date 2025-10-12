import React, { useEffect } from "react";
import Modal from "./Modal";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function RoomFullModal({ open, onClose }: Props) {
  // 3秒後に自動的に閉じる
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [open, onClose]);

  return (
    <Modal open={open} onClose={onClose} closable={false}>
      <div className="text-center py-4">
        <div className="text-red-400 text-lg font-semibold mb-2">
          このルームは満員です
        </div>
        <div className="text-slate-300 text-sm">
          3秒後に自動的に閉じます
        </div>
      </div>
    </Modal>
  );
}
