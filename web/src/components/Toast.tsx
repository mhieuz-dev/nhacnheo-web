import { useEffect } from "react";
import { usePlayer } from "../store/player";

export function Toast() {
  const toast = usePlayer((state) => state.toast);
  const clearToast = usePlayer((state) => state.clearToast);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => clearToast(toast.id), 2800);
    return () => window.clearTimeout(timer);
  }, [toast, clearToast]);

  if (!toast) return null;
  return (
    <div className="toast" role="status">
      {toast.message}
    </div>
  );
}
