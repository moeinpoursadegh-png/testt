export function observeResize(el: Element, cb: (w: number, h: number) => void): () => void {
  const ro = new ResizeObserver(() => cb(el.clientWidth, el.clientHeight));
  ro.observe(el);
  cb(el.clientWidth, el.clientHeight);
  return () => ro.disconnect();
}
