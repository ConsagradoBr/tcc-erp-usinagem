export function getDesktopApi() {
  if (typeof window === "undefined") return null;
  return window.webview2?.api ?? window.pywebview?.api ?? null;
}

export async function getDesktopWindowMaximized() {
  const api = getDesktopApi();
  if (!api?.is_maximized) return false;
  try {
    return Boolean(await api.is_maximized());
  } catch {
    return false;
  }
}

export async function toggleDesktopMaximize() {
  const api = getDesktopApi();
  if (!api) return false;

  try {
    if (api.toggle_maximize) {
      await api.toggle_maximize();
      if (api.is_maximized) {
        return Boolean(await api.is_maximized());
      }
      return false;
    }

    const maximized = api.is_maximized ? Boolean(await api.is_maximized()) : false;
    if (maximized && api.restore) {
      await api.restore();
      return false;
    }
    if (api.maximize) {
      await api.maximize();
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

export async function startDesktopDrag() {
  const api = getDesktopApi();
  if (!api?.start_drag) return false;

  try {
    await api.start_drag();
    return true;
  } catch {
    return false;
  }
}
