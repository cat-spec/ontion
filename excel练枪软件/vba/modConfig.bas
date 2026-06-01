Attribute VB_Name = "modConfig"
Option Explicit

Public Sub LoadConfig()
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Worksheets(SHEET_CONFIG)

    GameDurationSeconds = CLng(ws.Range("B2").Value)
    HitScore = CLng(ws.Range("B3").Value)
    WrongPartPenalty = CLng(ws.Range("B4").Value)
    BlankPenalty = CLng(ws.Range("B5").Value)
    ComboThreshold = CLng(ws.Range("B6").Value)
    ComboBonus = CLng(ws.Range("B7").Value)
End Sub
