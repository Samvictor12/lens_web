Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)

Dim fso
Set fso = CreateObject("Scripting.FileSystemObject")

If fso.FileExists("MES-Printer.exe") Then
    WshShell.Run "MES-Printer.exe", 0, False
ElseIf fso.FileExists("dist\MES-Printer.exe") Then
    WshShell.Run "dist\MES-Printer.exe", 0, False
Else
    WshShell.Run "cmd /c npm start", 0, False
End If
