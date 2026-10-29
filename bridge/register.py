# SPDX-License-Identifier: GPL-3.0-or-later
import os
import sys
import winreg

HERE = os.path.dirname(os.path.abspath(__file__))
JSON_PATH = os.path.join(HERE, "com.zxd44.zxscript.json")
BRIDGE_PATH = os.path.join(HERE, "bridge.py")


def find_pythonw():
    base = os.path.dirname(sys.executable)
    cand = os.path.join(base, "pythonw.exe")
    if os.path.isfile(cand):
        return cand
    for env in ("LOCALAPPDATA", "ProgramFiles"):
        val = os.environ.get(env, "")
        if val:
            for root, _, files in os.walk(val):
                if "pythonw.exe" in files:
                    return os.path.join(root, "pythonw.exe")
                if root.count(os.sep) - val.count(os.sep) > 3:
                    break
    return sys.executable


def register_all():
    pyw = find_pythonw()

    # 1. Chrome Native Messaging Host
    k1 = winreg.CreateKey(winreg.HKEY_CURRENT_USER, r"Software\Google\Chrome\NativeMessagingHosts\com.zxd44.zxscript")
    winreg.SetValue(k1, "", winreg.REG_SZ, JSON_PATH)
    winreg.CloseKey(k1)

    # 2. Edge Native Messaging Host
    k2 = winreg.CreateKey(winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Edge\NativeMessagingHosts\com.zxd44.zxscript")
    winreg.SetValue(k2, "", winreg.REG_SZ, JSON_PATH)
    winreg.CloseKey(k2)

    # 3. Protocol Handler (zxscript://)
    k3 = winreg.CreateKey(winreg.HKEY_CURRENT_USER, r"Software\Classes\zxscript")
    winreg.SetValue(k3, "", winreg.REG_SZ, "URL:ZXScript Protocol")
    winreg.SetValueEx(k3, "URL Protocol", 0, winreg.REG_SZ, "")
    k3_cmd = winreg.CreateKey(k3, r"shell\open\command")
    cmd = f'"{pyw}" "{BRIDGE_PATH}"'
    winreg.SetValue(k3_cmd, "", winreg.REG_SZ, cmd)
    winreg.CloseKey(k3_cmd)
    winreg.CloseKey(k3)

    print("REGISTERED_OK")
    print(f"Manifest: {JSON_PATH}")
    print(f"Protocol: {cmd}")


if __name__ == "__main__":
    register_all()
