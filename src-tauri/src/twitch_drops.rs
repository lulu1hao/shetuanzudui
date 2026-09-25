use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::net::{IpAddr, TcpStream, ToSocketAddrs};
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder, WindowEvent};

const STREAM_LABEL: &str = "twitch-drops-stream";
const CONTROL_LABEL: &str = "twitch-drops-control";
const DEFAULT_DIRECTORY_URL: &str =
    "https://www.twitch.tv/directory/category/the-finals?tl=DropsEnabled";
const INVENTORY_URL: &str = "https://www.twitch.tv/drops/inventory";
const WEBVIEW_ARGS: &str = "--disable-features=CalculateNativeWinOcclusion --disable-background-timer-throttling --disable-backgrounding-occluded-windows --disable-renderer-backgrounding";

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase", default)]
pub struct MinerOptions {
    low_resource: bool,
    mute_audio: bool,
    auto_claim: bool,
    auto_failover: bool,
    fallback_url: Option<String>,
    proxy_url: Option<String>,
    account_id: String,
    session_id: u64,
}
impl Default for MinerOptions {
    fn default() -> Self {
        Self {
            low_resource: true,
            mute_audio: true,
            auto_claim: true,
            auto_failover: true,
            fallback_url: Some(DEFAULT_DIRECTORY_URL.into()),
            proxy_url: None,
            account_id: "default".into(),
            session_id: 0,
        }
    }
}
#[derive(Clone, Deserialize, Serialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Account {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub twitch_username: Option<String>,
    #[serde(default)]
    pub last_login_at: Option<u64>,
}
#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct Accounts {
    active_id: String,
    accounts: Vec<Account>,
}
impl Default for Accounts {
    fn default() -> Self {
        Self {
            active_id: "default".into(),
            accounts: vec![Account {
                id: "default".into(),
                name: "默认账户".into(),
                twitch_username: None,
                last_login_at: None,
            }],
        }
    }
}
#[derive(Default)]
pub struct DropsRuntime(Mutex<Runtime>);
#[derive(Default)]
struct Runtime {
    accounts: Option<Accounts>,
    options: Option<MinerOptions>,
    session_id: u64,
}

