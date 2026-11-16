import { ArrowLeft, Palette, Type, FolderArchive, Keyboard, Moon, Sun } from "lucide-preact";

export default function SettingsPanel({ theme, onThemeChange, onBack }) {
  return (
    <section class="workspace settings-workspace">
      <button class="settings-back" onClick={onBack}><ArrowLeft size={14} /> BACK TO LIBRARY</button>
      <div class="page-intro"><div><p class="eyebrow">MAKE IT YOURS</p><h1>Preferences<span>.</span></h1><p class="page-description">A few thoughtful controls for your learning space.</p></div></div>
      <div class="settings-list">
        <section class="settings-row">
          <i><Palette size={18} /></i>
          <div><h2>Appearance</h2><p>Choose a comfortable colour scheme for your workspace.</p></div>
          <div class="theme-switch">
            <button class={theme === "light" ? "is-selected" : ""} onClick={() => onThemeChange("light")}><Sun size={14} /> Light</button>
            <button class={theme === "dark" ? "is-selected" : ""} onClick={() => onThemeChange("dark")}><Moon size={14} /> Dark</button>
          </div>
        </section>
        <section class="settings-row"><i><Type size={18} /></i><div><h2>Typography</h2><p>Manrope headings, DM Sans interface text and DM Mono metadata.</p></div><span>EDITORIAL</span></section>
        <section class="settings-row"><i><FolderArchive size={18} /></i><div><h2>Project files</h2><p>Import and export the library as a portable .memz ZIP archive from the File menu.</p></div><span>READY</span></section>
        <section class="settings-row"><i><Keyboard size={18} /></i><div><h2>Keyboard shortcuts</h2><p>Ctrl+N: New notebook · Ctrl+Shift+N: New project · Ctrl+O: Open project · Ctrl+S: Save project.</p></div><span>DESKTOP</span></section>
      </div>
    </section>
  );
}
