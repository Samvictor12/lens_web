# Lens Print Service (Node.js EXE Edition)

Local Windows service that silently receives and routes print jobs from Lens Web to local thermal/card/document printers on **localhost:9333**.

## Features

- **Multi-Printer Support**: Handles multiple connected printers on the same machine (e.g. TSC TE210 for Job Cards/Barcodes + Evolis Primacy for DC Customer Cards).
- **Dynamic Web Configuration**: Discovers all connected Windows printers (`/api/printers`) with live status (Ready, Offline, Paper Out, Door Open).
- **Direct Error Reporting**: Any printer issue (offline, out of paper, door open, spooler failure) is returned immediately with the exact reason and shown in the web UI.
- **Standalone EXE**: Bundled into `LensPrintService.exe` using `pkg` (zero Python / runtime dependencies on target PCs).
- **Silent Background Run**: Includes `run_silent.vbs` to run in the background with no console window.

## Development & Usage

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Service
```bash
npm start
```

### 3. Build Windows Executable (.exe)
```bash
npm run build
```
The output binary will be created at `dist/LensPrintService.exe`.

### 4. Silent Startup on Windows
1. Place `LensPrintService.exe` and `run_silent.vbs` in the same directory.
2. Press `Win + R` -> type `shell:startup` -> paste a shortcut to `run_silent.vbs`.

## HTTP API

| Method | Path | Body / Description |
|---|---|---|
| `GET` | `/health` | Service status (`{ status: "ok", port: 9333 }`) |
| `GET` | `/api/printers` | List of detected Windows printers and live status |
| `POST` | `/api/print/document` | `{ printerName, printType, payload }` |
| `POST` | `/api/printers/test-print` | `{ printerName, printType }` |
| `POST` | `/api/barcode/generateAndPrintBulk` | Bulk barcode generator |
