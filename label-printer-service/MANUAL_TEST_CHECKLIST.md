# Windows / shop-floor manual checklist

Run automated tests first:

```bash
npm run test:silent-print
```

Then on an Assembly PC:

1. First-run `MES-Printer.exe` — printers listed, pick one, mode Auto or Image only, port 8081, settings file created
2. Reset EXE clears settings; relaunch re-prompts
3. `run_silent.vbs` + Startup shortcut; after login `:8081/health` returns ok
4. Dry-run: `MES_PRINTER_DRY_RUN=1` then `curl -X POST http://127.0.0.1:8081/api/print/fg-label -H "Content-Type: application/json" -d "{\"value\":\"TEST123/09092026\"}"` → files under `printed/`
5. Real print of `TEST123/09092026` on the configured label printer
6. Assembly scan: gates pass → label prints → only then completed list shows `fg_barcode = qrValue`
7. Stop MES-Printer / unplug printer → Assembly shows print error, **no** new FG row
8. Verify modal accepts scanned printed QR
9. Completed-list Reprint uses 8081 only (no Chrome print dialog)
