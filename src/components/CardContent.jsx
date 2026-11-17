import { renderCardDocument } from "../services/cardDocument";

export default function CardContent({ content = "", media = [] }) {
  return <div class="study-card-prose" dangerouslySetInnerHTML={{ __html: renderCardDocument(content, media) }} />;
}
