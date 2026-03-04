# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Fixed
- **状态残留 Bug 修复**: 修复了 `hasWaitingForInput` 状态在会话间残留的问题
  - 问题: 当之前的会话设置了 `hasWaitingForInput: true` 后，如果 `Stop` 事件未正确触发，状态会残留到下一个会话，导致任务完成通知无法发送
  - 修复: 在 `PreToolUse` 事件中，当检测到非 `AskUserQuestion` 和 `ExitPlanMode` 的工具调用时，自动重置 `hasWaitingForInput` 状态
  - 影响: 确保每次新的任务执行都能正确发送完成通知

## [1.0.0] - 2026-03-04

### Added
- 初始版本发布
- 支持任务完成通知
- 支持任务失败通知
- 支持等待输入通知
- 支持自定义图标（通过 terminal-notifier）
- 防抖机制避免重复通知
- 完全可配置的通知行为
