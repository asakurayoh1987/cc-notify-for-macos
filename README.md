# cc-notify-for-macos

🔔 macOS 桌面通知 Hook for Claude Code - 让 AI 助手在关键时刻主动通知你

## 简介

`cc-notify-for-macos` 是一个为 [Claude Code](https://claude.ai/code) 设计的 macOS 桌面通知 Hook。它能在 Claude Code 执行任务时,通过 macOS 原生通知中心实时推送任务状态,让你无需一直盯着终端,专注于其他工作。

### 核心特性

- ✅ **任务完成通知** - 当 Claude 完成一轮任务时自动通知
- ❌ **任务失败通知** - 工具执行出错时立即提醒
- ⏸️ **等待输入通知** - 需要你回答问题或授权时及时提醒
- 🎨 **自定义图标** - 支持自定义通知图标(需要 terminal-notifier)
- 🔕 **防抖机制** - 避免短时间内重复通知
- ⚙️ **完全可配置** - 通过 JSON 配置文件自定义所有行为

## 通知场景

### 1. 任务完成 ✅
当 Claude Code 完成一轮任务执行,且没有错误或等待输入时触发。

**默认配置:**
- 标题: "Claude Code"
- 副标题: "任务完成 ✅"
- 声音: Hero

### 2. 任务失败 ❌
当工具执行出现错误时立即触发。

**默认配置:**
- 标题: "Claude Code"
- 副标题: "任务失败 ❌"
- 声音: Basso

### 3. 等待输入 ⏸️
当 Claude 需要你的输入时触发,包括:
- 回答问题 (`AskUserQuestion`)
- 审批计划 (`ExitPlanMode`)
- 授权请求 (`PermissionRequest`)

**默认配置:**
- 标题: "Claude Code"
- 副标题: "等待您的输入 ⏸️"
- 声音: default

## 安装

### 前置要求

- macOS 10.10+
- Node.js 14+
- [Claude Code](https://claude.ai/code) CLI

### 1. 安装 terminal-notifier (可选,但推荐)

`terminal-notifier` 支持自定义通知图标,提供更好的视觉体验。

```bash
brew install terminal-notifier
```

### 2. 配置 terminal-notifier 权限

首次使用时,macOS 会提示授权通知权限。如果没有弹出授权提示,请手动配置:

1. 打开 **系统设置** > **通知**
2. 找到 **terminal-notifier** 或 **Script Editor**
3. 启用 **允许通知**
4. 建议启用:
   - ✅ 在通知中心显示
   - ✅ 横幅样式(或提醒)
   - ✅ 播放声音

### 3. 下载并安装 Hook

```bash
# 克隆仓库
git clone https://github.com/asakurayoh1987/cc-notify-for-macos.git
cd cc-notify-for-macos

# 创建 Claude Code hooks 目录
mkdir -p ~/.claude/hooks

# 复制 Hook 脚本
cp macos-notify.mjs ~/.claude/hooks/

# 赋予执行权限
chmod +x ~/.claude/hooks/macos-notify.mjs

# 复制配置文件(可选)
cp notify-config.example.json ~/.claude/hooks/notify-config.json
```

### 4. 配置 Claude Code

编辑 `~/.claude/settings.json`,添加 hooks 配置:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node ~/.claude/hooks/macos-notify.mjs"
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node ~/.claude/hooks/macos-notify.mjs"
          }
        ]
      }
    ],
    "PermissionRequest": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node ~/.claude/hooks/macos-notify.mjs"
          }
        ]
      }
    ]
  }
}
```

### 5. 准备通知图标(可选)

如果你想使用自定义图标:

1. 准备一张 PNG 图片(建议 256x256 或 512x512)
2. 保存到 `~/Pictures/claude.icon.png`
3. 或者在配置文件中修改 `iconPath` 指向你的图标路径

## 配置

### 配置文件位置

`~/.claude/hooks/notify-config.json`

### 默认配置

```json
{
  "enabled": true,
  "iconPath": "~/Pictures/claude.icon.png",
  "notifications": {
    "taskComplete": {
      "enabled": true,
      "title": "Claude Code",
      "subtitle": "任务完成 ✅",
      "sound": "Hero"
    },
    "taskError": {
      "enabled": true,
      "title": "Claude Code",
      "subtitle": "任务失败 ❌",
      "sound": "Basso"
    },
    "waitingForInput": {
      "enabled": true,
      "title": "Claude Code",
      "subtitle": "等待您的输入 ⏸️",
      "sound": "default"
    }
  },
  "debounce": {
    "enabled": true,
    "intervalSeconds": 5
  }
}
```

### 配置说明

- `enabled`: 全局开关,设为 `false` 可禁用所有通知
- `iconPath`: 自定义图标路径(仅 terminal-notifier 支持)
- `notifications.<type>.enabled`: 单独控制每种通知类型
- `notifications.<type>.title`: 通知标题
- `notifications.<type>.subtitle`: 通知副标题
- `notifications.<type>.sound`: 通知声音(macOS 系统声音名称)
- `debounce.enabled`: 防抖开关
- `debounce.intervalSeconds`: 防抖间隔(秒)

### macOS 系统声音

常用的 macOS 系统声音名称:
- `Basso` - 低沉的错误音
- `Blow` - 吹气声
- `Bottle` - 瓶子声
- `Frog` - 青蛙声
- `Funk` - 放克音
- `Glass` - 玻璃声
- `Hero` - 英雄音(推荐用于成功)
- `Morse` - 摩尔斯电码
- `Ping` - 乒乓声
- `Pop` - 爆裂声
- `Purr` - 呼噜声
- `Sosumi` - 经典 Mac 声音
- `Submarine` - 潜水艇声
- `Tink` - 叮当声
- `default` - 系统默认声音

查看所有可用声音:
```bash
ls /System/Library/Sounds/
```

## 工作原理

### Hook 事件流

```
Claude Code 执行工具
    ↓
