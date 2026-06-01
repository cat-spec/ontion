Attribute VB_Name = "modGlobals"
Option Explicit

Public Const SHEET_START As String = "开始页"
Public Const SHEET_GAME As String = "游戏页"
Public Const SHEET_RESULT As String = "结算页"
Public Const SHEET_CONFIG As String = "配置页"

Public Const RANGE_ARENA As String = "B6:Q22"

Public IsGameRunning As Boolean
Public IsRoundActive As Boolean
Public GameDurationSeconds As Long
Public GameStartTime As Date
Public GameEndTime As Date

Public Score As Long
Public Shots As Long
Public Hits As Long
Public Misses As Long
Public Combo As Long
Public BestCombo As Long

Public CurrentTemplateId As Long
Public CurrentTargetPart As String
Public CurrentBaseRow As Long
Public CurrentBaseCol As Long

Public HitScore As Long
Public WrongPartPenalty As Long
Public BlankPenalty As Long
Public ComboThreshold As Long
Public ComboBonus As Long

Public NextTickAt As Date

Public CurrentHead As Collection
Public CurrentChest As Collection
Public CurrentBelly As Collection
Public CurrentLegs As Collection
Public CurrentBody As Collection

Public Sub InitializeCollections()
    Set CurrentHead = New Collection
    Set CurrentChest = New Collection
    Set CurrentBelly = New Collection
    Set CurrentLegs = New Collection
    Set CurrentBody = New Collection
End Sub
