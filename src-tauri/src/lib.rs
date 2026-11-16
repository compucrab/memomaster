use rusqlite::{params, Connection, OptionalExtension};
use serde_json::Value;
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

fn database_connection(app: &AppHandle) -> Result<Connection, String> {
    let mut directory = app.path().app_data_dir().map_err(|error| error.to_string())?;
    fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    directory.push("memomaster.sqlite3");
    let connection = Connection::open(directory).map_err(|error| error.to_string())?;
    connection.execute(
        "CREATE TABLE IF NOT EXISTS app_state (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            library_json TEXT NOT NULL,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    ).map_err(|error| error.to_string())?;
    Ok(connection)
}

#[tauri::command]
fn load_library(app: AppHandle) -> Result<Option<String>, String> {
    let connection = database_connection(&app)?;
    connection.query_row(
        "SELECT library_json FROM app_state WHERE id = 1",
        [],
        |row| row.get(0),
    ).optional().map_err(|error| error.to_string())
}

#[tauri::command]
fn save_library(app: AppHandle, data: String) -> Result<(), String> {
    let _: Value = serde_json::from_str(&data).map_err(|error| format!("Invalid library data: {error}"))?;
    let connection = database_connection(&app)?;
    connection.execute(
        "INSERT INTO app_state (id, library_json, updated_at)
         VALUES (1, ?1, CURRENT_TIMESTAMP)
         ON CONFLICT(id) DO UPDATE SET
           library_json = excluded.library_json,
           updated_at = CURRENT_TIMESTAMP",
        params![data],
    ).map_err(|error| error.to_string())?;
    Ok(())
}

#[tauri::command]
fn read_project_file(path: String) -> Result<Vec<u8>, String> {
    fs::read(PathBuf::from(path)).map_err(|error| error.to_string())
}

#[tauri::command]
fn write_project_file(path: String, bytes: Vec<u8>) -> Result<(), String> {
    fs::write(PathBuf::from(path), bytes).map_err(|error| error.to_string())?;
    Ok(())
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            load_library,
            save_library,
            read_project_file,
            write_project_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running MemoMaster");
}