PreToolUse Hook (工具执行前)
    ↓
检测: AskUserQuestion / ExitPlanMode
    ↓
PostToolUse Hook (工具执行后)
    ↓
检测: 工具执行错误
    ↓
PermissionRequest Hook (权限请求)
    ↓
检测: 需要用户授权
```

### 状态跟踪

Hook 通过状态文件跟踪当前 turn 的执行状态:

- `~/.claude/hooks/.notify-turn-state.json` - 当前 turn 状态
  - `hasError`: 是否有错误
  - `hasWaitingForInput`: 是否等待输入
  - `toolCount`: 工具执行次数

- `~/.claude/hooks/.notify-debounce.json` - 防抖状态
  - 记录每种通知类型的最后发送时间

### 通知实现

1. **优先使用 terminal-notifier**
   - 支持自定义图标 (`-contentImage`)
   - 支持通知分组 (`-group`)
   - 更好的通知控制

2. **降级到 osascript**
   - macOS 原生 AppleScript
   - 不支持自定义图标
   - 作为 terminal-notifier 不可用时的备选方案

## 故障排除

### 通知没有显示

1. **检查通知权限**
   ```bash
   # 测试 terminal-notifier
   terminal-notifier -message "测试" -title "Claude Code"

   # 测试 osascript
   osascript -e 'display notification "测试" with title "Claude Code"'
   ```

2. **检查系统设置**
   - 系统设置 > 通知 > terminal-notifier/Script Editor
   - 确保启用了通知权限

3. **检查配置文件**
   ```bash
   cat ~/.claude/hooks/notify-config.json
   ```

4. **检查 Hook 是否正确配置**
   ```bash
   cat ~/.claude/settings.json | grep -A 20 "hooks"
   ```

### 通知太频繁

调整防抖间隔:

```json
{
  "debounce": {
    "enabled": true,
    "intervalSeconds": 10
  }
}
```

### 禁用特定类型的通知

```json
{
  "notifications": {
    "taskComplete": {
      "enabled": false
    }
  }
}
```

### 自定义图标不显示

1. 确认已安装 terminal-notifier
2. 检查图标路径是否正确
3. 确认图标文件存在且为 PNG 格式
4. 注意: `-appIcon` 参数在 macOS 上通常不生效,使用 `-contentImage` 显示右侧内容图标

## 卸载

```bash
# 删除 Hook 脚本
rm ~/.claude/hooks/macos-notify.mjs

# 删除配置文件
rm ~/.claude/hooks/notify-config.json

# 删除状态文件
rm ~/.claude/hooks/.notify-turn-state.json
rm ~/.claude/hooks/.notify-debounce.json

# 从 settings.json 中移除 hooks 配置
# 手动编辑 ~/.claude/settings.json
```

## 贡献

欢迎提交 Issue 和 Pull Request!

## 许可证

MIT License

## 相关链接

- [Claude Code](https://claude.ai/code)
- [terminal-notifier](https://github.com/julienXX/terminal-notifier)
- [Claude Code Hooks 文档](https://docs.anthropic.com/claude/docs/hooks)

## 致谢

感谢 Anthropic 团队开发的 Claude Code 和强大的 Hooks 系统。
