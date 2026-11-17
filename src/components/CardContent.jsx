import { useEffect, useRef, useState } from "preact/hooks";
import { X } from "lucide-preact";
import { renderCardDocument } from "../services/cardDocument";

export default function CardContent({ content = "", media = [] }) {
  const contentRef = useRef(null);
  const [zoomHtml, setZoomHtml] = useState("");

  useEffect(() => {
    const root = contentRef.current;
    if (!root) return undefined;
    const frames = [];
    root.querySelectorAll("table").forEach(table => {
      const frame = document.createElement("div");
      frame.className = "study-table-frame";
      table.parentNode.insertBefore(frame, table);
      frame.appendChild(table);

      const button = document.createElement("button");
      button.type = "button";
      button.className = "rich-editor-table-zoom-trigger study-table-zoom-trigger";
      button.title = "View table full screen";
      button.setAttribute("aria-label", "View table full screen");
      button.textContent = "⛶";
      button.addEventListener("click", () => setZoomHtml(table.outerHTML));
      frame.appendChild(button);
      frames.push({ frame, table, button });
    });
    return () => {
      frames.forEach(({ frame, table, button }) => {
        button.remove();
        if (frame.parentNode) {
          frame.parentNode.insertBefore(table, frame);
          frame.remove();
        }
      });
    };
  }, [content, media]);

  useEffect(() => {
    if (!zoomHtml) return undefined;
    const close = event => { if (event.key === "Escape") setZoomHtml(""); };
    window.addEventListener("keydown", close, true);
    return () => window.removeEventListener("keydown", close, true);
  }, [zoomHtml]);

  return <>
    <div ref={contentRef} class="study-card-prose" dangerouslySetInnerHTML={{ __html: renderCardDocument(content, media) }} />
    {zoomHtml && <div class="rich-editor-table-zoom-backdrop" role="dialog" aria-modal="true" aria-label="Expanded table" onMouseDown={event => { if (event.target === event.currentTarget) setZoomHtml(""); }}>
      <section class="rich-editor-table-zoom-panel">
        <div class="rich-editor-table-zoom-heading"><strong>Table view</strong><button type="button" aria-label="Close expanded table" onClick={() => setZoomHtml("")}><X size={17}/></button></div>
        <div class="rich-editor-table-zoom-content" dangerouslySetInnerHTML={{ __html: zoomHtml }}/>
      </section>
    </div>}
  </>;
}
