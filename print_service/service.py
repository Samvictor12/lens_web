"""
Lens Print Service
- Runs silently in background with a system tray icon
- Flask API on 127.0.0.1:9333 (localhost only)
- Self-installs to %LOCALAPPDATA%\LensPrintService\ on first run
- Registers Windows startup entry automatically
- Tray icon: right-click to Stop or Uninstall
"""

import sys
import os
import threading
import tempfile
import shutil
import winreg
import subprocess
import logging
from pathlib import Path
from flask import Flask, request, jsonify
from flask_cors import CORS
import win32print
import pystray
from PIL import Image, ImageDraw, ImageFont

# ── Constants ─────────────────────────────────────────────────────────────────
SERVICE_NAME   = "LensPrintService"
SERVICE_PORT   = 9333
INSTALL_DIR    = Path(os.environ.get("LOCALAPPDATA", "C:\\Users\\Public")) / SERVICE_NAME
EXE_NAME       = "LensPrintService.exe"
REGISTRY_KEY   = r"SOFTWARE\Microsoft\Windows\CurrentVersion\Run"

# ── Logging ───────────────────────────────────────────────────────────────────
INSTALL_DIR.mkdir(parents=True, exist_ok=True)
logging.basicConfig(
    filename=str(INSTALL_DIR / "service.log"),
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)
log = logging.getLogger(__name__)

# ── Self-install ──────────────────────────────────────────────────────────────
def is_frozen():
    """True when running as a PyInstaller .exe"""
    return getattr(sys, "frozen", False)

def installed_exe():
    return INSTALL_DIR / EXE_NAME

def self_install():
    """
    On first launch (not already in install dir):
      1. Copy exe → %LOCALAPPDATA%\LensPrintService\LensPrintService.exe
      2. Register startup registry key
      3. Re-launch from install dir, then exit current process
    """
    if not is_frozen():
        return  # Running as a plain .py script in dev — skip install

    current_exe = Path(sys.executable)
    dest = installed_exe()

    if current_exe.resolve() == dest.resolve():
        return  # Already running from install dir

    # Copy
    INSTALL_DIR.mkdir(parents=True, exist_ok=True)
    shutil.copy2(current_exe, dest)
    log.info(f"Installed to {dest}")

    # Register startup
    _register_startup(dest)

    # Re-launch from install dir
    subprocess.Popen([str(dest)], cwd=str(INSTALL_DIR))
    sys.exit(0)


def _register_startup(exe_path: Path):
    try:
        key = winreg.OpenKey(
            winreg.HKEY_CURRENT_USER, REGISTRY_KEY, 0, winreg.KEY_SET_VALUE
        )
        winreg.SetValueEx(key, SERVICE_NAME, 0, winreg.REG_SZ, str(exe_path))
        winreg.CloseKey(key)
        log.info("Registered Windows startup entry")
    except Exception as e:
        log.warning(f"Could not register startup: {e}")


def _remove_startup():
    try:
        key = winreg.OpenKey(
            winreg.HKEY_CURRENT_USER, REGISTRY_KEY, 0, winreg.KEY_SET_VALUE
        )
        winreg.DeleteValue(key, SERVICE_NAME)
        winreg.CloseKey(key)
        log.info("Removed Windows startup entry")
    except Exception:
        pass


# ── Flask app ─────────────────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app, origins=[
    "http://localhost:5173",   # Vite dev
    "http://localhost:3000",
    "http://localhost:4173",   # Vite preview
    # Add your production domain here, e.g. "https://yourlensapp.com"
])


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "service": SERVICE_NAME,
        "version": "1.0.0",
        "port": SERVICE_PORT,
    })


