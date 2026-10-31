# SPDX-License-Identifier: GPL-3.0-or-later
"""
bridge/register.py - Register Native Messaging Host & Protocol Handlers.
Registers across Chrome, Edge, Chromium, and Brave (both 64-bit and WOW6432 views).
"""
import json
import os
import sys
import winreg

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(HERE)
JSON_PATH = os.path.join(HERE, "com.zxd44.zxscript.json")
EXE_PATH = os.path.join(HERE, "native_host.exe")
START_BAT = os.path.join(ROOT_DIR, "start.bat")


def update_manifest():
    """Ensure manifest JSON contains absolute paths and valid allowed_origins."""
    if not os.path.isfile(JSON_PATH):
        return
    try:
        with open(JSON_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        data["path"] = EXE_PATH
        origins = set(data.get("allowed_origins", []))
        # Known extension IDs
        origins.add("chrome-extension://cbmadojiljkhmecogmghiaeclhkjinak/")
        origins.add("chrome-extension://bcamodijjlhkemocmghgaicehljknika/")
        origins.add("edge-extension://cbmadojiljkhmecogmghiaeclhkjinak/")
        origins.add("edge-extension://bcamodijjlhkemocmghgaicehljknika/")
        data["allowed_origins"] = sorted(list(origins))
        with open(JSON_PATH, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"Warning: could not update {JSON_PATH}: {e}")


def register_key(root, subkey, val):
    try:
        k = winreg.CreateKey(root, subkey)
        winreg.SetValue(k, "", winreg.REG_SZ, val)
        winreg.CloseKey(k)
        return True
    except Exception:
        return False


def register_all():
    update_manifest()

    host_name = "com.zxd44.zxscript"
    targets = [
        # Chrome (User & Machine, 64 & 32 bit)
        (winreg.HKEY_CURRENT_USER, rf"Software\Google\Chrome\NativeMessagingHosts\{host_name}"),
        (winreg.HKEY_CURRENT_USER, rf"Software\Wow6432Node\Google\Chrome\NativeMessagingHosts\{host_name}"),
        (winreg.HKEY_LOCAL_MACHINE, rf"Software\Google\Chrome\NativeMessagingHosts\{host_name}"),
        (winreg.HKEY_LOCAL_MACHINE, rf"Software\Wow6432Node\Google\Chrome\NativeMessagingHosts\{host_name}"),
        # Edge
        (winreg.HKEY_CURRENT_USER, rf"Software\Microsoft\Edge\NativeMessagingHosts\{host_name}"),
        (winreg.HKEY_CURRENT_USER, rf"Software\Wow6432Node\Microsoft\Edge\NativeMessagingHosts\{host_name}"),
        (winreg.HKEY_LOCAL_MACHINE, rf"Software\Microsoft\Edge\NativeMessagingHosts\{host_name}"),
        (winreg.HKEY_LOCAL_MACHINE, rf"Software\Wow6432Node\Microsoft\Edge\NativeMessagingHosts\{host_name}"),
        # Chromium & Brave
        (winreg.HKEY_CURRENT_USER, rf"Software\Chromium\NativeMessagingHosts\{host_name}"),
        (winreg.HKEY_CURRENT_USER, rf"Software\BraveSoftware\Brave-Browser\NativeMessagingHosts\{host_name}"),
    ]

    ok_count = 0
    for root, subkey in targets:
        if register_key(root, subkey, JSON_PATH):
            ok_count += 1

    # Protocol Handler (zxscript://)
    try:
        k3 = winreg.CreateKey(winreg.HKEY_CURRENT_USER, r"Software\Classes\zxscript")
        winreg.SetValue(k3, "", winreg.REG_SZ, "URL:ZXScript Bridge Protocol")
        winreg.SetValueEx(k3, "FriendlyTypeName", 0, winreg.REG_SZ, "ZXScript Bridge")
        winreg.SetValueEx(k3, "URL Protocol", 0, winreg.REG_SZ, "")
        winreg.SetValueEx(k3, "AppUserModelId", 0, winreg.REG_SZ, "ZXScript.Bridge")

        py = sys.executable
        pyw = os.path.join(os.path.dirname(py), "pythonw.exe")
        runner = pyw if os.path.isfile(pyw) else py
        cmd = f'"{EXE_PATH}" start "%1"' if os.path.isfile(EXE_PATH) else f'"{runner}" "{os.path.join(HERE, "bridge.py")}"'
        k3_cmd = winreg.CreateKey(k3, r"shell\open\command")
        winreg.SetValue(k3_cmd, "", winreg.REG_SZ, cmd)
        winreg.CloseKey(k3_cmd)
        winreg.CloseKey(k3)
    except Exception as e:
        print(f"Warning: could not register protocol: {e}")

    # Browser Policies: AutoLaunchProtocolsFromOrigins (Silent launch, bypass confirmation dialog)
    policy_data = json.dumps({
        "protocol": "zxscript",
        "allowed_origins": [
            "chrome-extension://cbmadojiljkhmecogmghiaeclhkjinak",
            "https://chatgpt.com",
            "https://claude.ai",
            "https://chat.deepseek.com",
            "https://gemini.google.com"
        ]
    })
    for pol_path in (
        r"Software\Policies\Google\Chrome\AutoLaunchProtocolsFromOrigins",
        r"Software\Policies\Microsoft\Edge\AutoLaunchProtocolsFromOrigins",
        r"Software\Policies\BraveSoftware\Brave\AutoLaunchProtocolsFromOrigins"
    ):
        try:
            kpol = winreg.CreateKey(winreg.HKEY_CURRENT_USER, pol_path)
            winreg.SetValueEx(kpol, "1", 0, winreg.REG_SZ, policy_data)
            winreg.CloseKey(kpol)
        except Exception:
            pass

    # Do not auto-register to Windows Startup unconditionally.
    # Autostart should only be toggled explicitly by the user via extension / native_host.
    try:
        krun = winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Windows\CurrentVersion\Run", 0, winreg.KEY_SET_VALUE)
        try:
            winreg.DeleteValue(krun, "ZXScriptBridge")
        except FileNotFoundError:
            pass
        winreg.CloseKey(krun)
    except Exception:
        pass

    print(f"REGISTERED_OK: {ok_count} registry locations updated.")
    print(f"Manifest: {JSON_PATH}")


if __name__ == "__main__":
    register_all()
