use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::Emitter;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let new_notebook = MenuItem::with_id(app, "new-notebook", "New Notebook", true, Some("CmdOrCtrl+N"))?;
            let open_project = MenuItem::with_id(app, "open-project", "Open Project…", true, Some("CmdOrCtrl+O"))?;
            let export_project = MenuItem::with_id(app, "export-project", "Export Project…", true, Some("CmdOrCtrl+Shift+E"))?;
            let file_separator = PredefinedMenuItem::separator(app)?;
            let quit = MenuItem::with_id(app, "quit", "Quit MemoMaster", true, Some("CmdOrCtrl+Q"))?;
            let file_menu = Submenu::with_items(app, "File", true, &[&new_notebook, &open_project, &export_project, &file_separator, &quit])?;

            let cut = PredefinedMenuItem::cut(app, None)?;
            let copy = PredefinedMenuItem::copy(app, None)?;
            let paste = PredefinedMenuItem::paste(app, None)?;
            let select_all = PredefinedMenuItem::select_all(app, None)?;
            let edit_menu = Submenu::with_items(app, "Edit", true, &[&cut, &copy, &paste, &select_all])?;

            let about = MenuItem::with_id(app, "about", "About MemoMaster", true, None::<&str>)?;
            let help_menu = Submenu::with_items(app, "Help", true, &[&about])?;
            app.set_menu(Menu::with_items(app, &[&file_menu, &edit_menu, &help_menu])?)?;

            app.on_menu_event(|app, event| {
                let id = event.id().as_ref();
                if id == "quit" { app.exit(0); }
                else { let _ = app.emit("memomaster://menu", id.to_string()); }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running MemoMaster");
}
