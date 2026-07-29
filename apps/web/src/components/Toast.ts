type ToastType = "success" | "error" | "info";

const ICONS: Record<ToastType, string> = {
  success: "✓",
  error: "✕",
  info: "ℹ",
};

export function showToast(
  message: string,
  type: ToastType = "info",
  duration = 4000,
): void {
  const root = document.getElementById("toast-root");
  if (!root) return;

  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `<span>${ICONS[type]}</span><span>${message}</span>`;

  root.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(8px)";
    toast.style.transition = "opacity 200ms, transform 200ms";
    setTimeout(() => toast.remove(), 220);
  }, duration);
}
