const { execFile } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const os = require('os');
const fs = require('fs');

const execFileAsync = promisify(execFile);

// ── C# P/Invoke helper for WinSpool RAW printing ──────────────────────────────
const RAW_CSHARP = `
using System;
using System.Runtime.InteropServices;
public class LensRawPrinter {
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

function decodeStatus(status) {
  if (!status || status === 0) return 'Ready';
  const statuses = [];
  if (status & 0x00000001) statuses.push('Paused');
  if (status & 0x00000002) statuses.push('Error');
  if (status & 0x00000004) statuses.push('Pending Deletion');
  if (status & 0x00000008) statuses.push('Paper Jam');
  if (status & 0x00000010) statuses.push('Paper Out');
  if (status & 0x00000020) statuses.push('Paper Problem');
  if (status & 0x00000040) statuses.push('Out of Memory');
  if (status & 0x00000080) statuses.push('Offline');
  if (status & 0x00000100) statuses.push('IO Active');
  if (status & 0x00000200) statuses.push('Busy');
  if (status & 0x00000400) statuses.push('Printing');
  if (status & 0x00000800) statuses.push('Output Bin Full');
  if (status & 0x00001000) statuses.push('Not Available');
  if (status & 0x00002000) statuses.push('Waiting');
  if (status & 0x00004000) statuses.push('Processing');
  if (status & 0x00008000) statuses.push('Initializing');
  if (status & 0x00010000) statuses.push('Warming Up');
  if (status & 0x00020000) statuses.push('Toner Low');
  if (status & 0x00040000) statuses.push('No Toner');
  if (status & 0x00080000) statuses.push('Page Punt');
  if (status & 0x00100000) statuses.push('User Intervention Required');
  if (status & 0x00200000) statuses.push('Out of Paper');
  if (status & 0x00400000) statuses.push('Door Open');
  return statuses.length > 0 ? statuses.join(', ') : `Status (${status})`;
}

/**
 * Enumerate all local and networked Windows printers with live status.
 */
async function listPrinters() {
  const psScript = `
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
try {
  $printers = Get-CimInstance Win32_Printer | Select-Object Name, PrinterStatus, WorkOffline, ExtendedPrinterStatus, DetectedErrorState
  $result = @()
  foreach ($p in $printers) {
    $statusCode = 0
    if ($p.WorkOffline) { $statusCode = $statusCode -bor 0x00000080 }
    if ($p.ExtendedPrinterStatus -eq 1) { $statusCode = 0 } # Other
    elseif ($p.ExtendedPrinterStatus -eq 2) { $statusCode = 0 } # Unknown
    elseif ($p.ExtendedPrinterStatus -eq 3) { $statusCode = 0 } # Idle / Ready
    elseif ($p.ExtendedPrinterStatus -eq 4) { $statusCode = $statusCode -bor 0x00000400 } # Printing
    elseif ($p.ExtendedPrinterStatus -eq 5) { $statusCode = $statusCode -bor 0x00000100 } # Warmup
    elseif ($p.ExtendedPrinterStatus -eq 7) { $statusCode = $statusCode -bor 0x00000080 } # Offline
    elseif ($p.ExtendedPrinterStatus -eq 8) { $statusCode = $statusCode -bor 0x00000001 } # Paused
    elseif ($p.ExtendedPrinterStatus -eq 9) { $statusCode = $statusCode -bor 0x00000002 } # Error
    elseif ($p.ExtendedPrinterStatus -eq 10) { $statusCode = $statusCode -bor 0x00000100 } # Busy
    elseif ($p.ExtendedPrinterStatus -eq 11) { $statusCode = $statusCode -bor 0x00100000 } # Intervention
    elseif ($p.ExtendedPrinterStatus -eq 12) { $statusCode = $statusCode -bor 0x00000010 } # Paper Out
    elseif ($p.ExtendedPrinterStatus -eq 13) { $statusCode = $statusCode -bor 0x00000008 } # Paper Jam
    elseif ($p.ExtendedPrinterStatus -eq 14) { $statusCode = $statusCode -bor 0x00400000 } # Door Open
    $result += [PSCustomObject]@{
      name = $p.Name
      status_code = $statusCode
      work_offline = [bool]$p.WorkOffline
    }
  }
  $result | ConvertTo-Json -Compress
} catch {
  Write-Output "[]"
}
`;

  try {
    const { stdout } = await execFileAsync('powershell', ['-NoProfile', '-NonInteractive', '-Command', psScript], { timeout: 8000 });
    const parsed = JSON.parse(stdout.trim() || '[]');
    const list = Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
    const details = list.map((item) => ({
      name: item.name,
      status_code: item.status_code || 0,
      status: decodeStatus(item.status_code),
    }));
    const printers = details.map((d) => d.name);
    return { printers, details };
  } catch (err) {
    return { printers: [], details: [] };
  }
}

/**
 * Validates if the target printer is available and online.
 */
async function checkPrinterStatus(printerName) {
  if (!printerName) {
    throw new Error('Printer name is required.');
  }
  const { details } = await listPrinters();
  const match = details.find((p) => p.name.toLowerCase() === printerName.toLowerCase());
  if (!match) {
    throw new Error(`Printer "${printerName}" not found on this machine. Please check Windows Printers.`);
  }
  if (match.status_code & 0x00000080) {
    throw new Error(`Printer "${printerName}" is Offline. Please check the cable / power.`);
  }
  if (match.status_code & 0x00000010 || match.status_code & 0x00200000) {
    throw new Error(`Printer "${printerName}" is Out of Paper / Labels.`);
  }
  if (match.status_code & 0x00000008) {
    throw new Error(`Printer "${printerName}" has a Paper Jam.`);
  }
  if (match.status_code & 0x00400000) {
    throw new Error(`Printer "${printerName}" Door / Cover is Open.`);
  }
  if (match.status_code & 0x00000002) {
    throw new Error(`Printer "${printerName}" is in an Error state.`);
  }
  return match;
}

/**
 * Send RAW bytes directly to printer via WinSpool (TSPL / ZPL).
 */
async function sendRawBytes(printerName, rawData, docName = 'Lens-Print-Job') {
  await checkPrinterStatus(printerName);

  const rawBytes = Buffer.isBuffer(rawData) ? rawData : Buffer.from(String(rawData), 'utf8');
  const tempRawPath = path.join(os.tmpdir(), `lens-raw-${Date.now()}-${Math.random().toString(36).slice(2)}.bin`);
  fs.writeFileSync(tempRawPath, rawBytes);

  const psScript = `
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @"
${RAW_CSHARP}
"@

