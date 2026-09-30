# MES Label Printer

Local Windows service that silently prints Assembly FG labels
(**10mm × 10mm** label, centered QR or Data Matrix, **gap 2mm**)
on **localhost:8081**.

## Why TSC Auto is Image-only

On **TSC TE210**, RAW (`OpenPrinter` for TSPL/ZPL) often **hangs** while Ready,
so Auto used to burn the 8s HTTP budget and return `Print timed out`.
Windows Test Page works because it uses **GDI**.

**Auto on TSC → Image/GDI only** via a **warm persistent System.Drawing worker**
(no cold PowerShell per label) drawing a **10×10 mm** artwork on a
**label+gap form** (gap 2mm → **12mm** pitch) so every label stays registered.
Mode **3 TSPL** remains opt-in.

## First run

1. Double-click `MES-Printer.exe` (or `npm start` from source).
2. Pick a printer from the numbered list (or paste a name).
3. Choose print mode:
   - `1` Auto — **TSC → Image 10×10 mm** (warm GDI worker); other printers → ZPL then Image
   - `2` Image only (10×10 mm GDI, gap 2mm)
   - `3` TSC TSPL only (opt-in RAW — may hang on TE210)
   - `4` **Barcode-script RAW** — same OpenPrinter path as `barcode_script.py`
     (no GDI). On **TSC** sends **TSPL** QR/`DMATRIX` (honors your barcode-type choice).
     On other printers sends ZPL QR/`^BX`. **Use this on TE210.**
4. Choose barcode type:
   - `1` Normal QR
   - `2` Data Matrix
5. Confirm port (default **8081**).

Settings are saved to `printer-settings.json` next to the exe.
Missing `barcodeType` defaults to **Normal QR**.

If the window **closes immediately**, another MES-Printer usually still owns
port **8081**. End it in Task Manager, then retry. Fatals stay on screen and
are written to `logs/printer.log`.

After a red-light fault: clear the error on the TSC (feed/cancel), confirm
gap sensor / stock, then reprint.

## Floor check (TE210)

1. Kill old MES-Printer; start new exe; printer Ready (no red).
2. `GET http://127.0.0.1:8081/health` → `printerName: TSC TE210`, `printMode: auto`.
3. `POST /api/print/fg-label` with a Data Matrix FG value → HTTP **200** in &lt;5s.
4. `logs/printer.log`: `PRINT done` with `method: "image-tsc"` / `image-worker` / `image-oneshot`.
5. Physical: **each** label centered. TE210 prefs: **10×10 mm**, gap **2 mm**.
   Prefer mode **4** if Image mode still drifts or the PC/printer drops on the 2nd job.
6. Second print immediately after: still one label, ideally **&lt;1s** after API hit (`PRINT done` ms).
   Mode 4 log: `method: "barcode-script"`.

## Reset

Run `MES-Printer-Reset.exe` (or `npm run reset`) to delete settings, then run
the main exe again.

## Silent startup

1. Keep `MES-Printer.exe` and `run_silent.vbs` in the same folder.
2. `Win + R` → `shell:startup` → shortcut to `run_silent.vbs`.

## HTTP API

| Method | Path | Body | Notes |
|---|---|---|---|
| GET | `/health` | — | `{ ok, printerName, printMode, barcodeType, port, workerReady }` |
| GET | `/api/printers` | — | Local printer list |
| POST | `/api/print/fg-label` | `{ "value": "PCB/DDMMYYYY" }` | Silent print (≤8s timeout) |

Check `logs/printer.log` for `PRINT start` / `PRINT done` / `PRINT fail`.
Warm image worker is used only when already ready; otherwise a hard-timeout
oneshot runs (request path never waits on worker startup).

## Dry-run

`MES_PRINTER_DRY_RUN=1` → writes `./printed/` artifacts, no spooler.

## Build

```bash
npm install
npm test
npm run build
```

## Frontend env

```
VITE_LABEL_PRINTER_URL_ASSEMBLY=http://localhost:8081
```
