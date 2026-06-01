Attribute VB_Name = "modTemplates"
Option Explicit

Private Type TemplateCell
    RowOffset As Long
    ColOffset As Long
    DisplayValue As String
    PartName As String
End Type

Private Type TemplateData
    Cells() As TemplateCell
    CellCount As Long
End Type

Private Templates(1 To 6) As TemplateData
Private TemplatesLoaded As Boolean

Private Sub AddTemplateCell(ByRef tpl As TemplateData, ByVal rowOffset As Long, ByVal colOffset As Long, ByVal displayValue As String, ByVal partName As String)
    tpl.CellCount = tpl.CellCount + 1
    ReDim Preserve tpl.Cells(1 To tpl.CellCount)
    tpl.Cells(tpl.CellCount).RowOffset = rowOffset
    tpl.Cells(tpl.CellCount).ColOffset = colOffset
    tpl.Cells(tpl.CellCount).DisplayValue = displayValue
    tpl.Cells(tpl.CellCount).PartName = partName
End Sub

Private Sub BuildTemplate1()
    With Templates(1)
        AddTemplateCell Templates(1), 1, 0, "O", "HEAD"
        AddTemplateCell Templates(1), 2, -1, "/", "CHEST"
        AddTemplateCell Templates(1), 2, 0, "|", "CHEST"
        AddTemplateCell Templates(1), 2, 1, "\", "CHEST"
        AddTemplateCell Templates(1), 3, 0, "|", "BELLY"
        AddTemplateCell Templates(1), 4, -1, "/", "LEGS"
        AddTemplateCell Templates(1), 4, 1, "\", "LEGS"
        AddTemplateCell Templates(1), 5, -1, "/", "LEGS"
        AddTemplateCell Templates(1), 5, 1, "\", "LEGS"
    End With
End Sub

Private Sub BuildTemplate2()
    With Templates(2)
        AddTemplateCell Templates(2), 1, 0, "@", "HEAD"
        AddTemplateCell Templates(2), 2, 0, "/", "CHEST"
        AddTemplateCell Templates(2), 2, 1, "|", "CHEST"
        AddTemplateCell Templates(2), 2, 2, "\", "CHEST"
        AddTemplateCell Templates(2), 3, 1, "|", "BELLY"
        AddTemplateCell Templates(2), 4, 0, "/", "LEGS"
        AddTemplateCell Templates(2), 4, 2, "\", "LEGS"
        AddTemplateCell Templates(2), 5, 0, "/", "LEGS"
        AddTemplateCell Templates(2), 5, 2, "\", "LEGS"
    End With
End Sub

Private Sub BuildTemplate3()
    With Templates(3)
        AddTemplateCell Templates(3), 1, 0, "Q", "HEAD"
        AddTemplateCell Templates(3), 2, -2, "_", "CHEST"
        AddTemplateCell Templates(3), 2, -1, "/", "CHEST"
        AddTemplateCell Templates(3), 2, 0, "|", "CHEST"
        AddTemplateCell Templates(3), 2, 1, "\", "CHEST"
        AddTemplateCell Templates(3), 3, 0, "|", "BELLY"
        AddTemplateCell Templates(3), 4, -1, "/", "LEGS"
        AddTemplateCell Templates(3), 4, 1, "\", "LEGS"
        AddTemplateCell Templates(3), 5, -2, "/", "LEGS"
        AddTemplateCell Templates(3), 5, 2, "\", "LEGS"
    End With
End Sub

Private Sub BuildTemplate4()
    With Templates(4)
        AddTemplateCell Templates(4), 1, 0, "0", "HEAD"
        AddTemplateCell Templates(4), 2, -1, "/", "CHEST"
        AddTemplateCell Templates(4), 2, 0, "#", "CHEST"
        AddTemplateCell Templates(4), 2, 1, "\", "CHEST"
        AddTemplateCell Templates(4), 3, 0, "#", "BELLY"
        AddTemplateCell Templates(4), 4, -1, "<", "LEGS"
        AddTemplateCell Templates(4), 4, 1, ">", "LEGS"
        AddTemplateCell Templates(4), 5, -2, "/", "LEGS"
        AddTemplateCell Templates(4), 5, 0, "_", "LEGS"
        AddTemplateCell Templates(4), 5, 2, "\", "LEGS"
    End With
End Sub

Private Sub BuildTemplate5()
    With Templates(5)
        AddTemplateCell Templates(5), 1, 0, "O", "HEAD"
        AddTemplateCell Templates(5), 2, -2, "/", "CHEST"
        AddTemplateCell Templates(5), 2, -1, "/", "CHEST"
        AddTemplateCell Templates(5), 2, 0, "|", "CHEST"
        AddTemplateCell Templates(5), 2, 1, "\", "CHEST"
        AddTemplateCell Templates(5), 2, 2, "\", "CHEST"
        AddTemplateCell Templates(5), 3, 0, "|", "BELLY"
        AddTemplateCell Templates(5), 4, -2, "/", "LEGS"
        AddTemplateCell Templates(5), 4, 2, "\", "LEGS"
        AddTemplateCell Templates(5), 5, -1, "/", "LEGS"
        AddTemplateCell Templates(5), 5, 1, "\", "LEGS"
    End With
