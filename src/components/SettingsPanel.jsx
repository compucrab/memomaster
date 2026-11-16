import { Palette, Type, FolderArchive, Keyboard } from "lucide-preact";

const settings = [
  {
    Icon: Palette,
    title: "Appearance",
    description: "Warm paper, ink and olive accents inspired by the CompCrab website.",
    value: "PAPER / OLIVE",
  },
  {
    Icon: Type,
    title: "Typography",
    description: "Manrope headings, DM Sans interface text and DM Mono metadata.",
    value: "EDITORIAL",
  },
  {
    Icon: FolderArchive,
    title: "Project files",
    description: "Import and export the library as a portable .memz ZIP archive from File.",
    value: "READY",
  },
  {
    Icon: Keyboard,
    title: "Keyboard shortcuts",
    description: "New notebook, open project, export project and standard editing commands.",
    value: "DESKTOP",
  },
];

export default function SettingsPanel() {
  return (
    <section class="workspace settings-workspace">
      <div class="page-intro">
        <div>
          <p class="eyebrow">MAKE IT YOURS</p>
          <h1>Preferences<span>.</span></h1>
          <p class="page-description">A few thoughtful controls for your learning space.</p>
        </div>
      </div>

      <div class="settings-list">
        {settings.map(({ Icon, title, description, value }) => (
          <section class="settings-row" key={title}>
            <i><Icon size={18} /></i>
            <div>
              <h2>{title}</h2>
              <p>{description}</p>
            </div>
            <span>{value}</span>
          </section>
        ))}
      </div>
    </section>
  );
}
