import { renderMarkdown } from "../services/markdown";

export default function CardContent({ content = "" }) {
  return <div class="study-card-prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />;
}