End Sub

Private Sub BuildTemplate6()
    With Templates(6)
        AddTemplateCell Templates(6), 1, 0, "*", "HEAD"
        AddTemplateCell Templates(6), 2, -1, "[", "CHEST"
        AddTemplateCell Templates(6), 2, 0, "|", "CHEST"
        AddTemplateCell Templates(6), 2, 1, "]", "CHEST"
        AddTemplateCell Templates(6), 3, -1, "/", "BELLY"
        AddTemplateCell Templates(6), 3, 0, "|", "BELLY"
        AddTemplateCell Templates(6), 3, 1, "\", "BELLY"
        AddTemplateCell Templates(6), 4, -1, "/", "LEGS"
        AddTemplateCell Templates(6), 4, 1, "\", "LEGS"
        AddTemplateCell Templates(6), 5, -1, "!", "LEGS"
        AddTemplateCell Templates(6), 5, 1, "!", "LEGS"
    End With
End Sub

Private Sub EnsureTemplates()
    If TemplatesLoaded Then Exit Sub

    BuildTemplate1
    BuildTemplate2
    BuildTemplate3
    BuildTemplate4
    BuildTemplate5
    BuildTemplate6

    TemplatesLoaded = True
End Sub

Private Function ArenaTopRow() As Long
    ArenaTopRow = ThisWorkbook.Worksheets(SHEET_GAME).Range(RANGE_ARENA).Row
End Function

Private Function ArenaLeftCol() As Long
    ArenaLeftCol = ThisWorkbook.Worksheets(SHEET_GAME).Range(RANGE_ARENA).Column
End Function

Public Function RandomTemplateId() As Long
    EnsureTemplates
    RandomTemplateId = Int((6 * Rnd) + 1)
End Function

Public Function RandomTargetPart() As String
    Dim roll As Long
    roll = Int((4 * Rnd) + 1)
    Select Case roll
        Case 1
            RandomTargetPart = "头"
        Case 2
            RandomTargetPart = "胸"
        Case 3
            RandomTargetPart = "腹"
        Case Else
            RandomTargetPart = "腿"
    End Select
End Function

Public Sub LoadTemplate(ByVal templateId As Long)
    Dim tpl As TemplateData
    Dim index As Long
    Dim baseRow As Long
    Dim baseCol As Long
    Dim cellAddress As String
    Dim ws As Worksheet

    EnsureTemplates
    InitializeCollections
    Set ws = ThisWorkbook.Worksheets(SHEET_GAME)

    tpl = Templates(templateId)
    baseRow = ArenaTopRow + 3 + Int((5 * Rnd))
    baseCol = ArenaLeftCol + 5 + Int((5 * Rnd))
    CurrentBaseRow = baseRow
    CurrentBaseCol = baseCol

    For index = 1 To tpl.CellCount
        cellAddress = ws.Cells(baseRow + tpl.Cells(index).RowOffset, baseCol + tpl.Cells(index).ColOffset).Address(False, False)
        AddAddressToCollection CurrentBody, cellAddress

        Select Case tpl.Cells(index).PartName
            Case "HEAD"
                AddAddressToCollection CurrentHead, cellAddress
            Case "CHEST"
                AddAddressToCollection CurrentChest, cellAddress
            Case "BELLY"
                AddAddressToCollection CurrentBelly, cellAddress
            Case "LEGS"
                AddAddressToCollection CurrentLegs, cellAddress
        End Select
    Next index
End Sub

Public Sub RenderTemplate(ByVal templateId As Long)
    Dim ws As Worksheet
    Dim tpl As TemplateData
    Dim index As Long
    Dim baseRow As Long
    Dim baseCol As Long
    Dim targetCell As Range

    EnsureTemplates
    Set ws = ThisWorkbook.Worksheets(SHEET_GAME)
    tpl = Templates(templateId)

    baseRow = CurrentBaseRow
    baseCol = CurrentBaseCol

    For index = 1 To tpl.CellCount
        Set targetCell = ws.Cells(baseRow + tpl.Cells(index).RowOffset, baseCol + tpl.Cells(index).ColOffset)
        targetCell.Value = tpl.Cells(index).DisplayValue
        ApplyPartStyle targetCell, tpl.Cells(index).PartName
    Next index
End Sub

Public Sub AddAddressToCollection(ByRef target As Collection, ByVal cellAddress As String)
    target.Add cellAddress
End Sub