fn data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path().app_data_dir().map_err(|e| e.to_string())
}
fn validate_account_id(id: &str) -> Result<(), String> {
    if id.is_empty() || id.len() > 64 || !id.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'-')
    {
        return Err("账户标识无效".into());
    }
    Ok(())
}
fn load_accounts(app: &AppHandle) -> Result<Accounts, String> {
    let accounts: Accounts = match std::fs::read(data_dir(app)?.join("twitch-accounts.json")) {
        Ok(bytes) => {
            serde_json::from_slice(&bytes).map_err(|e| format!("账户配置读取失败: {e}"))?
        }
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Accounts::default(),
        Err(e) => return Err(format!("账户配置读取失败: {e}")),
    };
    for a in &accounts.accounts {
        validate_account_id(&a.id)?;
    }
    if !accounts.accounts.iter().any(|a| a.id == accounts.active_id) {
        return Err("当前账户不存在".into());
    }
    Ok(accounts)
}
fn save_accounts(app: &AppHandle, accounts: &Accounts) -> Result<(), String> {
    let dir = data_dir(app)?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let temp = dir.join("twitch-accounts.json.tmp");
    std::fs::write(
        &temp,
        serde_json::to_vec_pretty(accounts).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;
    std::fs::rename(temp, dir.join("twitch-accounts.json"))
        .map_err(|e| format!("保存账户失败: {e}"))
}
fn profile_path(base: PathBuf, id: &str) -> Result<PathBuf, String> {
    validate_account_id(id)?;
    // Retain the existing session for users upgrading from the single-account version.
    Ok(if id == "default" {
        base.join("twitch-webview2-profile")
    } else {
        base.join("twitch-accounts").join(id)
    })
}
fn parse_twitch_url(raw: &str) -> Result<tauri::Url, String> {
    let url: tauri::Url = raw.parse().map_err(|e| format!("无效的 Twitch URL: {e}"))?;
    let host = url.host_str().unwrap_or_default().to_ascii_lowercase();
    if url.scheme() != "https"
        || !(host == "twitch.tv" || host.ends_with(".twitch.tv"))
        || !url.username().is_empty()
        || url.password().is_some()
        || url.port().is_some()
    {
        return Err("仅允许不含凭据的 Twitch 官方 HTTPS 地址".into());
    }
    Ok(url)
}
fn parse_local_proxy(raw: Option<&str>) -> Result<Option<tauri::Url>, String> {
    let Some(raw) = raw.map(str::trim).filter(|v| !v.is_empty()) else {
        return Ok(None);
    };
    let url: tauri::Url = raw.parse().map_err(|e| format!("代理地址无效: {e}"))?;
    let host = url.host_str().unwrap_or_default().trim_matches(['[', ']']);
    let local = host.eq_ignore_ascii_case("localhost")
        || host
            .parse::<IpAddr>()
            .map(|ip| ip.is_loopback())
            .unwrap_or(false);
    if !matches!(url.scheme(), "http" | "socks5")
        || !local
        || url.port().map_or(true, |p| p == 0)
        || !url.username().is_empty()
        || url.password().is_some()
    {
        return Err("代理必须是带有效端口的本机 HTTP / SOCKS5 地址".into());
    }
    Ok(Some(url))
}
fn verify_local_proxy(url: &tauri::Url) -> Result<(), String> {
    let host = url.host_str().unwrap_or_default().trim_matches(['[', ']']);
    let port = url.port().ok_or("本地代理缺少端口")?;
    let addresses = (host, port).to_socket_addrs().map_err(|e| e.to_string())?;
    if addresses
        .into_iter()
        .any(|a| TcpStream::connect_timeout(&a, Duration::from_millis(800)).is_ok())
    {
        return Ok(());
    }
    Err(format!("本地代理 {host}:{port} 未监听，请先启动代理客户端"))
}
fn build_miner_script(role: &str, options: &MinerOptions) -> Result<String, String> {
    Ok(include_str!("twitch_miner.js")
        .replace(
            "__LULU_ROLE__",
            &serde_json::to_string(role).map_err(|e| e.to_string())?,
        )
        .replace(
            "__LULU_SETTINGS__",
            &serde_json::to_string(options).map_err(|e| e.to_string())?,
        ))
}
fn create_window(
    app: &AppHandle,
    role: &str,
    url: tauri::Url,
    visible: bool,
    options: &MinerOptions,
) -> Result<WebviewWindow, String> {
    let profile = profile_path(data_dir(app)?, &options.account_id)?;
    std::fs::create_dir_all(&profile).map_err(|e| e.to_string())?;
    let (label, title) = if role == "stream" {
        (STREAM_LABEL, "Twitch 掉宝直播")
    } else {
        (CONTROL_LABEL, "Twitch 账户登录与掉宝库存")
    };
    // Same profile + identical environment options share cookies. Build on a worker, never in a UI callback.
    let mut builder = WebviewWindowBuilder::new(app, label, WebviewUrl::External(url))
        .title(title)
        .inner_size(960.0, 720.0)
        .min_inner_size(720.0, 520.0)
        .resizable(true)
        .skip_taskbar(!visible)
        .visible(visible)
        .data_directory(profile)
        .additional_browser_args(WEBVIEW_ARGS)
        .initialization_script(build_miner_script(role, options)?);
    if let Some(proxy) = parse_local_proxy(options.proxy_url.as_deref())? {
        builder = builder.proxy_url(proxy);
    }
    let w = builder
        .build()
        .map_err(|e| format!("创建 Twitch 窗口失败: {e}"))?;
    let target = w.clone();
    w.on_window_event(move |event| {
        if let WindowEvent::CloseRequested { api, .. } = event {
            api.prevent_close();
            let _ = target.hide();
            let _ = target.set_skip_taskbar(true);
        }
    });
    if visible {
        w.set_focus().map_err(|e| e.to_string())?;
    }
    Ok(w)
}
fn now_id() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}
fn close_session(app: &AppHandle) -> Result<usize, String> {
    let count = destroy_twitch_windows(app)?;
    // destroy() enqueues native work. Wait for removal before reusing fixed window labels.
    for _ in 0..100 {
        if [STREAM_LABEL, CONTROL_LABEL]
            .iter()
            .all(|label| app.get_webview_window(label).is_none())
        {
            return Ok(count);
        }
        std::thread::sleep(Duration::from_millis(50));
    }
    Err("Twitch 窗口仍在关闭，请稍后重试".into())
}
async fn with_runtime<T: Send + 'static>(
    app: AppHandle,
    job: impl FnOnce(&AppHandle, &mut Runtime) -> Result<T, String> + Send + 'static,
) -> Result<T, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let state = app.state::<DropsRuntime>();
        let mut r = state.0.lock().map_err(|_| "掉宝状态锁不可用")?;
        if r.accounts.is_none() {
            r.accounts = Some(load_accounts(&app)?);
            r.session_id = now_id();
        }
        job(&app, &mut r)
    })
    .await
    .map_err(|e| e.to_string())?
}
fn accounts_view(r: &Runtime) -> Value {
    let mut result = serde_json::to_value(r.accounts.as_ref().unwrap()).unwrap();
    result["sessionId"] = json!(r.session_id);
    result
}
fn prepare_options(
    app: &AppHandle,
    r: &mut Runtime,
    options: Option<MinerOptions>,
) -> Result<MinerOptions, String> {
    let mut options = options.unwrap_or_default();
    if options.account_id != r.accounts.as_ref().unwrap().active_id {
        return Err("当前账户已变更，请刷新后重试".into());
    }
    options.fallback_url = Some(
        parse_twitch_url(
            options
                .fallback_url
                .as_deref()
                .unwrap_or(DEFAULT_DIRECTORY_URL),
        )?
        .to_string(),
    );
    if let Some(proxy) = parse_local_proxy(options.proxy_url.as_deref())? {
        verify_local_proxy(&proxy)?;
    }
    options.session_id = r.session_id;
    if r.options.as_ref().is_some_and(|old| old != &options) {
        if app.get_webview_window(STREAM_LABEL).is_some() {
            return Err("请先停止挂宝再修改策略或网络".into());
        }
        close_session(app)?;
        r.session_id += 1;
        options.session_id = r.session_id;
    }
    r.options = Some(options.clone());
    Ok(options)
}
fn window_status(window: Option<WebviewWindow>) -> Value {
    match window {
        Some(w) => {
            json!({"exists": true, "visible": w.is_visible().unwrap_or(false), "url": w.url().map(|u| u.to_string()).unwrap_or_default()})
        }
        None => json!({"exists": false, "visible": false, "url": ""}),
    }
}
fn status(app: &AppHandle, r: &Runtime) -> Value {
    let stream = window_status(app.get_webview_window(STREAM_LABEL));
    json!({"running": stream["exists"], "exists": stream["exists"], "visible": stream["visible"], "url": stream["url"],
        "stream": stream, "control": window_status(app.get_webview_window(CONTROL_LABEL)),
        "accountId": r.accounts.as_ref().unwrap().active_id, "sessionId": r.session_id, "options": r.options})
}
#[tauri::command]
pub async fn get_twitch_accounts(app: AppHandle) -> Result<Value, String> {
    with_runtime(app, |_, r| Ok(accounts_view(r))).await
}
#[tauri::command]
pub async fn create_twitch_account(app: AppHandle, name: String) -> Result<Value, String> {
    with_runtime(app, move |app, r| {
        let name = name.trim();
        if name.is_empty() || name.chars().count() > 40 {
            return Err("账户备注需为 1–40 个字符".into());
        }
        let mut accounts = r.accounts.clone().unwrap();
        if accounts.accounts.len() >= 20 {
            return Err("最多保存 20 个挂宝账户".into());
        }
        if accounts.accounts.iter().any(|a| a.name == name) {
            return Err("账户备注已存在".into());
        }
        let mut id = format!("account-{}", now_id());
        while accounts.accounts.iter().any(|a| a.id == id) {
            id.push('x');
        }
        accounts.accounts.push(Account {
            id: id.clone(),
            name: name.into(),
            twitch_username: None,
            last_login_at: None,
        });
        accounts.active_id = id;
        close_session(app)?;
        save_accounts(app, &accounts)?;
        r.accounts = Some(accounts);
        r.options = None;
        r.session_id += 1;
        Ok(accounts_view(r))
    })
    .await
}
#[tauri::command]
pub async fn update_twitch_account_binding(
    app: AppHandle,
    account_id: String,
    twitch_username: Option<String>,
) -> Result<Value, String> {
    with_runtime(app, move |app, r| {
        let mut accounts = r.accounts.clone().unwrap();
        if let Some(acc) = accounts.accounts.iter_mut().find(|a| a.id == account_id) {
            let normalized = twitch_username
                .as_deref()
                .map(str::trim)
                .filter(|s| !s.is_empty())
                .map(|s| s.to_string());
            if acc.twitch_username != normalized {
                acc.twitch_username = normalized;
                acc.last_login_at = Some(now_id());
                save_accounts(app, &accounts)?;
                r.accounts = Some(accounts);
            }
            Ok(accounts_view(r))
        } else {
            Err("挂宝账户不存在".into())
        }
    })
    .await
}
#[tauri::command]
pub async fn rename_twitch_account(
    app: AppHandle,
    account_id: String,
    name: String,
) -> Result<Value, String> {
    with_runtime(app, move |app, r| {
        let name = name.trim();
        if name.is_empty() || name.chars().count() > 40 {
            return Err("账户备注需为 1–40 个字符".into());
        }
        let mut accounts = r.accounts.clone().unwrap();
        if accounts.accounts.iter().any(|a| a.id != account_id && a.name == name) {
            return Err("账户备注已存在".into());
        }
        if let Some(acc) = accounts.accounts.iter_mut().find(|a| a.id == account_id) {
            acc.name = name.to_string();
            save_accounts(app, &accounts)?;
            r.accounts = Some(accounts);
            Ok(accounts_view(r))
        } else {
            Err("账户不存在".into())
        }
    })
    .await
}
#[tauri::command]
pub async fn delete_twitch_account(app: AppHandle, account_id: String) -> Result<Value, String> {
    with_runtime(app, move |app, r| {
        if account_id == "default" {
            return Err("默认账户不可删除".into());
        }
        let mut accounts = r.accounts.clone().unwrap();
        let pos = accounts
            .accounts
            .iter()
            .position(|a| a.id == account_id)
            .ok_or("账户不存在")?;
        if accounts.accounts.len() <= 1 {
            return Err("至少保留一个账户".into());
        }
        accounts.accounts.remove(pos);
        if accounts.active_id == account_id {
            close_session(app)?;
            accounts.active_id = accounts.accounts[0].id.clone();
            r.options = None;
            r.session_id += 1;
        }
        save_accounts(app, &accounts)?;
        r.accounts = Some(accounts);
        Ok(accounts_view(r))
    })
    .await
}
#[tauri::command]
pub async fn switch_twitch_account(app: AppHandle, account_id: String) -> Result<Value, String> {
    with_runtime(app, move |app, r| {
        let mut accounts = r.accounts.clone().unwrap();
        if !accounts.accounts.iter().any(|a| a.id == account_id) {
            return Err("挂宝账户不存在".into());
        }
        if accounts.active_id != account_id {
            close_session(app)?;
            accounts.active_id = account_id;
            save_accounts(app, &accounts)?;
            r.accounts = Some(accounts);
            r.options = None;
            r.session_id += 1;
        }
        Ok(accounts_view(r))
    })
    .await
}
#[tauri::command]
pub async fn get_twitch_miner_status(app: AppHandle) -> Result<Value, String> {
    with_runtime(app, |app, r| Ok(status(app, r))).await
}
#[tauri::command]
pub async fn open_twitch_miner_window(
    app: AppHandle,
    target_url: Option<String>,
    show: Option<bool>,
    options: Option<MinerOptions>,
) -> Result<Value, String> {
    with_runtime(app, move |app, r| {
        let target = parse_twitch_url(target_url.as_deref().unwrap_or(DEFAULT_DIRECTORY_URL))?;
        let options = prepare_options(app, r, options)?;
        if app.get_webview_window(STREAM_LABEL).is_none() {
            create_window(app, "stream", target, show.unwrap_or(false), &options)?;
        }
        Ok(status(app, r))
    })
    .await
}
#[tauri::command]
pub async fn ensure_twitch_control_window(
    app: AppHandle,
    options: Option<MinerOptions>,
) -> Result<Value, String> {
    with_runtime(app, move |app, r| {
        let options = prepare_options(app, r, options)?;
        if app.get_webview_window(CONTROL_LABEL).is_none() {
            create_window(
                app,
                "control",
                parse_twitch_url(INVENTORY_URL)?,
                false,
                &options,
            )?;
        }
        Ok(status(app, r))
    })
    .await
}
#[tauri::command]
pub async fn show_twitch_login_window(
    app: AppHandle,
    options: Option<MinerOptions>,
    login: Option<bool>,
) -> Result<Value, String> {
    with_runtime(app, move |app, r| {
        let options = prepare_options(app, r, options)?;
        let url = parse_twitch_url(if login.unwrap_or(false) {
            "https://www.twitch.tv/login"
        } else {
            INVENTORY_URL
        })?;
        let w = if let Some(w) = app.get_webview_window(CONTROL_LABEL) {
            let path = w.url().map(|u| u.path().to_string()).unwrap_or_default();
            if !path.starts_with("/login") && !path.starts_with("/signup") {
                w.navigate(url).map_err(|e| e.to_string())?;
            }
            w
        } else {
            create_window(app, "control", url, true, &options)?
        };
        w.set_skip_taskbar(false).map_err(|e| e.to_string())?;
        w.show().map_err(|e| e.to_string())?;
        w.set_focus().map_err(|e| e.to_string())?;
        Ok(status(app, r))
    })
    .await
}
#[tauri::command]
pub async fn toggle_twitch_miner_window(app: AppHandle) -> Result<bool, String> {
    with_runtime(app, |app, _| {
        let w = app.get_webview_window(STREAM_LABEL).ok_or("请先启动挂宝")?;
        let visible = !w.is_visible().map_err(|e| e.to_string())?;
        if visible {
            w.show().map_err(|e| e.to_string())?;
            w.set_focus().map_err(|e| e.to_string())?;
        } else {
            w.hide().map_err(|e| e.to_string())?;
        }
        w.set_skip_taskbar(!visible).map_err(|e| e.to_string())?;
        Ok(visible)
    })
    .await
}
#[tauri::command]
pub async fn refresh_twitch_miner_state(app: AppHandle) -> Result<(), String> {
    with_runtime(app, |app, _| {
        for label in [STREAM_LABEL, CONTROL_LABEL] {
            if let Some(w) = app.get_webview_window(label) {
                w.eval("window.__LULU_DROPS_MINER__?.report?.(true)")
                    .map_err(|e| e.to_string())?;
            }
        }
        Ok(())
    })
    .await
}
#[tauri::command]
pub async fn close_twitch_miner_window(app: AppHandle) -> Result<usize, String> {
    with_runtime(app, |app, r| {
        let n = close_session(app)?;
        r.options = None;
        r.session_id += 1;
        Ok(n)
    })
    .await
}
pub(crate) fn destroy_twitch_windows(app: &AppHandle) -> Result<usize, String> {
    let mut closed = 0;
    for label in [STREAM_LABEL, CONTROL_LABEL] {
        if let Some(w) = app.get_webview_window(label) {
            w.destroy().map_err(|e| format!("关闭 {label} 失败: {e}"))?;
            closed += 1;
        }
    }
    Ok(closed)
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn secure_urls_only() {
        for url in [
            "https://www.twitch.tv/ottr_",
            "https://passport.twitch.tv/login",
        ] {
            assert!(parse_twitch_url(url).is_ok());
        }
        for url in [
            "http://twitch.tv/a",
            "https://twitch.tv.evil.com",
            "https://u:p@twitch.tv/a",
            "https://example.com",
            "https://twitch.tv:123/a",
        ] {
            assert!(parse_twitch_url(url).is_err());
        }
    }
    #[test]
    fn loopback_proxies_only() {
        assert!(parse_local_proxy(Some("http://127.0.0.1:7890")).is_ok());
        assert!(parse_local_proxy(Some("socks5://localhost:1080")).is_ok());
        for url in [
            "http://192.168.1.1:7890",
            "https://127.0.0.1:7890",
            "http://127.0.0.1",
            "http://127.0.0.1:0",
        ] {
            assert!(parse_local_proxy(Some(url)).is_err());
        }
    }
    #[test]
    fn isolated_profiles_and_legacy_session() {
        let base = PathBuf::from("profiles");
        assert_eq!(
            profile_path(base.clone(), "default").unwrap(),
            base.join("twitch-webview2-profile")
        );
        assert_ne!(
            profile_path(base.clone(), "account-1").unwrap(),
            profile_path(base.clone(), "account-2").unwrap()
        );
        for id in ["../escape", "..", "C:/temp", "a/b", ""] {
            assert!(profile_path(base.clone(), id).is_err());
        }
    }
    #[test]
    fn script_embeds_session_and_account() {
        let options = MinerOptions {
            account_id: "account-2".into(),
            session_id: 42,
            ..Default::default()
        };
        let script = build_miner_script("stream", &options).unwrap();
        assert!(script.contains("\"accountId\":\"account-2\""));
        assert!(script.contains("\"sessionId\":42"));
        assert!(!script.contains("__LULU_SETTINGS__"));
    }
    #[test]
    fn account_binding_backward_compatible_and_updatable() {
        let legacy_json = r#"{"activeId":"default","accounts":[{"id":"default","name":"默认账户"}]}"#;
        let mut accounts: Accounts = serde_json::from_str(legacy_json).unwrap();
        assert_eq!(accounts.accounts[0].twitch_username, None);
        assert_eq!(accounts.accounts[0].last_login_at, None);

        accounts.accounts[0].twitch_username = Some("test_user".into());
        accounts.accounts[0].last_login_at = Some(1700000000);
        let serialized = serde_json::to_string(&accounts).unwrap();
        assert!(serialized.contains("\"twitchUsername\":\"test_user\""));
        assert!(serialized.contains("\"lastLoginAt\":1700000000"));

        let deserialized: Accounts = serde_json::from_str(&serialized).unwrap();
        assert_eq!(
            deserialized.accounts[0].twitch_username.as_deref(),
            Some("test_user")
        );
    }
}
