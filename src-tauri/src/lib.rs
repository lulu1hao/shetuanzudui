use std::io::{Read, Write};
use std::net::{TcpStream, ToSocketAddrs};
use std::time::{Duration, Instant};
use tauri::Manager;
mod twitch_drops;

#[tauri::command]
async fn test_twitch_network(
  proxy_host: Option<String>,
  proxy_port: Option<u16>,
) -> Result<serde_json::Value, String> {
  tauri::async_runtime::spawn_blocking(move || probe_twitch_network(proxy_host, proxy_port))
    .await.map_err(|e| e.to_string())?
}

fn probe_twitch_network(
  proxy_host: Option<String>,
  proxy_port: Option<u16>,
) -> Result<serde_json::Value, String> {
  if let Some(host) = proxy_host.as_deref() {
    if host != "127.0.0.1" && host != "localhost" && host != "::1" {
      return Err("仅支持本机代理".into());
    }
    if proxy_port.map_or(true, |port| port == 0) { return Err("代理端口无效".into()); }
  }
  let timeout = Duration::from_millis(3500);

  // 1. 如果指定了本地代理，测试通过代理建立 CONNECT 隧道
  let proxy_result = if let (Some(host), Some(port)) = (proxy_host, proxy_port) {
    if !host.trim().is_empty() && port > 0 {
      let host_trimmed = host.trim();
      let addr_str = if host_trimmed.contains(':') && !host_trimmed.starts_with('[') {
        format!("[{}]:{}", host_trimmed, port)
      } else {
        format!("{}:{}", host_trimmed, port)
      };
      let start = Instant::now();
      match addr_str.to_socket_addrs() {
        Ok(mut addrs) => {
          if let Some(addr) = addrs.next() {
            match TcpStream::connect_timeout(&addr, timeout) {
              Ok(mut stream) => {
                let _ = stream.set_read_timeout(Some(timeout));
                let _ = stream.set_write_timeout(Some(timeout));
                let req = format!(
                  "CONNECT www.twitch.tv:443 HTTP/1.1\r\nHost: www.twitch.tv:443\r\nProxy-Connection: Keep-Alive\r\n\r\n"
                );
                if stream.write_all(req.as_bytes()).is_ok() {
                  let mut buffer = [0u8; 512];
                  match stream.read(&mut buffer) {
                    Ok(n) if n > 0 => {
                      let resp = String::from_utf8_lossy(&buffer[..n]);
                      let elapsed = start.elapsed().as_millis() as u64;
                      if resp.starts_with("HTTP/1.1 200") || resp.starts_with("HTTP/1.0 200") {
                        Some(serde_json::json!({
                          "configured": true,
                          "address": addr_str,
                          "connected": true,
                          "tunnel_ok": true,
                          "latency_ms": elapsed,
                          "message": format!("代理隧道连通正常 ({}ms)", elapsed)
                        }))
                      } else {
                        Some(serde_json::json!({
                          "configured": true,
                          "address": addr_str,
                          "connected": true,
                          "tunnel_ok": false,
                          "latency_ms": elapsed,
                          "message": format!("代理已连接，但目标拒绝连接: {}", resp.lines().next().unwrap_or(""))
                        }))
                      }
                    }
                    _ => Some(serde_json::json!({
                      "configured": true,
                      "address": addr_str,
                      "connected": true,
                      "tunnel_ok": false,
                      "latency_ms": 0,
                      "message": "代理握手响应超时"
                    })),
                  }
                } else {
                  Some(serde_json::json!({
                    "configured": true,
                    "address": addr_str,
                    "connected": false,
                    "tunnel_ok": false,
                    "latency_ms": 0,
                    "message": "写入代理请求失败"
                  }))
                }
              }
              Err(e) => Some(serde_json::json!({
                "configured": true,
                "address": addr_str,
                "connected": false,
                "tunnel_ok": false,
                "latency_ms": 0,
                "message": format!("无法连接本地代理端口: {e}")
              })),
            }
          } else {
            Some(serde_json::json!({
              "configured": true,
              "address": addr_str,
              "connected": false,
              "tunnel_ok": false,
              "latency_ms": 0,
              "message": "无法解析代理主机地址"
            }))
          }
        }
        Err(e) => Some(serde_json::json!({
          "configured": true,
          "address": addr_str,
          "connected": false,
          "tunnel_ok": false,
          "latency_ms": 0,
          "message": format!("代理地址格式错误: {e}")
        })),
      }
    } else {
      None
    }
  } else {
    None
  };

  // 2. 测试直连状态 (DNS 解析及直连 TCP 443 端口)
  let direct_start = Instant::now();
  let direct_status = match "www.twitch.tv:443".to_socket_addrs() {
    Ok(mut addrs) => {
      if let Some(addr) = addrs.next() {
        match TcpStream::connect_timeout(&addr, Duration::from_millis(2500)) {
          Ok(_) => {
            let elapsed = direct_start.elapsed().as_millis() as u64;
            serde_json::json!({
              "reachable": true,
              "ip": addr.ip().to_string(),
              "latency_ms": elapsed,
              "message": format!("直连通畅 ({}ms)", elapsed)
            })
          }
          Err(e) => serde_json::json!({
            "reachable": false,
            "ip": addr.ip().to_string(),
            "latency_ms": 0,
            "message": format!("直连超时/被阻断: {e}")
          }),
        }
      } else {
        serde_json::json!({
          "reachable": false,
          "ip": "",
          "latency_ms": 0,
          "message": "DNS 未返回 IP"
        })
      }
    }
    Err(e) => serde_json::json!({
      "reachable": false,
      "ip": "",
      "latency_ms": 0,
      "message": format!("DNS 解析失败: {e}")
    }),
  };

  Ok(serde_json::json!({
    "direct": direct_status,
    "proxy": proxy_result,
  }))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .manage(twitch_drops::DropsRuntime::default())
    .plugin(tauri_plugin_updater::Builder::new().build())
    .plugin(tauri_plugin_process::init())
    .invoke_handler(tauri::generate_handler![
      twitch_drops::get_twitch_accounts,
      twitch_drops::create_twitch_account,
      twitch_drops::switch_twitch_account,
      twitch_drops::update_twitch_account_binding,
      twitch_drops::rename_twitch_account,
      twitch_drops::delete_twitch_account,
      twitch_drops::get_twitch_miner_status,
      twitch_drops::open_twitch_miner_window,
      twitch_drops::ensure_twitch_control_window,
      twitch_drops::show_twitch_login_window,
      twitch_drops::toggle_twitch_miner_window,
      twitch_drops::refresh_twitch_miner_state,
      twitch_drops::close_twitch_miner_window,
      test_twitch_network,
    ])
    .setup(|app| {
      if let Some(main_window) = app.get_webview_window("main") {
        let app_handle = app.handle().clone();
        main_window.on_window_event(move |event| {
          if matches!(event, tauri::WindowEvent::CloseRequested { .. }) {
            let _ = twitch_drops::destroy_twitch_windows(&app_handle);
          }
        });
      }
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
