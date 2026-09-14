!macro customInit
  StrCpy $INSTDIR "$PROGRAMFILES64\NunzioTech\Koradest"
!macroend

!macro customInstall
  ExecWait 'netsh advfirewall firewall delete rule group="Koradest"'
  ExecWait 'netsh advfirewall firewall delete rule name="Koradest"'
  ExecWait 'netsh advfirewall firewall delete rule name=all program="$INSTDIR\Koradest.exe"'

  ExecWait 'netsh advfirewall firewall add rule name="Koradest App (In)" group="Koradest" dir=in action=allow program="$INSTDIR\Koradest.exe" profile=any edge=yes enable=yes'
  ExecWait 'netsh advfirewall firewall add rule name="Koradest App (Out)" group="Koradest" dir=out action=allow program="$INSTDIR\Koradest.exe" profile=any enable=yes'

  ExecWait 'netsh advfirewall firewall add rule name="Koradest Sync (TCP-In)" group="Koradest" dir=in action=allow protocol=TCP localport=34567,34568,34569,34570,34571,45891,7345 profile=any edge=yes enable=yes'
  ExecWait 'netsh advfirewall firewall add rule name="Koradest Discovery (UDP-In)" group="Koradest" dir=in action=allow protocol=UDP localport=34568,5353,7346 profile=any edge=yes enable=yes'

  ExecWait 'netsh advfirewall firewall add rule name="Koradest Sync (TCP-Out)" group="Koradest" dir=out action=allow protocol=TCP localport=34567,34568,34569,34570,34571,45891,7345 profile=any enable=yes'
  ExecWait 'netsh advfirewall firewall add rule name="Koradest Discovery (UDP-Out)" group="Koradest" dir=out action=allow protocol=UDP localport=34568,5353,7346 profile=any enable=yes'

  CreateDirectory "$INSTDIR\updates"
  CopyFiles /SILENT "$EXEPATH" "$INSTDIR\updates\$EXEFILE"
!macroend

!macro customUnInstall
  ExecWait 'netsh advfirewall firewall delete rule group="Koradest"'
  ExecWait 'netsh advfirewall firewall delete rule name="Koradest"'
  ExecWait 'netsh advfirewall firewall delete rule name=all program="$INSTDIR\Koradest.exe"'

  IfSilent skip_data
  MessageBox MB_ICONQUESTION|MB_YESNO|MB_DEFBUTTON2 "Vuoi rimuovere completamente anche tutti i dati dell'applicazione (database, impostazioni, backup e documenti) salvati sul PC?$\r$\n$\r$\nATTENZIONE: Questa azione eliminerà definitivamente il database locale e i backup di KORADEST!" /SD IDNO IDNO skip_data
    RMDir /r "$APPDATA\Koradest"
    RMDir /r "$DOCUMENTS\NunzioTech\Koradest"
    RMDir /r "$LOCALAPPDATA\koradest-updater"
  skip_data:
!macroend
