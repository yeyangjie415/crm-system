; CRM System v1.1 — Inno Setup Installer (all-in-one, no network needed)
; 编译前请确保已安装全部 node_modules：
;   cd crm-backend && npm install && npx prisma generate
;   cd crm-frontend && npm install
;   npm install          (root: concurrently)
; 编译: "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" installer/crm-installer.iss

#define MyAppName "CRM System"
#define MyAppVersion "1.1.0"
#define MyAppPublisher "CRM Team"
#define MyAppURL "http://localhost:5173"
#define MyAppExeName "start.bat"

[Setup]
AppId={{B8A3C4D5-E6F7-8901-2345-6789ABCDEF01}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={localappdata}\{#MyAppName}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
OutputDir=.
OutputBaseFilename=CRM-System-Setup-v{#MyAppVersion}
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
DisableDirPage=no
UninstallDisplayIcon={app}\crm-frontend\public\favicon.svg
UsePreviousAppDir=yes
UsePreviousGroup=yes
CloseApplications=yes

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "创建桌面快捷方式"; GroupDescription: "快捷方式："; Flags: checkedonce
Name: "startupicon"; Description: "开机自动启动 CRM 服务"; GroupDescription: "开机自启："; Flags: checkedonce

[Dirs]
Name: "{app}\crm-backend\prisma\backups"

[Files]
; Root
Source: "..\start.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\start-backend.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\start-frontend.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\package.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\package-lock.json"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
Source: "..\node_modules\*"; DestDir: "{app}\node_modules"; Flags: ignoreversion recursesubdirs createallsubdirs skipifsourcedoesntexist

; Backend — includes pre-installed node_modules + pre-generated Prisma client
Source: "..\crm-backend\*"; DestDir: "{app}\crm-backend"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "dist,prisma\*.db,prisma\backups,.version"

; Frontend — includes pre-installed node_modules
Source: "..\crm-frontend\*"; DestDir: "{app}\crm-frontend"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "dist"

[Icons]
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; Tasks: desktopicon; Comment: "启动 CRM System"
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; Comment: "启动 CRM System"
Name: "{autoprograms}\卸载 CRM System"; Filename: "{uninstallexe}"; WorkingDir: "{app}"
Name: "{userstartup}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; Tasks: startupicon

[Run]
; Initialize database (prisma client is already pre-generated in node_modules)
Filename: "{cmd}"; Parameters: "/c cd /d ""{app}\crm-backend"" && npx prisma migrate deploy"; StatusMsg: "正在初始化数据库..."; Flags: runhidden waituntilterminated
; Seed default data
Filename: "{cmd}"; Parameters: "/c cd /d ""{app}\crm-backend"" && npx tsx src/seed.ts"; StatusMsg: "正在导入初始数据..."; Flags: runhidden waituntilterminated
; Create version file
Filename: "{cmd}"; Parameters: "/c for /f ""tokens=2 delims=:,"" %%v in ('type ""{app}\crm-backend\package.json"" ^| findstr ""version""') do @echo %%~v>""{app}\crm-backend\.version"""; Flags: runhidden

[Code]

function IsUpgrade: Boolean;
begin
  Result := FileExists(ExpandConstant('{app}\crm-backend\.version'));
end;

function IsDbExists: Boolean;
begin
  Result := FileExists(ExpandConstant('{app}\crm-backend\prisma\crm.db'));
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
  begin
    if IsUpgrade and IsDbExists then
    begin
      Log('Upgrade detected, preserving existing database');
    end;
  end;
end;

function InitializeUninstall: Boolean;
var
  MsgResult: Integer;
  ResultCode: Integer;
begin
  if IsDbExists then
  begin
    MsgResult := MsgBox('检测到已有数据库文件。' + #13#10 +
      '是否在卸载前备份数据库？' + #13#10#13#10 +
      '选择「是」→ 备份到桌面' + #13#10 +
      '选择「否」→ 直接删除' + #13#10 +
      '选择「取消」→ 取消卸载',
      mbConfirmation, MB_YESNOCANCEL);

    if MsgResult = IDYES then
    begin
      if Exec('cmd.exe', '/c copy /Y "' + ExpandConstant('{app}\crm-backend\prisma\crm.db') + '" "' + ExpandConstant('{desktop}') + '\crm-backup-uninstall.db"',
        '', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
      begin
        MsgBox('数据库已备份到桌面。', mbInformation, MB_OK);
      end;
      Result := True;
    end
    else if MsgResult = IDNO then
    begin
      Result := True;
    end
    else
    begin
      Result := False;
    end;
  end
  else
  begin
    Result := True;
  end;
end;
