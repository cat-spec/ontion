Attribute VB_Name = "modGame"
Option Explicit

Public Sub StartGame()
    Randomize
    LoadConfig

    IsGameRunning = True
    IsRoundActive = False

    Score = 0
    Shots = 0
    Hits = 0
    Misses = 0
    Combo = 0
    BestCombo = 0

    GameStartTime = Now
    GameEndTime = DateAdd("s", GameDurationSeconds, GameStartTime)

    PrepareGameSheet
    UpdateScoreBoard
    SetFeedback "游戏开始", RGB(37, 99, 235)

    ThisWorkbook.Worksheets(SHEET_GAME).Activate
    SpawnNextRound
    ScheduleNextTick
End Sub

Public Sub RestartGame()
    CancelTick
    StartGame
End Sub

Public Sub EndGame()
    If Not IsGameRunning Then Exit Sub

    IsGameRunning = False
    IsRoundActive = False
    CancelTick
    ClearArena
    SetFeedback "本局结束", RGB(55, 65, 81)
    ShowResultPage
    ThisWorkbook.Worksheets(SHEET_RESULT).Activate
End Sub

Public Sub SpawnNextRound()
    If Not IsGameRunning Then Exit Sub
    If RemainingSeconds() <= 0 Then
        EndGame
        Exit Sub
    End If

    IsRoundActive = False
    ClearArena
    CurrentTemplateId = RandomTemplateId()
    CurrentTargetPart = RandomTargetPart()
    LoadTemplate CurrentTemplateId
    RenderTemplate CurrentTemplateId
    UpdateScoreBoard
    IsRoundActive = True
End Sub

Public Sub TickGame()
    If Not IsGameRunning Then Exit Sub

    UpdateScoreBoard
    If RemainingSeconds() <= 0 Then
        EndGame
    Else
        ScheduleNextTick
    End If
End Sub

Public Sub ScheduleNextTick()
    CancelTick
    NextTickAt = Now + TimeSerial(0, 0, 1)
    Application.OnTime EarliestTime:=NextTickAt, Procedure:="TickGame", Schedule:=True
End Sub

Public Sub CancelTick()
    On Error Resume Next
    If NextTickAt <> 0 Then
        Application.OnTime EarliestTime:=NextTickAt, Procedure:="TickGame", Schedule:=False
    End If
    On Error GoTo 0
    NextTickAt = 0
End Sub

Public Sub HandleStartAction()
    StartGame
End Sub

Public Sub HandleRestartAction()
    RestartGame
End Sub