def decode_status(status):
    statuses = []
    if status == 0:
        return "Ready"
    if status & 0x00000001: statuses.append("Paused")
    if status & 0x00000002: statuses.append("Error")
    if status & 0x00000004: statuses.append("Pending Deletion")
    if status & 0x00000008: statuses.append("Paper Jam")
    if status & 0x00000010: statuses.append("Paper Out")
    if status & 0x00000020: statuses.append("Paper Problem")
    if status & 0x00000040: statuses.append("Out of Memory")
    if status & 0x00000080: statuses.append("Offline")
    if status & 0x00000100: statuses.append("IO Active")
    if status & 0x00000200: statuses.append("Busy")
    if status & 0x00000400: statuses.append("Printing")
    if status & 0x00000800: statuses.append("Output Bin Full")
    if status & 0x00001000: statuses.append("Not Available")
    if status & 0x00002000: statuses.append("Waiting")
    if status & 0x00004000: statuses.append("Processing")
    if status & 0x00008000: statuses.append("Initializing")
    if status & 0x00010000: statuses.append("Warming Up")
    if status & 0x00020000: statuses.append("Toner Low")
    if status & 0x00040000: statuses.append("No Toner")
    if status & 0x00080000: statuses.append("Page Punt")
    if status & 0x00100000: statuses.append("User Intervention Required")
    if status & 0x00200000: statuses.append("Out of Paper")
    if status & 0x00400000: statuses.append("Door Open")
    return ", ".join(statuses) if statuses else f"Status ({status})"


@app.route("/api/printers", methods=["GET"])
def list_printers():
    try:
        flags = win32print.PRINTER_ENUM_LOCAL | win32print.PRINTER_ENUM_CONNECTIONS
        try:
            # Query Level 2 to get the Status field
            printers_info = win32print.EnumPrinters(flags, None, 2)
            printers = []
            details = []
            for p in printers_info:
                name = p.get('pPrinterName', '')
                status_code = p.get('Status', 0)
                status_str = decode_status(status_code)
                printers.append(name)
                details.append({
                    "name": name,
                    "status_code": status_code,
                    "status": status_str
                })
            return jsonify({"printers": printers, "details": details, "status": 200})
        except Exception as e:
            log.warning(f"Failed to enum level 2: {e}, falling back to level 1")
            printers_info = win32print.EnumPrinters(flags)
            printers = [p[2] for p in printers_info]
            details = [{"name": name, "status_code": 0, "status": "Ready"} for name in printers]
            return jsonify({"printers": printers, "details": details, "status": 200})
    except Exception as e:
        log.error(f"list_printers: {e}")
        return jsonify({"message": str(e), "status": 500}), 500


@app.route("/api/printers/test-print", methods=["POST"])
def test_print():
    try:
        data = request.json or {}
        printer_name = data.get("printerName")
        print_type = data.get("printType", "BARCODE_LABEL")
        
        if not printer_name:
            return jsonify({"message": "printerName is required", "status": 400}), 400
            
        if print_type == "BARCODE_LABEL":
            # Simple test ZPL label
            zpl = (
                "^XA\n"
                "^FO40,30^A0N,30,20^FDTEST PRINT - OK^FS\n"
                f"^FO40,65^A0N,18,12^FDPrinter: {printer_name}^FS\n"
                "^FO40,95^A0N,18,12^FDConnection: local^FS\n"
                "^PQ1,0,1,Y\n"
                "^XZ"
            )
            raw = zpl.encode("utf-8")
            _send_to_printer(printer_name, raw)
        else:
            # Standard print test for A4/A5 sent as raw text
            test_text = (
                "\r\n========================================\r\n"
                "LENS PRINT SERVICE TEST PRINT\r\n"
                f"Printer: {printer_name}\r\n"
                f"Type: {print_type}\r\n"
                "Status: OK\r\n"
                "========================================\r\n\f"
            )
            raw = test_text.encode("utf-8")
            _send_to_printer(printer_name, raw)
            
        return jsonify({"message": "Test print job spooled successfully", "status": 200})
    except Exception as e:
        log.error(f"test_print: {e}")
        return jsonify({"message": str(e), "status": 500}), 500


def _build_zpl(top_label: str, barcode_serial: str, bottom_label: str,
               width_dots: int = 180) -> str:
    return (
        f"^XA\n"
        f"^SZ2^JMA\n"
        f"^MCY^PMN\n"
        f"^PW{width_dots}\n"
        f"^JZY\n"
        f"^LH0,0^LRN\n"
        f"^XZ\n"
        f"^XA\n"
        f"^FT4,17\n"
        f"^CI0\n"
        f"^A0N,20,13^FD{top_label}^FS\n"
        f"^FO10,33\n"
        f"^BQM,3^FDMA,{barcode_serial}^FS\n"
        f"^FT10,145\n"
        f"^A0N,20,13^FD{bottom_label}^FS\n"
        f"^PQ1,0,1,Y\n"
        f"^XZ"
    )


