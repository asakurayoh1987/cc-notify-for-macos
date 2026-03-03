#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { exec } from 'child_process';

// 默认配置
function getDefaultConfig() {
  return {
    enabled: true,
    iconPath: join(homedir(), 'Pictures/claude.icon.png'),
    notifications: {
      taskComplete: {
        enabled: true,
        title: 'Claude Code',
        subtitle: '任务完成 ✅',
        sound: 'Hero'
      },
      taskError: {
        enabled: true,
        title: 'Claude Code',
        subtitle: '任务失败 ❌',
        sound: 'Basso'
      },
      waitingForInput: {
        enabled: true,
        title: 'Claude Code',
        subtitle: '等待您的输入 ⏸️',
        sound: 'default'
      }
    },
    debounce: {
      enabled: true,
      intervalSeconds: 5
    }
  };
}

// 加载配置
function loadConfig() {
  const configPath = join(homedir(), '.claude/hooks/notify-config.json');
  try {
    if (existsSync(configPath)) {
      return JSON.parse(readFileSync(configPath, 'utf-8'));
    }
  } catch (error) {
    // 配置文件读取失败，使用默认配置
  }
  return getDefaultConfig();
}

// 读取 stdin
async function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.on('data', chunk => data += chunk);
    process.stdin.on('end', () => {
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve({});
      }
    });
  });
}

// 状态管理（用于跟踪当前 turn）
const STATE_FILE = join(homedir(), '.claude/hooks/.notify-turn-state.json');

function loadTurnState() {
  try {
    if (existsSync(STATE_FILE)) {
      return JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
    }
  } catch {
    // 状态文件读取失败
  }
  return { hasError: false, hasWaitingForInput: false, toolCount: 0 };
}

function saveTurnState(state) {
  try {
    const dir = dirname(STATE_FILE);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(STATE_FILE, JSON.stringify(state));
  } catch {
    // 状态保存失败，静默忽略
  }
}

function resetTurnState() {
  saveTurnState({ hasError: false, hasWaitingForInput: false, toolCount: 0 });
}

// 检查防抖
function checkDebounce(type, config) {
  if (!config.debounce.enabled) return true;

  const debounceFile = join(homedir(), '.claude/hooks/.notify-debounce.json');
  const now = Date.now();

  let state = {};
  try {
    if (existsSync(debounceFile)) {
      state = JSON.parse(readFileSync(debounceFile, 'utf-8'));
    }
  } catch {
    state = {};
  }

  const lastTime = state[type] || 0;
  const interval = config.debounce.intervalSeconds * 1000;

  if (now - lastTime < interval) {
    return false;
  }

  state[type] = now;
  try {
    const dir = dirname(debounceFile);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(debounceFile, JSON.stringify(state));
  } catch {
    // 防抖状态保存失败，静默忽略
  }

  return true;
}

// 判断是否应该发送通知
function shouldNotify(hookEvent, payload, config) {
  if (!config.enabled) return null;

  const turnState = loadTurnState();

  // 场景 1: 任务完成（turn-complete 事件）
  if (hookEvent === 'turn-complete') {
    // 检查这一轮是否有错误或等待输入
    if (!turnState.hasError && !turnState.hasWaitingForInput && turnState.toolCount > 0) {
      resetTurnState();
      return {
        type: 'taskComplete',
        message: '任务已完成，可以开始下一步'
      };
    }
    resetTurnState();
    return null;
  }

  // 场景 2: 任务失败（PostToolUse 检测错误）
  if (hookEvent === 'PostToolUse') {
    turnState.toolCount++;
    saveTurnState(turnState);

    const response = payload.tool_response;
    const toolName = payload.tool_name;

    // 检测错误
    const hasError = response?.isError === true ||
                     (response?.content &&
                      Array.isArray(response.content) &&
                      response.content.some(item => item.type === 'text' &&
                                                   /error|failed|exception/i.test(item.text)));

    if (hasError) {
      turnState.hasError = true;
      saveTurnState(turnState);
      return {
        type: 'taskError',
        message: `${toolName} 执行失败，请检查`
      };
    }
  }

  // 场景 3: 任务中断 - 等待用户输入
  if (hookEvent === 'PreToolUse') {
    const toolName = payload.tool_name;

    // 检测 AskUserQuestion
    if (toolName === 'AskUserQuestion') {
      turnState.hasWaitingForInput = true;
      saveTurnState(turnState);
      return {
        type: 'waitingForInput',
        message: 'Claude 需要您回答问题'
      };
    }

    // 检测 ExitPlanMode（计划模式等待审批）
    if (toolName === 'ExitPlanMode') {
      turnState.hasWaitingForInput = true;
      saveTurnState(turnState);
      return {
        type: 'waitingForInput',
        message: '计划已完成，等待您审批'
      };
    }
  }

  // 场景 3: 任务中断 - 权限请求
  if (hookEvent === 'PermissionRequest') {
    turnState.hasWaitingForInput = true;
    saveTurnState(turnState);
    return {
      type: 'waitingForInput',
      message: '需要您的授权才能继续'
    };
  }

  return null;
}

// 发送通知
function sendNotification(type, message, config) {
  const notifConfig = config.notifications[type];
  if (!notifConfig || !notifConfig.enabled) return;

  const { title, subtitle, sound } = notifConfig;
  const iconPath = config.iconPath;

  // 转义消息中的引号和特殊字符
  const escapedMessage = message.replace(/"/g, '\\"').replace(/\$/g, '\\$');
  const escapedTitle = title.replace(/"/g, '\\"').replace(/\$/g, '\\$');
  const escapedSubtitle = subtitle.replace(/"/g, '\\"').replace(/\$/g, '\\$');

  // 优先使用 terminal-notifier（支持自定义图标）
  // 注意：-appIcon 在 macOS 上通常不生效，左侧图标由系统决定
  // -contentImage 设置右侧内容图标（可正常显示自定义图标）
  const terminalNotifierCmd = `terminal-notifier -message "${escapedMessage}" -title "${escapedTitle}" -subtitle "${escapedSubtitle}" -contentImage "${iconPath}" -sound "${sound}" -group "claude-code-${type}"`;

  exec(terminalNotifierCmd, (error) => {
    if (error) {
      // 降级到 osascript（无自定义图标）
      const osascriptMessage = message.replace(/'/g, "'\\''");
      const osascriptTitle = title.replace(/'/g, "'\\''");
      const osascriptSubtitle = subtitle.replace(/'/g, "'\\''");
      const osascriptCmd = `osascript -e 'display notification "${osascriptMessage}" with title "${osascriptTitle}" subtitle "${osascriptSubtitle}" sound name "${sound}"'`;
      exec(osascriptCmd, () => {
        // 静默失败
      });
    }
  });
}

// 主函数
async function main() {
  const config = loadConfig();
  const input = await readStdin();

  // 获取 hook 事件类型
  const hookEvent = input.hook_event_name || process.env.CLAUDE_HOOK_EVENT;

  if (!hookEvent) {
    return; // 无法确定事件类型，静默退出
  }

  // 判断是否应该通知
  const notification = shouldNotify(hookEvent, input, config);

  if (!notification) {
    return; // 不需要通知
  }

  // 检查防抖
  if (!checkDebounce(notification.type, config)) {
    return; // 防抖跳过
  }

  // 发送通知
  sendNotification(notification.type, notification.message, config);
}

main().catch(() => {
  // 静默失败，不影响 Claude 执行
});
