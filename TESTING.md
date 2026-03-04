# 测试指南

本文档说明如何测试 cc-notify-for-macos 的各种通知场景。

## 前置准备

1. 确保已安装并配置好 hook：
```bash
# 检查 hook 文件是否存在
ls -la ~/.claude/hooks/macos-notify.mjs

# 检查配置文件
cat ~/.claude/hooks/notify-config.json

# 检查 settings.json 中的 hooks 配置
cat ~/.claude/settings.json | grep -A 30 "hooks"
```

2. 清理旧的状态文件（可选）：
```bash
rm ~/.claude/hooks/.notify-turn-state.json
rm ~/.claude/hooks/.notify-debounce.json
```

## 测试场景

### 1. 任务完成通知 ✅

**测试步骤：**
1. 在 Claude Code 中执行一个简单任务，例如：
   ```
   创建一个 hello.txt 文件，内容为 "Hello World"
   ```
2. 等待 Claude 完成任务
3. 应该收到 "任务完成 ✅" 通知

**预期结果：**
- 通知标题：Claude Code
- 通知副标题：任务完成 ✅
- 通知消息：任务已完成，可以开始下一步
- 声音：Hero

**验证状态：**
```bash
# 检查状态文件（任务完成后应该被重置）
cat ~/.claude/hooks/.notify-turn-state.json
# 预期输出：{"hasError":false,"hasWaitingForInput":false,"toolCount":0}
```

### 2. 任务失败通知 ❌

**测试步骤：**
1. 在 Claude Code 中执行一个会失败的任务，例如：
   ```
   读取一个不存在的文件 /path/to/nonexistent/file.txt
   ```
2. 应该立即收到 "任务失败 ❌" 通知

**预期结果：**
- 通知标题：Claude Code
- 通知副标题：任务失败 ❌
- 通知消息：Read 执行失败，请检查
- 声音：Basso

### 3. 等待输入通知 ⏸️

**测试步骤：**
1. 在 Claude Code 中触发一个需要用户输入的场景，例如：
   ```
   请问我应该使用 TypeScript 还是 JavaScript？
   ```
2. 当 Claude 调用 `AskUserQuestion` 时，应该收到通知

**预期结果：**
- 通知标题：Claude Code
- 通知副标题：等待您的输入 ⏸️
- 通知消息：Claude 需要您回答问题
- 声音：default

**验证状态：**
```bash
# 检查状态文件
cat ~/.claude/hooks/.notify-turn-state.json
# 预期输出：{"hasError":false,"hasWaitingForInput":true,"toolCount":X}
```

### 4. 状态残留 Bug 修复验证

**测试步骤：**
1. 触发一个等待输入的场景（参考场景 3）
2. 回答问题后，让 Claude 执行一个新任务
3. 新任务完成后，应该收到 "任务完成 ✅" 通知

**预期结果：**
- 即使之前有 `hasWaitingForInput: true` 状态，新任务完成后仍然能收到通知
- 状态文件应该被正确重置

**Bug 复现（修复前）：**
```bash
# 手动设置残留状态
echo '{"hasError":false,"hasWaitingForInput":true,"toolCount":5}' > ~/.claude/hooks/.notify-turn-state.json

# 执行一个简单任务
# 修复前：不会收到任务完成通知
# 修复后：会收到任务完成通知
```

## 防抖测试

**测试步骤：**
1. 快速连续执行多个任务（间隔小于 5 秒）
2. 观察通知行为

**预期结果：**
- 同类型的通知在 5 秒内只会发送一次
- 不同类型的通知不受防抖影响

**禁用防抖：**
```json
{
  "debounce": {
    "enabled": false
  }
}
```

## 手动测试通知

### 测试 terminal-notifier

```bash
terminal-notifier \
  -message "测试消息" \
  -title "Claude Code" \
  -subtitle "任务完成 ✅" \
  -contentImage ~/Pictures/claude.icon.png \
  -sound "Hero" \
  -group "claude-code-test"
```

### 测试 osascript

```bash
osascript -e 'display notification "测试消息" with title "Claude Code" subtitle "任务完成 ✅" sound name "Hero"'
```

## 调试

### 启用详细日志

修改 `macos-notify.mjs`，在 `main()` 函数开头添加：

```javascript
console.log('Hook event:', hookEvent);
console.log('Payload:', JSON.stringify(input, null, 2));
console.log('Turn state:', turnState);
```

### 查看 hook 执行日志

Claude Code 会在终端输出 hook 执行结果。如果 hook 失败，会显示错误信息。

### 检查通知权限

```bash
# 系统设置 > 通知 > terminal-notifier
# 确保启用了以下选项：
# - 允许通知
# - 在通知中心显示
# - 横幅样式
# - 播放声音
```

## 常见问题

### 通知没有显示

1. 检查通知权限（参考上面的"检查通知权限"）
2. 检查配置文件是否正确
3. 手动测试 terminal-notifier 和 osascript
4. 查看 Claude Code 终端输出的 hook 执行日志

### 通知太频繁

调整防抖间隔：
```json
{
  "debounce": {
    "intervalSeconds": 10
  }
}
```

### 状态文件异常

清理状态文件：
```bash
rm ~/.claude/hooks/.notify-turn-state.json
rm ~/.claude/hooks/.notify-debounce.json
```

## 自动化测试（未来计划）

- [ ] 单元测试：测试 `shouldNotify()` 函数的各种场景
- [ ] 集成测试：模拟 hook 事件流
- [ ] E2E 测试：实际运行 Claude Code 并验证通知