function Send-RawFile([string]$printer, [string]$filePath, [string]$docTitle) {
  $bytes = [System.IO.File]::ReadAllBytes($filePath)
  $hPrinter = [IntPtr]::Zero
  if (-not [LensRawPrinter]::OpenPrinter($printer, [ref]$hPrinter, [IntPtr]::Zero)) {
    throw "Failed to open printer: $printer"
  }
  $di = New-Object LensRawPrinter+DOCINFOA
  $di.pDocName = $docTitle
  $di.pDataType = "RAW"
  try {
    if (-not [LensRawPrinter]::StartDocPrinter($hPrinter, 1, $di)) { throw "StartDocPrinter failed" }
    if (-not [LensRawPrinter]::StartPagePrinter($hPrinter)) { throw "StartPagePrinter failed" }
    $pUnmanaged = [System.Runtime.InteropServices.Marshal]::AllocHGlobal($bytes.Length)
    try {
      [System.Runtime.InteropServices.Marshal]::Copy($bytes, 0, $pUnmanaged, $bytes.Length)
      $written = 0
      if (-not [LensRawPrinter]::WritePrinter($hPrinter, $pUnmanaged, $bytes.Length, [ref]$written)) {
        throw "WritePrinter failed to send data to spooler"
      }
    } finally {
      [System.Runtime.InteropServices.Marshal]::FreeHGlobal($pUnmanaged)
    }
    [LensRawPrinter]::EndPagePrinter($hPrinter) | Out-Null
    [LensRawPrinter]::EndDocPrinter($hPrinter) | Out-Null
  } finally {
    [LensRawPrinter]::ClosePrinter($hPrinter) | Out-Null
  }
}

