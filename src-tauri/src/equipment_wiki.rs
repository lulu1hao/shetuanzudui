use std::time::Duration;

// Fixed host/read-only API: WebView CORS settings do not affect desktop synchronization.
#[tauri::command]
pub async fn fetch_equipment_wiki(
    window: tauri::WebviewWindow,
    titles: Vec<String>,
    content: bool,
) -> Result<serde_json::Value, String> {
    if window.label() != "main" {
        return Err("装备同步仅允许主窗口调用".into());
    }
    if titles.is_empty() || titles.len() > 20 || titles.iter().any(|title| {
        title.is_empty() || title.len() > 255 || title.contains('|') || title.chars().any(char::is_control)
    }) {
        return Err("装备 Wiki 标题参数无效".into());
    }
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(20))
        .connect_timeout(Duration::from_secs(8))
        .redirect(reqwest::redirect::Policy::none())
        .user_agent("LuluEquipmentSync/1.0 (THE FINALS equipment encyclopedia)")
        .build().map_err(|e| e.to_string())?;
    let title_list = titles.join("|");
    let response = client.get("https://www.thefinals.wiki/w/api.php")
        .query(&[
            ("action", "query"), ("titles", title_list.as_str()), ("prop", "revisions"),
            ("rvprop", if content { "ids|timestamp|content" } else { "ids|timestamp" }),
            ("rvslots", "main"), ("redirects", "1"), ("format", "json"),
            ("formatversion", "2"), ("maxlag", "5"),
        ])
        .send().await.map_err(|e| format!("无法连接装备 Wiki: {e}"))?
        .error_for_status().map_err(|e| format!("装备 Wiki 请求失败: {e}"))?;
    response.json().await.map_err(|e| format!("装备 Wiki 响应格式错误: {e}"))
}
