Attribute VB_Name = "modJudge"
Option Explicit

Private Function IsInCollection(ByRef target As Collection, ByVal cellAddress As String) As Boolean
    Dim item As Variant
    For Each item In target
        If item = cellAddress Then
            IsInCollection = True
            Exit Function
        End If
    Next item
End Function

Private Function TargetCollectionByPartName(ByVal targetPart As String) As Collection
    Select Case targetPart
        Case "头"
            Set TargetCollectionByPartName = CurrentHead
        Case "胸"
            Set TargetCollectionByPartName = CurrentChest
        Case "腹"
            Set TargetCollectionByPartName = CurrentBelly
        Case Else
            Set TargetCollectionByPartName = CurrentLegs
    End Select
End Function

Public Sub JudgeShot(ByVal clickedCell As Range)
    Dim addressText As String
    Dim targetCells As Collection

    If Not IsGameRunning Then Exit Sub
    If Not IsRoundActive Then Exit Sub

    addressText = clickedCell.Address(False, False)
    Shots = Shots + 1
    Set targetCells = TargetCollectionByPartName(CurrentTargetPart)

    If IsInCollection(targetCells, addressText) Then
        HandlePerfectHit
    ElseIf IsInCollection(CurrentBody, addressText) Then
        HandleWrongPartHit
    Else
        HandleMiss
    End If

    UpdateScoreBoard
    If RemainingSeconds() <= 0 Then
        EndGame
    Else
        SpawnNextRound
    End If
End Sub

Private Sub HandlePerfectHit()
    Score = Score + HitScore
    Hits = Hits + 1
    Combo = Combo + 1
    If Combo > BestCombo Then BestCombo = Combo

    If ComboThreshold > 0 Then
        If Combo Mod ComboThreshold = 0 Then
            Score = Score + ComboBonus
            SetFeedback "命中指定部位，连击奖励 +" & ComboBonus, RGB(22, 163, 74)
            Exit Sub
        End If
    End If

    SetFeedback "命中指定部位 +" & HitScore, RGB(22, 163, 74)
End Sub

Private Sub HandleWrongPartHit()
    Score = Score + WrongPartPenalty
    Misses = Misses + 1
    Combo = 0
    SetFeedback "打中人形但部位错误 " & WrongPartPenalty, RGB(217, 119, 6)
End Sub

Private Sub HandleMiss()
    Score = Score + BlankPenalty
    Misses = Misses + 1
    Combo = 0
    SetFeedback "脱靶 " & BlankPenalty, RGB(220, 38, 38)
End Sub
