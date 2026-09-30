const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');
const { spawn, execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

const WORKER_SCRIPT = path.join(os.tmpdir(), 'mes-raw-print-worker.ps1');
const ONESHOT_SCRIPT = path.join(os.tmpdir(), 'mes-raw-print-oneshot.ps1');
const BARCODE_SCRIPT_ONESHOT = path.join(os.tmpdir(), 'mes-barcode-script-oneshot.ps1');
const BARCODE_SCRIPT_WORKER = path.join(os.tmpdir(), 'mes-barcode-script-worker.ps1');
const IMAGE_WORKER_SCRIPT = path.join(os.tmpdir(), 'mes-image-print-worker.ps1');
const IMAGE_ONESHOT_SCRIPT = path.join(os.tmpdir(), 'mes-image-print-oneshot.ps1');
const JOB_TIMEOUT_MS = 4000;
const READY_TIMEOUT_MS = 12000;
const ONESHOT_TIMEOUT_MS = 5000;
const BARCODE_SCRIPT_TIMEOUT_MS = 8000;
const BARCODE_SCRIPT_JOB_TIMEOUT_MS = 5000;
const IMAGE_TIMEOUT_MS = 4500;
const IMAGE_JOB_TIMEOUT_MS = 3000;
const IMAGE_READY_TIMEOUT_MS = 10000;

function writeTempFile(prefix, ext, content) {
  const filePath = path.join(
    os.tmpdir(),
    `mes-label-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`,
  );
  if (Buffer.isBuffer(content)) {
    fs.writeFileSync(filePath, content);
  } else {
    fs.writeFileSync(filePath, content, 'utf8');
  }
  return filePath;
}

function cleanup(filePath) {
  try {
    fs.unlinkSync(filePath);
  } catch (_) {
    /* ignore */
  }
}

const RAW_CSHARP = `
using System;
using System.Runtime.InteropServices;
public class MesRawPrinter {
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Ansi)]
  public class DOCINFOA {
    [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
  }
  [DllImport("winspool.Drv", EntryPoint="OpenPrinterA", SetLastError=true, CharSet=CharSet.Ansi, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);
  [DllImport("winspool.Drv", EntryPoint="ClosePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool ClosePrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", EntryPoint="StartDocPrinterA", SetLastError=true, CharSet=CharSet.Ansi, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool StartDocPrinter(IntPtr hPrinter, Int32 level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);
  [DllImport("winspool.Drv", EntryPoint="EndDocPrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool EndDocPrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", EntryPoint="StartPagePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool StartPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", EntryPoint="EndPagePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool EndPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", EntryPoint="WritePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, Int32 dwCount, out Int32 dwWritten);
}
`;

const RAW_PRINT_FN_PS1 = `
function Send-MesRawBytes([string]$printer, [byte[]]$bytes) {
  $hPrinter = [IntPtr]::Zero
  if (-not [MesRawPrinter]::OpenPrinter($printer, [ref]$hPrinter, [IntPtr]::Zero)) {
    throw "OpenPrinter failed for $printer"
  }
  $di = New-Object MesRawPrinter+DOCINFOA
  $di.pDocName = "MES-FG-Label"
  $di.pDataType = "RAW"
  try {
    if (-not [MesRawPrinter]::StartDocPrinter($hPrinter, 1, $di)) { throw "StartDocPrinter failed" }
    if (-not [MesRawPrinter]::StartPagePrinter($hPrinter)) { throw "StartPagePrinter failed" }
    $pUnmanaged = [System.Runtime.InteropServices.Marshal]::AllocHGlobal($bytes.Length)
    try {
      [System.Runtime.InteropServices.Marshal]::Copy($bytes, 0, $pUnmanaged, $bytes.Length)
      $written = 0
      if (-not [MesRawPrinter]::WritePrinter($hPrinter, $pUnmanaged, $bytes.Length, [ref]$written)) {
        throw "WritePrinter failed"
      }
    } finally {
      [System.Runtime.InteropServices.Marshal]::FreeHGlobal($pUnmanaged)
    }
    [MesRawPrinter]::EndPagePrinter($hPrinter) | Out-Null
    [MesRawPrinter]::EndDocPrinter($hPrinter) | Out-Null
  } finally {
    [MesRawPrinter]::ClosePrinter($hPrinter) | Out-Null
  }
}
`;

const RAW_WORKER_PS1 = `
$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::Out.AutoFlush = $true
Add-Type -TypeDefinition @"
${RAW_CSHARP}
"@
${RAW_PRINT_FN_PS1}
function Write-JsonLine([string]$json) {
  [Console]::Out.WriteLine($json)
  [Console]::Out.Flush()
}
Write-JsonLine '{"ready":true}'
while ($true) {
  $line = [Console]::In.ReadLine()
  if ($null -eq $line) { break }
  if ($line -eq 'EXIT') { break }
  if ([string]::IsNullOrWhiteSpace($line)) { continue }
  try {
    $job = $line | ConvertFrom-Json
    $printer = [string]$job.printer
    if ($job.data) {
      $bytes = [Convert]::FromBase64String([string]$job.data)
    } else {
      $bytes = [System.IO.File]::ReadAllBytes([string]$job.path)
    }
    Send-MesRawBytes $printer $bytes
    Write-JsonLine '{"ok":true}'
  } catch {
    $msg = [string]$_.Exception.Message
    $msg = $msg.Replace([char]13, ' ').Replace([char]10, ' ').Replace('\\', '\\\\').Replace('"', '\\"')
    Write-JsonLine ('{"ok":false,"error":"' + $msg + '"}')
  }
}
`;

const RAW_ONESHOT_PS1 = `
param(
  [Parameter(Mandatory=$true)][string]$Printer,
  [Parameter(Mandatory=$true)][string]$Path
)
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @"
${RAW_CSHARP}
"@
${RAW_PRINT_FN_PS1}
$bytes = [System.IO.File]::ReadAllBytes($Path)
Send-MesRawBytes $Printer $bytes
`;

/**
 * Matches win32print in barcode_script.py:
 * OpenPrinter → StartDocPrinter(RAW) → WritePrinter → EndDocPrinter → ClosePrinter
 * (no StartPagePrinter / EndPagePrinter — those differ from the working Python path)
 */
const BARCODE_SCRIPT_SEND_FN_PS1 = `
function Send-BarcodeScriptRaw([string]$printer, [byte[]]$bytes) {
  $hPrinter = [IntPtr]::Zero
  if (-not [MesRawPrinter]::OpenPrinter($printer, [ref]$hPrinter, [IntPtr]::Zero)) {
    throw "OpenPrinter failed for $printer"
  }
  $di = New-Object MesRawPrinter+DOCINFOA
  $di.pDocName = "Print Job"
  $di.pDataType = "RAW"
  try {
    if (-not [MesRawPrinter]::StartDocPrinter($hPrinter, 1, $di)) { throw "StartDocPrinter failed" }
    $pUnmanaged = [System.Runtime.InteropServices.Marshal]::AllocHGlobal($bytes.Length)
    try {
      [System.Runtime.InteropServices.Marshal]::Copy($bytes, 0, $pUnmanaged, $bytes.Length)
      $written = 0
      if (-not [MesRawPrinter]::WritePrinter($hPrinter, $pUnmanaged, $bytes.Length, [ref]$written)) {
        throw "WritePrinter failed"
      }
    } finally {
      [System.Runtime.InteropServices.Marshal]::FreeHGlobal($pUnmanaged)
    }
    [MesRawPrinter]::EndDocPrinter($hPrinter) | Out-Null
  } finally {
    [MesRawPrinter]::ClosePrinter($hPrinter) | Out-Null
  }
}
`;

const BARCODE_SCRIPT_ONESHOT_PS1 = `
param(
  [Parameter(Mandatory=$true)][string]$Printer,
  [Parameter(Mandatory=$true)][string]$Path
)
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @"
${RAW_CSHARP}
"@
${BARCODE_SCRIPT_SEND_FN_PS1}
$bytes = [System.IO.File]::ReadAllBytes($Path)
Send-BarcodeScriptRaw $Printer $bytes
`;

/** Persistent worker: Add-Type once (oneshot recompile was freezing PCs / knocking printer offline). */
const BARCODE_SCRIPT_WORKER_PS1 = `
$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::Out.AutoFlush = $true
Add-Type -TypeDefinition @"
${RAW_CSHARP}
"@
${BARCODE_SCRIPT_SEND_FN_PS1}
function Write-JsonLine([string]$json) {
  [Console]::Out.WriteLine($json)
  [Console]::Out.Flush()
}
Write-JsonLine '{"ready":true}'
while ($true) {
  $line = [Console]::In.ReadLine()
  if ($null -eq $line) { break }
  if ($line -eq 'EXIT') { break }
  if ([string]::IsNullOrWhiteSpace($line)) { continue }
  try {
    $job = $line | ConvertFrom-Json
    $printer = [string]$job.printer
    if ($job.data) {
      $bytes = [Convert]::FromBase64String([string]$job.data)
    } else {
      $bytes = [System.IO.File]::ReadAllBytes([string]$job.path)
    }
    Send-BarcodeScriptRaw $printer $bytes
    Write-JsonLine '{"ok":true}'
  } catch {
    $msg = [string]$_.Exception.Message
    $msg = $msg.Replace([char]13, ' ').Replace([char]10, ' ').Replace('\\', '\\\\').Replace('"', '\\"')
    Write-JsonLine ('{"ok":false,"error":"' + $msg + '"}')
  }
}
`;

const IMAGE_WORKER_PS1 = `
$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::Out.AutoFlush = $true
Add-Type -AssemblyName System.Drawing
function Write-JsonLine([string]$json) {
  [Console]::Out.WriteLine($json)
  [Console]::Out.Flush()
}
function Send-MesPngLabel([string]$printer, [string]$path, [int]$wHu, [int]$hHu, [int]$formHHu) {
  $loaded = [System.Drawing.Image]::FromFile($path)
  $bmp = New-Object System.Drawing.Bitmap $loaded
  $loaded.Dispose()
  $bmp.SetResolution(203, 203)
  try {
    $pd = New-Object System.Drawing.Printing.PrintDocument
    $pd.PrinterSettings.PrinterName = $printer
    if (-not $pd.PrinterSettings.IsValid) { throw "Printer is not valid: $printer" }
    $pd.DefaultPageSettings.Margins = New-Object System.Drawing.Printing.Margins(0,0,0,0)
    $pd.DefaultPageSettings.Landscape = $false
    $pd.OriginAtMargins = $true
    # Form height = label + gap (pitch). Label-only height makes TSC drift into gaps after #1.
    if ($formHHu -lt $hHu) { $formHHu = $hHu }
    $paper = New-Object System.Drawing.Printing.PaperSize("MES-label", $wHu, $formHHu)
    $pd.DefaultPageSettings.PaperSize = $paper
    $w = $wHu
    $h = $hHu
    $img = $bmp
    $handler = {
      param($sender, $e)
      $g = $e.Graphics
      $g.PageUnit = [System.Drawing.GraphicsUnit]::Display
      $g.ResetTransform()
      $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
      $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
      $g.Clear([System.Drawing.Color]::White)
      # Artwork (code already centered in PNG) sits in the label band; gap band below stays blank.
      $dest = New-Object System.Drawing.Rectangle(0, 0, $w, $h)
      $g.DrawImage($img, $dest)
      $e.HasMorePages = $false
    }.GetNewClosure()
    $pd.add_PrintPage($handler)
    $pd.Print()
    $pd.Dispose()
  } finally {
    $bmp.Dispose()
  }
}
Write-JsonLine '{"ready":true}'
while ($true) {
  $line = [Console]::In.ReadLine()
  if ($null -eq $line) { break }
  if ($line -eq 'EXIT') { break }
  if ([string]::IsNullOrWhiteSpace($line)) { continue }
  try {
    $job = $line | ConvertFrom-Json
    $printer = [string]$job.printer
    $path = [string]$job.path
    $wHu = [int]$job.wHu
    $hHu = [int]$job.hHu
    $formHHu = [int]$job.formHHu
    if ($wHu -lt 1) { $wHu = 39 }
    if ($hHu -lt 1) { $hHu = 39 }
    if ($formHHu -lt 1) { $formHHu = $hHu + 8 }
    Send-MesPngLabel $printer $path $wHu $hHu $formHHu
    Write-JsonLine '{"ok":true}'
  } catch {
    $msg = [string]$_.Exception.Message
    $msg = $msg.Replace([char]13, ' ').Replace([char]10, ' ').Replace('\\', '\\\\').Replace('"', '\\"')
    Write-JsonLine ('{"ok":false,"error":"' + $msg + '"}')
  }
}
`;

const IMAGE_ONESHOT_PS1 = `
param(
  [Parameter(Mandatory=$true)][string]$Printer,
  [Parameter(Mandatory=$true)][string]$Path,
  [Parameter(Mandatory=$true)][int]$WHu,
  [Parameter(Mandatory=$true)][int]$HHu,
  [Parameter(Mandatory=$true)][int]$FormHHu
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$loaded = [System.Drawing.Image]::FromFile($Path)
$bmp = New-Object System.Drawing.Bitmap $loaded
$loaded.Dispose()
$bmp.SetResolution(203, 203)
try {
  $pd = New-Object System.Drawing.Printing.PrintDocument
  $pd.PrinterSettings.PrinterName = $Printer
  if (-not $pd.PrinterSettings.IsValid) { throw "Printer is not valid: $Printer" }
  $pd.DefaultPageSettings.Margins = New-Object System.Drawing.Printing.Margins(0,0,0,0)
  $pd.DefaultPageSettings.Landscape = $false
  $pd.OriginAtMargins = $true
  if ($FormHHu -lt $HHu) { $FormHHu = $HHu }
  $paper = New-Object System.Drawing.Printing.PaperSize("MES-label", $WHu, $FormHHu)
  $pd.DefaultPageSettings.PaperSize = $paper
  $w = $WHu
  $h = $HHu
  $img = $bmp
  $handler = {
    param($sender, $e)
    $g = $e.Graphics
    $g.PageUnit = [System.Drawing.GraphicsUnit]::Display
    $g.ResetTransform()
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
    $g.Clear([System.Drawing.Color]::White)
    $dest = New-Object System.Drawing.Rectangle(0, 0, $w, $h)
    $g.DrawImage($img, $dest)
    $e.HasMorePages = $false
  }.GetNewClosure()
  $pd.add_PrintPage($handler)
  $pd.Print()
  $pd.Dispose()
} finally {
  $bmp.Dispose()
}
`;

let workerChild = null;
let workerReady = null;
let workerStarting = null;
let workerIsReady = false;
let workerQueue = Promise.resolve();
let pendingJob = null;
let scriptsReady = false;

let imageWorkerChild = null;
let imageWorkerReady = null;
let imageWorkerStarting = null;
let imageWorkerIsReady = false;
let imageWorkerQueue = Promise.resolve();
let imagePendingJob = null;

let barcodeScriptChild = null;
let barcodeScriptReady = null;
let barcodeScriptStarting = null;
let barcodeScriptIsReady = false;
let barcodeScriptQueue = Promise.resolve();
let barcodeScriptPendingJob = null;

function ensureScripts() {
  // Always rewrite — avoids stale scripts after upgrades
  fs.writeFileSync(WORKER_SCRIPT, RAW_WORKER_PS1, 'utf8');
  fs.writeFileSync(ONESHOT_SCRIPT, RAW_ONESHOT_PS1, 'utf8');
  fs.writeFileSync(BARCODE_SCRIPT_ONESHOT, BARCODE_SCRIPT_ONESHOT_PS1, 'utf8');
  fs.writeFileSync(BARCODE_SCRIPT_WORKER, BARCODE_SCRIPT_WORKER_PS1, 'utf8');
  fs.writeFileSync(IMAGE_WORKER_SCRIPT, IMAGE_WORKER_PS1, 'utf8');
  fs.writeFileSync(IMAGE_ONESHOT_SCRIPT, IMAGE_ONESHOT_PS1, 'utf8');
  scriptsReady = true;
}

function isWorkerReady() {
  return Boolean(
    workerIsReady && workerChild && workerChild.stdin && workerChild.stdin.writable,
  );
}

function parseJsonLine(line) {
  const trimmed = String(line || '').trim();
  if (!trimmed.startsWith('{')) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

function killWorker() {
  workerIsReady = false;
  if (pendingJob) {
    pendingJob.reject(new Error('Print worker stopped'));
    pendingJob = null;
  }
  if (workerChild) {
    try {
      workerChild.stdin.write('EXIT\n');
    } catch (_) {
      /* ignore */
    }
    try {
      workerChild.kill();
    } catch (_) {
      /* ignore */
    }
  }
  workerChild = null;
  workerReady = null;
}

function spawnWorker() {
  ensureScripts();
  const child = spawn(
    'powershell.exe',
    ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', WORKER_SCRIPT],
    { windowsHide: true, stdio: ['pipe', 'pipe', 'ignore'] },
  );

  const rl = readline.createInterface({ input: child.stdout });
  let readyResolve;
  let readyReject;
  const readyPromise = new Promise((resolve, reject) => {
    readyResolve = resolve;
    readyReject = reject;
  });

  const readyTimer = setTimeout(() => {
    workerIsReady = false;
    readyReject(new Error('Print worker failed to start (timeout)'));
    try {
      child.kill();
    } catch (_) {
      /* ignore */
    }
  }, READY_TIMEOUT_MS);

  rl.on('line', (line) => {
    const msg = parseJsonLine(line);
    if (!msg) return;
    if (msg.ready) {
      clearTimeout(readyTimer);
      workerIsReady = true;
      readyResolve();
      return;
    }
    if (pendingJob) {
      const job = pendingJob;
      pendingJob = null;
      if (msg.ok) job.resolve();
      else job.reject(new Error(msg.error || 'RAW print failed'));
    }
  });

  child.once('exit', () => {
    clearTimeout(readyTimer);
    workerIsReady = false;
    if (workerChild === child) {
      workerChild = null;
      workerReady = null;
    }
    if (pendingJob) {
      pendingJob.reject(new Error('Print worker exited'));
      pendingJob = null;
    }
  });

  child.once('error', (err) => {
    clearTimeout(readyTimer);
    workerIsReady = false;
    readyReject(err);
  });

  workerChild = child;
  workerReady = readyPromise;
  return readyPromise;
}

function ensureWorker() {
  if (isWorkerReady()) return Promise.resolve();
  if (workerChild && workerReady) return workerReady;
  if (workerStarting) return workerStarting;
  workerStarting = spawnWorker().finally(() => {
    workerStarting = null;
  });
  return workerStarting;
}

function sendWorkerJob(printerName, zplText) {
  return new Promise((resolve, reject) => {
    if (!isWorkerReady()) {
      reject(new Error('Print worker is not running'));
      return;
    }
    if (pendingJob) {
      reject(new Error('Print worker is busy'));
      return;
    }
    const timer = setTimeout(() => {
      if (pendingJob) {
        pendingJob = null;
        reject(new Error('RAW print timed out'));
        killWorker();
      }
    }, JOB_TIMEOUT_MS);
    pendingJob = {
      resolve: () => {
        clearTimeout(timer);
        resolve();
      },
      reject: (err) => {
        clearTimeout(timer);
        reject(err);
      },
    };
    // Inline base64 — no temp file on the hot path
    const data = Buffer.from(String(zplText), 'utf8').toString('base64');
    workerChild.stdin.write(`${JSON.stringify({ printer: printerName, data })}\n`);
  });
}

async function printRawOneShot(printerName, zplText) {
  ensureScripts();
  const filePath = writeTempFile('raw', '.raw', zplText);
  try {
    await execFileAsync(
      'powershell.exe',
      [
        '-NoLogo',
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        ONESHOT_SCRIPT,
        '-Printer',
        printerName,
        '-Path',
        filePath,
      ],
      { windowsHide: true, timeout: ONESHOT_TIMEOUT_MS, maxBuffer: 1024 * 1024 },
    );
  } finally {
    cleanup(filePath);
  }
}

/**
 * Prefer warm worker. Oneshot only if the worker never became ready.
 * Do NOT oneshot after a worker job timeout — OpenPrinter hang would just hang again.
 */
async function printRawPayload(printerName, zplText) {
  let startErr = null;
  try {
    if (!isWorkerReady()) {
      await ensureWorker();
    }
    if (isWorkerReady()) {
      await sendWorkerJob(printerName, zplText);
      return { method: 'worker' };
    }
  } catch (err) {
    startErr = err;
    killWorker();
    // Job was accepted by a live worker but failed/timed out — do not retry oneshot.
    if (/timed out|RAW print failed|Print worker/i.test(String(err && err.message))) {
      throw err;
    }
  }
  try {
    await printRawOneShot(printerName, zplText);
    return { method: 'oneshot' };
  } catch (oneshotErr) {
    throw startErr || oneshotErr;
  }
}

async function printRawZpl(printerName, zpl) {
  if (process.platform !== 'win32') {
    throw new Error('RAW ZPL printing is only supported on Windows');
  }
  const job = workerQueue.then(() => printRawPayload(printerName, zpl));
  workerQueue = job.catch(() => {});
  return job;
}

/**
 * Mode 4: Python-style RAW (no StartPage). Prefer warm worker so Add-Type runs once —
 * spawning PowerShell + compiling C# on every label was freezing PCs and knocking TE210 offline.
 */
async function printBarcodeScriptRaw(printerName, payloadText) {
  if (process.platform !== 'win32') {
    throw new Error('Barcode-script RAW printing is only supported on Windows');
  }
  ensureScripts();

  const run = async () => {
    if (isBarcodeScriptWorkerReady()) {
      try {
        await sendBarcodeScriptWorkerJob(printerName, payloadText);
        return { method: 'barcode-script-worker' };
      } catch (err) {
        killBarcodeScriptWorker();
        if (/timed out/i.test(String(err && err.message))) {
          throw err;
        }
      }
    }
    await printBarcodeScriptOneShot(printerName, payloadText);
    return { method: 'barcode-script-oneshot' };
  };

  const job = barcodeScriptQueue.then(run);
  barcodeScriptQueue = job.catch(() => {});
  return job;
}

async function printBarcodeScriptOneShot(printerName, payloadText) {
  const filePath = writeTempFile('prn', '.prn', payloadText);
  try {
    await execFileAsync(
      'powershell.exe',
      [
        '-NoLogo',
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        BARCODE_SCRIPT_ONESHOT,
        '-Printer',
        printerName,
        '-Path',
        filePath,
      ],
      { windowsHide: true, timeout: BARCODE_SCRIPT_TIMEOUT_MS, maxBuffer: 1024 * 1024 },
    );
  } finally {
    cleanup(filePath);
  }
}

function isBarcodeScriptWorkerReady() {
  return Boolean(
    barcodeScriptIsReady &&
      barcodeScriptChild &&
      barcodeScriptChild.stdin &&
      barcodeScriptChild.stdin.writable,
  );
}

function killBarcodeScriptWorker() {
  barcodeScriptIsReady = false;
  if (barcodeScriptPendingJob) {
    barcodeScriptPendingJob.reject(new Error('Barcode-script worker stopped'));
    barcodeScriptPendingJob = null;
  }
  if (barcodeScriptChild) {
    try {
      barcodeScriptChild.stdin.write('EXIT\n');
    } catch (_) {
      /* ignore */
    }
    try {
      barcodeScriptChild.kill();
    } catch (_) {
      /* ignore */
    }
  }
  barcodeScriptChild = null;
  barcodeScriptReady = null;
}

function spawnBarcodeScriptWorker() {
  ensureScripts();
  const child = spawn(
    'powershell.exe',
    [
      '-NoLogo',
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      BARCODE_SCRIPT_WORKER,
    ],
    { windowsHide: true, stdio: ['pipe', 'pipe', 'ignore'] },
  );

  const rl = readline.createInterface({ input: child.stdout });
  let readyResolve;
  let readyReject;
  const readyPromise = new Promise((resolve, reject) => {
    readyResolve = resolve;
    readyReject = reject;
  });

  const readyTimer = setTimeout(() => {
    barcodeScriptIsReady = false;
    readyReject(new Error('Barcode-script worker failed to start (timeout)'));
    try {
      child.kill();
    } catch (_) {
      /* ignore */
    }
  }, READY_TIMEOUT_MS);

  rl.on('line', (line) => {
    const msg = parseJsonLine(line);
    if (!msg) return;
    if (msg.ready) {
      clearTimeout(readyTimer);
      barcodeScriptIsReady = true;
      readyResolve();
      return;
    }
    if (barcodeScriptPendingJob) {
      const job = barcodeScriptPendingJob;
      barcodeScriptPendingJob = null;
      if (msg.ok) job.resolve();
      else job.reject(new Error(msg.error || 'Barcode-script print failed'));
    }
  });

  child.once('exit', () => {
    clearTimeout(readyTimer);
    barcodeScriptIsReady = false;
    if (barcodeScriptChild === child) {
      barcodeScriptChild = null;
      barcodeScriptReady = null;
    }
    if (barcodeScriptPendingJob) {
      barcodeScriptPendingJob.reject(new Error('Barcode-script worker exited'));
      barcodeScriptPendingJob = null;
    }
  });

  child.once('error', (err) => {
    clearTimeout(readyTimer);
    barcodeScriptIsReady = false;
    readyReject(err);
  });

  barcodeScriptChild = child;
  barcodeScriptReady = readyPromise;
  return readyPromise;
}

function ensureBarcodeScriptWorker() {
  if (isBarcodeScriptWorkerReady()) return Promise.resolve();
  if (barcodeScriptChild && barcodeScriptReady) return barcodeScriptReady;
  if (barcodeScriptStarting) return barcodeScriptStarting;
  barcodeScriptStarting = spawnBarcodeScriptWorker().finally(() => {
    barcodeScriptStarting = null;
  });
  return barcodeScriptStarting;
}

function sendBarcodeScriptWorkerJob(printerName, payloadText) {
  return new Promise((resolve, reject) => {
    if (!isBarcodeScriptWorkerReady()) {
      reject(new Error('Barcode-script worker is not running'));
      return;
    }
    if (barcodeScriptPendingJob) {
      reject(new Error('Barcode-script worker is busy'));
      return;
    }
    const timer = setTimeout(() => {
      if (barcodeScriptPendingJob) {
        barcodeScriptPendingJob = null;
        reject(new Error('Barcode-script print timed out'));
        killBarcodeScriptWorker();
      }
    }, BARCODE_SCRIPT_JOB_TIMEOUT_MS);
    barcodeScriptPendingJob = {
      resolve: () => {
        clearTimeout(timer);
        resolve();
      },
      reject: (err) => {
        clearTimeout(timer);
        reject(err);
      },
    };
    const data = Buffer.from(String(payloadText), 'utf8').toString('base64');
    barcodeScriptChild.stdin.write(`${JSON.stringify({ printer: printerName, data })}\n`);
  });
}

/**
 * @param {{ printMode?: string }} [settings]
 */
function warmupRawPrintWorker(settings = {}) {
  if (process.platform !== 'win32') return Promise.resolve();
  ensureScripts();
  const mode = String(settings.printMode || '').toLowerCase();
  if (mode === 'image' || mode === 'image-only' || mode === '2') {
    return ensureImageWorker().catch(() => {});
  }
  if (mode === 'tspl' || mode === 'tsc' || mode === '3') {
    return ensureWorker().catch(() => {});
  }
  // Default: warm barcode-script RAW worker (fastest direct Win32 RAW)
  return ensureBarcodeScriptWorker().catch(() => {});
}

function shutdownRawPrintWorker() {
  killWorker();
  killImageWorker();
  killBarcodeScriptWorker();
}

function isImageWorkerReady() {
  return Boolean(
    imageWorkerIsReady &&
      imageWorkerChild &&
      imageWorkerChild.stdin &&
      imageWorkerChild.stdin.writable,
  );
}

function killImageWorker() {
  imageWorkerIsReady = false;
  if (imagePendingJob) {
    imagePendingJob.reject(new Error('Image print worker stopped'));
    imagePendingJob = null;
  }
  if (imageWorkerChild) {
    try {
      imageWorkerChild.stdin.write('EXIT\n');
    } catch (_) {
      /* ignore */
    }
    try {
      imageWorkerChild.kill();
    } catch (_) {
      /* ignore */
    }
  }
  imageWorkerChild = null;
  imageWorkerReady = null;
}

function spawnImageWorker() {
  ensureScripts();
  const child = spawn(
    'powershell.exe',
    [
      '-NoLogo',
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      IMAGE_WORKER_SCRIPT,
    ],
    { windowsHide: true, stdio: ['pipe', 'pipe', 'ignore'] },
  );

  const rl = readline.createInterface({ input: child.stdout });
  let readyResolve;
  let readyReject;
  const readyPromise = new Promise((resolve, reject) => {
    readyResolve = resolve;
    readyReject = reject;
  });

  const readyTimer = setTimeout(() => {
    imageWorkerIsReady = false;
    readyReject(new Error('Image print worker failed to start (timeout)'));
    try {
      child.kill();
    } catch (_) {
      /* ignore */
    }
  }, IMAGE_READY_TIMEOUT_MS);

  rl.on('line', (line) => {
    const msg = parseJsonLine(line);
    if (!msg) return;
    if (msg.ready) {
      clearTimeout(readyTimer);
      imageWorkerIsReady = true;
      readyResolve();
      return;
    }
    if (imagePendingJob) {
      const job = imagePendingJob;
      imagePendingJob = null;
      if (msg.ok) job.resolve();
      else job.reject(new Error(msg.error || 'Image print failed'));
    }
  });

  child.once('exit', () => {
    clearTimeout(readyTimer);
    imageWorkerIsReady = false;
    if (imageWorkerChild === child) {
      imageWorkerChild = null;
      imageWorkerReady = null;
    }
    if (imagePendingJob) {
      imagePendingJob.reject(new Error('Image print worker exited'));
      imagePendingJob = null;
    }
  });

  child.once('error', (err) => {
    clearTimeout(readyTimer);
    imageWorkerIsReady = false;
    readyReject(err);
  });

  imageWorkerChild = child;
  imageWorkerReady = readyPromise;
  return readyPromise;
}

function ensureImageWorker() {
  if (isImageWorkerReady()) return Promise.resolve();
  if (imageWorkerChild && imageWorkerReady) return imageWorkerReady;
  if (imageWorkerStarting) return imageWorkerStarting;
  imageWorkerStarting = spawnImageWorker().finally(() => {
    imageWorkerStarting = null;
  });
  return imageWorkerStarting;
}

function sendImageWorkerJob(printerName, filePath, wHu, hHu, formHHu) {
  return new Promise((resolve, reject) => {
    if (!isImageWorkerReady()) {
      reject(new Error('Image print worker is not running'));
      return;
    }
    if (imagePendingJob) {
      reject(new Error('Image print worker is busy'));
      return;
    }
    const timer = setTimeout(() => {
      if (imagePendingJob) {
        imagePendingJob = null;
        reject(new Error('Image print timed out'));
        killImageWorker();
      }
    }, IMAGE_JOB_TIMEOUT_MS);
    imagePendingJob = {
      resolve: () => {
        clearTimeout(timer);
        resolve();
      },
      reject: (err) => {
        clearTimeout(timer);
        reject(err);
      },
    };
    imageWorkerChild.stdin.write(
      `${JSON.stringify({ printer: printerName, path: filePath, wHu, hHu, formHHu })}\n`,
    );
  });
}

async function printPngImageOneShot(printerName, filePath, wHu, hHu, formHHu) {
  ensureScripts();
  await execFileAsync(
    'powershell.exe',
    [
      '-NoLogo',
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      IMAGE_ONESHOT_SCRIPT,
      '-Printer',
      printerName,
      '-Path',
      filePath,
      '-WHu',
      String(wHu),
      '-HHu',
      String(hHu),
      '-FormHHu',
      String(formHHu),
    ],
    { windowsHide: true, timeout: IMAGE_TIMEOUT_MS, maxBuffer: 2 * 1024 * 1024 },
  );
}

/**
 * TSC image print:
 * - Form pitch = label height + gap so feed stays registered on every label.
 * - Warm worker if ready; else oneshot. Never await worker startup on request path.
 */
async function printPngImage(printerName, pngBuffer) {
  if (process.platform !== 'win32') {
    throw new Error('Image printing is only supported on Windows');
  }
  const { LABEL_WIDTH_HU, LABEL_HEIGHT_HU, FORM_HEIGHT_HU } = require('./labelLayout');
  const wHu = LABEL_WIDTH_HU;
  const hHu = LABEL_HEIGHT_HU;
  const formHHu = FORM_HEIGHT_HU;
  ensureScripts();
  const filePath = writeTempFile('png', '.png', pngBuffer);

  const run = async () => {
    if (isImageWorkerReady()) {
      try {
        await sendImageWorkerJob(printerName, filePath, wHu, hHu, formHHu);
        return { method: 'image-worker' };
      } catch (err) {
        killImageWorker();
        if (/timed out/i.test(String(err && err.message))) {
          throw err;
        }
      }
    }

    await printPngImageOneShot(printerName, filePath, wHu, hHu, formHHu);
    return { method: 'image-oneshot' };
  };

  try {
    const job = imageWorkerQueue.then(run);
    imageWorkerQueue = job.catch(() => {});
    return await job;
  } finally {
    cleanup(filePath);
  }
}

module.exports = {
  printRawZpl,
  printBarcodeScriptRaw,
  printPngImage,
  writeTempFile,
  warmupRawPrintWorker,
  shutdownRawPrintWorker,
  isWorkerReady,
  isImageWorkerReady,
  isBarcodeScriptWorkerReady,
  ensureWorker,
  ensureImageWorker,
  ensureBarcodeScriptWorker,
};
