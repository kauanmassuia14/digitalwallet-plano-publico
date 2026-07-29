/** Set innerHTML safely and return the root element. */
export function render(el: HTMLElement, html: string): HTMLElement {
  el.innerHTML = html;
  return el;
}

/** Query a required element — throws if missing. */
export function qs<T extends HTMLElement>(
  selector: string,
  root: Document | HTMLElement = document,
): T {
  const el = root.querySelector<T>(selector);
  if (!el) throw new Error(`Element not found: ${selector}`);
  return el;
}

/** Show/hide an element. */
export function setVisible(el: HTMLElement, visible: boolean): void {
  el.style.display = visible ? "" : "none";
}

/** Create an element with optional class and inner HTML. */
export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  html?: string,
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (html !== undefined) el.innerHTML = html;
  return el;
}
