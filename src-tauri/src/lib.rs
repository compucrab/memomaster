use rusqlite::{params, Connection, OptionalExtension};
use serde_json::Value;
use std::fs::{self, File, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager};

const BACKUP_LIMIT: usize = 10;

fn database_path(app: &AppHandle) -> Result<PathBuf, String> {
    let mut directory = app.path().app_data_dir().map_err(|error| error.to_string())?;
    fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    directory.push("memomaster.sqlite3");
    Ok(directory)
}

fn database_connection(app: &AppHandle) -> Result<Connection, String> {
    let connection = Connection::open(database_path(app)?).map_err(|error| error.to_string())?;
    connection.busy_timeout(std::time::Duration::from_secs(5)).map_err(|error| error.to_string())?;
    connection.pragma_update(None, "journal_mode", "WAL").map_err(|error| error.to_string())?;
    connection.pragma_update(None, "synchronous", "FULL").map_err(|error| error.to_string())?;
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

fn quarantine_database(app: &AppHandle) -> Result<(), String> {
    let path = database_path(app)?;
    if !path.exists() { return Ok(()); }
    let timestamp = SystemTime::now().duration_since(UNIX_EPOCH)
        .map_err(|error| error.to_string())?.as_millis();
    let mut damaged = path.clone();
    damaged.set_file_name(format!("memomaster-corrupt-{timestamp}.sqlite3"));
    fs::rename(&path, &damaged).map_err(|error| format!("Could not preserve the damaged database: {error}"))?;
    for suffix in ["-wal", "-shm"] {
        let mut sidecar = path.as_os_str().to_os_string();
        sidecar.push(suffix);
        let sidecar = PathBuf::from(sidecar);
        if sidecar.exists() {
            let mut target = damaged.as_os_str().to_os_string();
            target.push(suffix);
            let _ = fs::rename(sidecar, PathBuf::from(target));
        }
    }
    Ok(())
}

#[tauri::command]
fn load_library(app: AppHandle) -> Result<Option<String>, String> {
    let connection = match database_connection(&app) {
        Ok(connection) => connection,
        Err(error) => {
            quarantine_database(&app)?;
            return Err(format!("The local library database could not be opened and was preserved for recovery. {error}"));
        }
    };
    let check: Result<String, _> = connection.query_row("PRAGMA quick_check", [], |row| row.get(0));
    if !matches!(check, Ok(ref result) if result == "ok") {
        drop(connection);
        quarantine_database(&app)?;
        return Err("The local library database failed its integrity check and was preserved for recovery.".into());
    }
    connection.query_row(
        "SELECT library_json FROM app_state WHERE id = 1",
        [],
        |row| row.get(0),
    ).optional().map_err(|error| error.to_string())
}

#[tauri::command]
fn save_library(app: AppHandle, data: String) -> Result<(), String> {
    let _: Value = serde_json::from_str(&data).map_err(|error| format!("Invalid library data: {error}"))?;
    let mut connection = database_connection(&app)?;
    let transaction = connection.transaction().map_err(|error| error.to_string())?;
    transaction.execute(
        "INSERT INTO app_state (id, library_json, updated_at)
         VALUES (1, ?1, CURRENT_TIMESTAMP)
         ON CONFLICT(id) DO UPDATE SET
           library_json = excluded.library_json,
           updated_at = CURRENT_TIMESTAMP",
        params![data],
    ).map_err(|error| error.to_string())?;
    transaction.commit().map_err(|error| error.to_string())?;
    Ok(())
}

fn backup_directory(app: &AppHandle) -> Result<PathBuf, String> {
    let mut directory = app.path().app_data_dir().map_err(|error| error.to_string())?;
    directory.push("backups");
    fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    Ok(directory)
}

#[tauri::command]
fn list_automatic_backups(app: AppHandle) -> Result<Vec<serde_json::Value>, String> {
    let directory = backup_directory(&app)?;
    let mut backups = Vec::new();
    for entry in fs::read_dir(directory).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        let path = entry.path();
        if !path.is_file() || path.extension().and_then(|value| value.to_str()) != Some("memz") { continue; }
        let modified = entry.metadata().and_then(|metadata| metadata.modified()).ok()
            .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
            .map(|duration| duration.as_secs()).unwrap_or(0);
        backups.push(serde_json::json!({
            "name": path.file_name().and_then(|value| value.to_str()).unwrap_or("Backup.memz"),
            "path": path.to_string_lossy(),
            "modified": modified
        }));
    }
    backups.sort_by(|a, b| b["modified"].as_u64().cmp(&a["modified"].as_u64()));
    Ok(backups)
}

#[tauri::command]
fn create_automatic_backup(app: AppHandle, bytes: Vec<u8>) -> Result<String, String> {
    let directory = backup_directory(&app)?;
    let timestamp = SystemTime::now().duration_since(UNIX_EPOCH)
        .map_err(|error| error.to_string())?.as_millis();
    let filename = format!("MemoMaster-{timestamp}.memz");
    let backup_path = directory.join(&filename);
    let temporary_path = directory.join(format!(".{filename}.tmp"));
    let mut file = OpenOptions::new().write(true).create_new(true).open(&temporary_path)
        .map_err(|error| error.to_string())?;
    if let Err(error) = file.write_all(&bytes).and_then(|_| file.sync_all()) {
        let _ = fs::remove_file(&temporary_path);
        return Err(error.to_string());
    }
    drop(file);
    if let Err(error) = fs::rename(&temporary_path, &backup_path) {
        let _ = fs::remove_file(&temporary_path);
        return Err(error.to_string());
    }

    let mut backups: Vec<_> = fs::read_dir(&directory).map_err(|error| error.to_string())?
        .filter_map(Result::ok)
        .filter(|entry| entry.path().extension().and_then(|value| value.to_str()) == Some("memz"))
        .collect();
    backups.sort_by_key(|entry| std::cmp::Reverse(entry.metadata().and_then(|metadata| metadata.modified()).ok()));
    for old in backups.into_iter().skip(BACKUP_LIMIT) {
        let _ = fs::remove_file(old.path());
    }
    if let Ok(directory_file) = File::open(&directory) { let _ = directory_file.sync_all(); }
    Ok(backup_path.to_string_lossy().into_owned())
}

#[tauri::command]
fn read_project_file(path: String) -> Result<Vec<u8>, String> {
    fs::read(PathBuf::from(path)).map_err(|error| error.to_string())
}

#[tauri::command]
fn write_project_file(path: String, bytes: Vec<u8>) -> Result<(), String> {
    let target = PathBuf::from(path);
    let temporary = target.with_extension("memz.tmp");
    let mut file = File::create(&temporary).map_err(|error| error.to_string())?;
    file.write_all(&bytes).and_then(|_| file.sync_all()).map_err(|error| error.to_string())?;
    drop(file);
    fs::rename(&temporary, &target).map_err(|error| error.to_string())?;
    Ok(())
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            load_library,
            save_library,
            list_automatic_backups,
            create_automatic_backup,
            read_project_file,
            write_project_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running MemoMaster");
}