Send-RawFile "${printerName.replace(/"/g, '`"')}" "${tempRawPath.replace(/"/g, '`"')}" "${docName.replace(/"/g, '`"')}"
`;

  try {
    await execFileAsync('powershell', ['-NoProfile', '-NonInteractive', '-Command', psScript], { timeout: 10000 });
  } catch (err) {
    const msg = err.stderr || err.stdout || err.message;
    throw new Error(`Printer Spooler Error: ${msg.trim()}`);
  } finally {
    try { fs.unlinkSync(tempRawPath); } catch (_) {}
  }
}

/**
 * Render and print document via Windows GDI (System.Drawing).
 * Supports exact card layouts, meta fields, tables, borders, and QR code.
 */
async function printGdiDocument(printerName, jobData, docName = 'Lens-GDI-Doc') {
  await checkPrinterStatus(printerName);

  const jobJsonPath = path.join(os.tmpdir(), `lens-gdi-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  fs.writeFileSync(jobJsonPath, JSON.stringify(jobData), 'utf8');

  const psScript = `
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

function Draw-LensDocument([string]$printer, [string]$jsonPath, [string]$docTitle) {
  $raw = [System.IO.File]::ReadAllText($jsonPath)
  $job = $raw | ConvertFrom-Json

  $wMm = [double]$job.widthMm
  $hMm = [double]$job.heightMm
  if ($wMm -lt 10) { $wMm = 84 }
  if ($hMm -lt 10) { $hMm = 55 }

  # Convert mm to 1/100 inch (hundredths of an inch for PaperSize)
  $wHu = [int][Math]::Round($wMm * 100.0 / 25.4)
  $hHu = [int][Math]::Round($hMm * 100.0 / 25.4)

  $pd = New-Object System.Drawing.Printing.PrintDocument
  $pd.PrinterSettings.PrinterName = $printer
  if (-not $pd.PrinterSettings.IsValid) { throw "Printer is not valid or offline: $printer" }

  $pd.DocumentName = $docTitle
  $pd.DefaultPageSettings.Margins = New-Object System.Drawing.Printing.Margins(0, 0, 0, 0)
  $pd.DefaultPageSettings.Landscape = $false
  $pd.OriginAtMargins = $true
  $pd.DefaultPageSettings.PaperSize = New-Object System.Drawing.Printing.PaperSize("CustomSize", $wHu, $hHu)

  $handler = {
    param($sender, $e)
    $g = $e.Graphics
    $g.PageUnit = [System.Drawing.GraphicsUnit]::Millimeter
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $g.Clear([System.Drawing.Color]::White)

    $fontBold = New-Object System.Drawing.Font("Arial", 2.7, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Millimeter)
    $fontRegular = New-Object System.Drawing.Font("Arial", 2.3, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Millimeter)
    $fontSmall = New-Object System.Drawing.Font("Arial", 2.1, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Millimeter)
    $fontTableH = New-Object System.Drawing.Font("Arial", 2.2, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Millimeter)
    $fontTableR = New-Object System.Drawing.Font("Arial", 2.2, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Millimeter)

    $brushBlack = [System.Drawing.Brushes]::Black
    $penBorder = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(40, 40, 40), 0.25)
    $brushHeaderBg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(245, 245, 245))

    $topGap = [double]$job.topGapMm
    $marginL = 2.2
    $marginR = $wMm - 2.2
    $y = $topGap + 1.2
    $lineH = 3.4

    # QR Code (Top Right)
    $qrSize = 13.5
    $qrX = $marginR - $qrSize
    $qrY = $topGap + 1.2
    if ($job.qrPath -and (Test-Path $job.qrPath)) {
      $qrImg = [System.Drawing.Image]::FromFile($job.qrPath)
      $g.DrawImage($qrImg, [float]$qrX, [float]$qrY, [float]$qrSize, [float]$qrSize)
      $qrImg.Dispose()
    }

    # Meta text lines
    $maxTextW = $qrX - $marginL - 1.5
    $rect = New-Object System.Drawing.RectangleF([float]$marginL, [float]$y, [float]$maxTextW, [float]$lineH)
    $g.DrawString($job.lensLine, $fontBold, $brushBlack, $rect)
    $y += $lineH

    $rect = New-Object System.Drawing.RectangleF([float]$marginL, [float]$y, [float]$maxTextW, [float]$lineH)
    $g.DrawString("Coating: " + $job.coating, $fontRegular, $brushBlack, $rect)
    $y += $lineH

    $rect = New-Object System.Drawing.RectangleF([float]$marginL, [float]$y, [float]$maxTextW, [float]$lineH)
    $g.DrawString("Category: " + $job.category, $fontRegular, $brushBlack, $rect)
    $y += $lineH

    $rect = New-Object System.Drawing.RectangleF([float]$marginL, [float]$y, [float]$maxTextW, [float]$lineH)
    $g.DrawString("Customer name: " + $job.customerName, $fontRegular, $brushBlack, $rect)
    $y += $lineH

    if ($job.ptName) {
      $rect = New-Object System.Drawing.RectangleF([float]$marginL, [float]$y, [float]$maxTextW, [float]$lineH)
      $g.DrawString("Pt. Name: " + $job.ptName, $fontRegular, $brushBlack, $rect)
      $y += $lineH
    }

    # Rx Table
    $tableTop = [Math]::Max($y + 1.0, $topGap + 18.0)
    $footerH = 4.5
    $footerY = $hMm - $footerH
    $tableW = $wMm - (2.0 * $marginL)
    $rows = @($job.tableRows)
    $rowCount = [Math]::Max(1, $rows.Count)
    $rowH = [Math]::Max(3.8, ($footerY - $tableTop) / $rowCount)

    $colCount = [Math]::Max(1, $rows[0].Count)
    $colW = $tableW / $colCount

    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center

    for ($ri = 0; $ri -lt $rows.Count; $ri++) {
      $currY = $tableTop + ($ri * $rowH)
      $currFont = if ($ri -eq 0) { $fontTableH } else { $fontTableR }
      for ($ci = 0; $ci -lt $rows[$ri].Count; $ci++) {
        $currX = $marginL + ($ci * $colW)
        $cellRect = New-Object System.Drawing.RectangleF([float]$currX, [float]$currY, [float]$colW, [float]$rowH)
        if ($ri -eq 0) {
          $g.FillRectangle($brushHeaderBg, $cellRect)
        }
        $g.DrawRectangle($penBorder, $currX, $currY, $colW, $rowH)
        $cellVal = [string]$rows[$ri][$ci]
        $g.DrawString($cellVal, $currFont, $brushBlack, $cellRect, $sf)
      }
    }

    # Footer
    $footY = $hMm - 4.0
    $g.DrawString("cust Ref: " + $job.custRef, $fontSmall, $brushBlack, [float]$marginL, [float]$footY)
    $dateStr = "Date: " + $job.orderDate
    $dateSize = $g.MeasureString($dateStr, $fontSmall)
    $g.DrawString($dateStr, $fontSmall, $brushBlack, [float]($marginR - $dateSize.Width), [float]$footY)

    $e.HasMorePages = $false
  }.GetNewClosure()

  $pd.add_PrintPage($handler)
  $pd.Print()
  $pd.Dispose()
}

Draw-LensDocument "${printerName.replace(/"/g, '`"')}" "${jobJsonPath.replace(/"/g, '`"')}" "${docName.replace(/"/g, '`"')}"
`;

  try {
    await execFileAsync('powershell', ['-NoProfile', '-NonInteractive', '-Command', psScript], { timeout: 15000 });
  } catch (err) {
    const msg = err.stderr || err.stdout || err.message;
    throw new Error(`GDI Print Error: ${msg.trim()}`);
  } finally {
    try { fs.unlinkSync(jobJsonPath); } catch (_) {}
  }
}

module.exports = {
  listPrinters,
  checkPrinterStatus,
  sendRawBytes,
  printGdiDocument,
};
