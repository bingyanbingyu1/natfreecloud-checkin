# natfreecloud 自动签到 (GitHub Actions)

基于 GitHub Actions 的 natfreecloud 自动签到脚本，解决 Cloudflare Workers 被拦截的问题。

## 功能特点

- ✅ **自动签到**: 每天定时自动执行签到
- ✅ **手动触发**: 支持手动触发签到
- ✅ **多重策略**: 使用多种请求方法提高成功率
- ✅ **Telegram通知**: 签到结果实时通知
- ✅ **日志记录**: 详细的执行日志
- ✅ **免费运行**: 基于 GitHub Actions 免费额度

## 快速开始

### 1. Fork 此仓库

点击右上角的 "Fork" 按钮，将此仓库复制到您的 GitHub 账户。

### 2. 配置 Secrets

在您的仓库中，进入 `Settings` > `Secrets and variables` > `Actions`，添加以下 Secrets：

| Secret 名称 | 说明 | 是否必需 |
|------------|------|---------|
| `UID` | 您的 natfreecloud 用户ID | ✅ 必需 |
| `TG_BOT_TOKEN` | Telegram 机器人 Token | ❌ 可选 |
| `TG_CHAT_ID` | Telegram Chat ID | ❌ 可选 |

#### 获取用户ID方法：
1. 登录 natfreecloud 网站
2. 查看个人资料页面或 URL 中的数字ID

#### 获取 Telegram 配置（可选）：
1. 在 Telegram 中找到 @BotFather
2. 发送 `/newbot` 创建机器人，获取 Token
3. 向机器人发送消息，然后访问 `https://api.telegram.org/bot<TOKEN>/getUpdates` 获取 Chat ID

### 3. 启用 Actions

1. 进入仓库的 `Actions` 标签页
2. 如果看到提示，点击 "I understand my workflows, go ahead and enable them"
3. 找到 "natfreecloud 自动签到" workflow 并启用

### 4. 测试运行

#### 手动测试：
1. 进入 `Actions` 标签页
2. 选择 "natfreecloud 自动签到" workflow
3. 点击 "Run workflow" 按钮
4. 可选择输入特定的用户ID，或留空使用默认配置
5. 点击 "Run workflow" 开始执行

#### 查看结果：
1. 在 workflow 运行页面查看实时日志
2. 检查 Telegram 通知（如果已配置）
3. 下载日志文件查看详细信息

## 定时设置

默认配置为每天北京时间上午8点自动签到。如需修改时间：

1. 编辑 `.github/workflows/checkin.yml` 文件
2. 修改 `cron` 表达式：
   ```yaml
   schedule:
     - cron: '0 0 * * *'  # UTC时间，对应北京时间8点
   ```

### 常用时间设置：
- `0 0 * * *` - 每天北京时间8点
- `0 2 * * *` - 每天北京时间10点  
- `0 12 * * *` - 每天北京时间20点

## 故障排除

### 1. 签到失败
- 检查用户ID是否正确
- 查看 Actions 日志了解具体错误
- 尝试手动在网站签到确认账户状态

### 2. Telegram通知未收到
- 确认 Token 和 Chat ID 配置正确
- 检查机器人是否被阻止
- 查看 Actions 日志中的通知发送状态

### 3. Actions 未运行
- 确认仓库已启用 Actions
- 检查 workflow 文件语法是否正确
- 确认仓库不是私有仓库（免费账户限制）

## 高级配置

### 多用户支持

如需为多个用户签到，可以：

1. **方法1**: 修改 workflow 文件，添加多个 job
2. **方法2**: 使用手动触发，每次指定不同的用户ID

### 自定义通知

可以修改 `checkin.js` 中的 `sendTelegramNotification` 函数来自定义通知内容。

### 日志保留

默认保留7天的日志文件，可在 workflow 文件中修改 `retention-days` 参数。

## 注意事项

1. **GitHub Actions 限制**: 免费账户每月有2000分钟的限制，签到脚本每次运行约1-2分钟
2. **网络环境**: GitHub Actions 使用的是国外服务器，网络环境与 Cloudflare Workers 不同
3. **频率限制**: 建议不要过于频繁地手动触发，避免对目标网站造成压力
4. **账户安全**: 请妥善保管您的 Secrets，不要在公开场所泄露

## 更新日志

- **v1.0.0**: 初始版本，支持基本签到功能
- 支持多种请求策略
- 集成 Telegram 通知
- 完整的日志记录

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request 来改进此项目。

---

**免责声明**: 此脚本仅供学习和个人使用，请遵守相关网站的使用条款。