def _send_to_printer(printer_name: str, raw_data: bytes):
    handle = win32print.OpenPrinter(printer_name)
    try:
        win32print.StartDocPrinter(handle, 1, ("Lens Label", None, "RAW"))
        win32print.StartPagePrinter(handle)
        win32print.WritePrinter(handle, raw_data)
        win32print.EndPagePrinter(handle)
        win32print.EndDocPrinter(handle)
    finally:
        win32print.ClosePrinter(handle)


@app.route("/api/barcode/generateAndPrintBulk", methods=["POST"])
def print_labels():
    try:
        data          = request.json or {}
        serials       = data.get("barcodeSerial", [])
        bottom_labels = data.get("bottomLabel", [])
        top_label     = str(data.get("topLabel", ""))
        printer_info  = data.get("printerName", {})
        printer_name  = (
            printer_info.get("Printer_name", "")
            if isinstance(printer_info, dict)
            else str(printer_info)
        )
        label_width   = int(data.get("labelWidth", 180))

        if not printer_name:
            return jsonify({"message": "printerName is required", "status": 400}), 400
        if len(serials) != len(bottom_labels):
            return jsonify({
                "message": "barcodeSerial and bottomLabel arrays must be the same length",
                "status": 400,
            }), 400

        for serial, bottom in zip(serials, bottom_labels):
            zpl  = _build_zpl(top_label, str(serial), str(bottom), label_width)
            raw  = zpl.encode("utf-8")
            tmp  = tempfile.NamedTemporaryFile(delete=False, suffix=".prn")
            try:
                tmp.write(raw)
                tmp.close()
                with open(tmp.name, "rb") as f:
                    _send_to_printer(printer_name, f.read())
            finally:
                try:
                    os.unlink(tmp.name)
                except OSError:
                    pass

        log.info(f"Printed {len(serials)} label(s) on '{printer_name}'")
        return jsonify({"message": f"Printed {len(serials)} label(s) successfully", "status": 200})

    except Exception as e:
        log.error(f"print_labels: {e}")
        return jsonify({"message": str(e), "status": 500}), 500


# ── System Tray ───────────────────────────────────────────────────────────────
def _make_tray_icon() -> Image.Image:
    """Generate a 64×64 teal circle icon with 'LP' text."""
    size = 64
    img  = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    # Teal filled circle
    draw.ellipse([2, 2, size - 2, size - 2], fill=(20, 184, 166))
    # White 'LP' text — use default font (no TTF needed)
    draw.text((14, 18), "LP", fill=(255, 255, 255))
    return img


_tray_icon = None  # global ref so we can stop it


def _on_stop(icon, item):
    """Stop the service (keeps install, just stops running)."""
    log.info("Stop requested from tray")
    icon.stop()
    os._exit(0)


def _on_uninstall(icon, item):
    """Remove startup entry and exit."""
    log.info("Uninstall requested from tray")
    _remove_startup()
    icon.stop()
    # Optionally delete install dir — commented out for safety
    # shutil.rmtree(INSTALL_DIR, ignore_errors=True)
    os._exit(0)


def start_tray():
    global _tray_icon
    menu = pystray.Menu(
        pystray.MenuItem(f"{SERVICE_NAME}  v1.0", None, enabled=False),
        pystray.MenuItem(f"Listening on port {SERVICE_PORT}", None, enabled=False),
        pystray.Menu.SEPARATOR,
        pystray.MenuItem("Stop Service", _on_stop),
        pystray.MenuItem("Uninstall & Remove", _on_uninstall),
    )
    _tray_icon = pystray.Icon(SERVICE_NAME, _make_tray_icon(), SERVICE_NAME, menu)
    _tray_icon.run()  # blocks — must run on main thread on Windows


# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    self_install()   # no-op in dev; copies & relaunches if not in install dir

    log.info(f"Starting Flask on 127.0.0.1:{SERVICE_PORT}")

    # Flask runs in a daemon thread so it dies when the process exits
    flask_thread = threading.Thread(
        target=lambda: app.run(
            host="127.0.0.1",
            port=SERVICE_PORT,
            debug=False,
            use_reloader=False,
        ),
        daemon=True,
        name="FlaskThread",
    )
    flask_thread.start()

    # Tray icon must run on the main thread on Windows
    start_tray()
