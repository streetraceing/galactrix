use tauri::{Runtime, WebviewWindow};
use windows::Win32::{
    Foundation::{HWND, LPARAM, LRESULT, WPARAM},
    UI::{
        Shell::{DefSubclassProc, SetWindowSubclass},
        WindowsAndMessaging::{SC_KEYMENU, WM_SYSCOMMAND},
    },
};

const KEYBOARD_SYSTEM_MENU_GUARD_ID: usize = 0x4741_4C54;
const SYSTEM_COMMAND_MASK: usize = 0xFFF0;

unsafe extern "system" fn window_subclass(
    window: HWND,
    message: u32,
    wparam: WPARAM,
    lparam: LPARAM,
    _subclass_id: usize,
    _reference_data: usize,
) -> LRESULT {
    let command = (wparam.0 & SYSTEM_COMMAND_MASK) as u32;
    let is_keyboard_system_menu = message == WM_SYSCOMMAND && command == SC_KEYMENU;

    if is_keyboard_system_menu {
        return LRESULT(0);
    }

    unsafe { DefSubclassProc(window, message, wparam, lparam) }
}

pub fn install_keyboard_system_menu_guard<R: Runtime>(
    window: &WebviewWindow<R>,
) -> Result<(), String> {
    let native_window = window
        .hwnd()
        .map_err(|error| format!("failed to get the native window handle: {error}"))?;
    let installed = unsafe {
        SetWindowSubclass(
            native_window,
            Some(window_subclass),
            KEYBOARD_SYSTEM_MENU_GUARD_ID,
            0,
        )
    };

    if installed.as_bool() {
        Ok(())
    } else {
        Err("SetWindowSubclass returned false".into())
    }
}
