Attribute VB_Name = "modRenderer"
Option Explicit

Public Sub PrepareGameSheet()
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Worksheets(SHEET_GAME)

    ws.Range(RANGE_ARENA).ClearContents
    ws.Range(RANGE_ARENA).Interior.Color = RGB(249, 250, 251)
    ws.Range(RANGE_ARENA).Font.Color = RGB(17, 24, 39)
    ws.Range("C2,F2,I2,L2,O2,C3,F3,I3,L3").Value = "-"
    ws.Range("L3").Value = "等待开始"
End Sub

Public Sub ClearArena()
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Worksheets(SHEET_GAME)
    ws.Range(RANGE_ARENA).ClearContents
    ws.Range(RANGE_ARENA).Interior.Color = RGB(249, 250, 251)
    ws.Range(RANGE_ARENA).Font.Color = RGB(17, 24, 39)
End Sub

Public Sub ApplyPartStyle(ByVal targetCell As Range, ByVal partName As String)
    Select Case partName
        Case "HEAD"
            targetCell.Interior.Color = RGB(254, 226, 226)
        Case "CHEST"
            targetCell.Interior.Color = RGB(219, 234, 254)
        Case "BELLY"
            targetCell.Interior.Color = RGB(254, 243, 199)
        Case "LEGS"
            targetCell.Interior.Color = RGB(220, 252, 231)
        Case Else
            targetCell.Interior.Color = RGB(249, 250, 251)
    End Select
End Sub

Public Sub UpdateScoreBoard()
    Dim ws As Worksheet
    Dim hitRate As Double

    Set ws = ThisWorkbook.Worksheets(SHEET_GAME)
    If Shots = 0 Then
        hitRate = 0
    Else
        hitRate = Hits / Shots
    End If

    ws.Range("C2").Value = RemainingSeconds()
    ws.Range("F2").Value = CurrentTargetPart
    ws.Range("I2").Value = Score
    ws.Range("L2").Value = Shots
    ws.Range("O2").Value = Hits
    ws.Range("C3").Value = Combo
    ws.Range("F3").Value = BestCombo
    ws.Range("I3").Value = Format(hitRate, "0%")
End Sub

Public Sub SetFeedback(ByVal message As String, ByVal rgbColor As Long)
    With ThisWorkbook.Worksheets(SHEET_GAME).Range("L3:O3")
        .MergeArea.Value = message
        .MergeArea.Font.Color = rgbColor
    End With
End Sub

Public Sub ShowResultPage()
    Dim ws As Worksheet
    Dim hitRate As Double

    Set ws = ThisWorkbook.Worksheets(SHEET_RESULT)
    If Shots = 0 Then
        hitRate = 0
    Else
        hitRate = Hits / Shots
    End If

    ws.Range("H6").Value = Score
    ws.Range("H8").Value = Shots
    ws.Range("H10").Value = Hits
    ws.Range("H12").Value = Misses
    ws.Range("H14").Value = Format(hitRate, "0%")
    ws.Range("H16").Value = BestCombo
End Sub

Public Function RemainingSeconds() As Long
    Dim remaining As Double
    remaining = (GameEndTime - Now) * 24 * 60 * 60
    If remaining < 0 Then remaining = 0
    RemainingSeconds = CLng(remaining)
End Function
