# 班级管理系统

一个功能完善的大学生班级综合管理平台，支持签到、考试、投票抽奖等功能。

## 功能特性

### 📍 签到管理
- 定位签到，支持自定义签到范围（50-500米）
- 可设置签到时间和循环周期
- 支持自定义填写字段和备注
- 签到统计与导出

### 📝 考试系统
- 支持单选题、多选题、判断题、填空题
- 题库管理，支持批量导入
- 随机抽题，题目和选项顺序可打乱
- 自动判分（填空题不区分大小写）
- 考试记录与成绩统计

### 🗳️ 投票抽奖
- 自定义投票主题和选项
- 抽奖功能，支持自定义奖项和概率
- 生成二维码，扫码即可参与
- 自定义信息收集字段

### 👥 用户管理
- 多角色权限控制（管理员/子管理员/普通成员）
- 用户信息管理
- 密码重置功能

### ⚙️ 系统设置
- 系统信息配置
- 安全设置
- 通知设置

## 技术栈

- **前端**: HTML5, CSS3, JavaScript
- **样式**: Tailwind CSS
- **图标**: Font Awesome
- **存储**: LocalStorage (客户端存储)
- **部署**: Cloudflare Pages

## 快速开始

### 本地运行

1. 克隆仓库
```bash
git clone https://github.com/你的用户名/class-management-system.git
cd class-management-system
```

2. 启动本地服务器
```bash
# 使用 Python
python -m http.server 8080

# 或使用 Node.js
npx serve -p 8080
```

3. 打开浏览器访问 `http://localhost:8080`

### 默认管理员账号

- 用户名: `wutao2007526`
- 密码: `Wutao@2007526`

## 部署到 Cloudflare Pages

### 方式一：通过 Cloudflare Dashboard

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 Pages 页面，点击"创建项目"
3. 连接 GitHub 仓库
4. 选择此仓库，配置构建设置：
   - 构建命令: 留空
   - 构建输出目录: `/`
5. 点击"保存并部署"

### 方式二：通过 GitHub Actions（推荐）

1. 在 Cloudflare Dashboard 获取以下信息：
   - API Token: [创建 API Token](https://dash.cloudflare.com/profile/api-tokens)
   - Account ID: 在 Workers & Pages 页面查看

2. 在 GitHub 仓库设置 Secrets：
   - `CLOUDFLARE_API_TOKEN`: 你的 Cloudflare API Token
   - `CLOUDFLARE_ACCOUNT_ID`: 你的 Cloudflare Account ID

3. 推送代码到 main 分支，GitHub Actions 将自动部署

## 项目结构

```
class-management-system/
├── index.html          # 登录页面
├── dashboard.html      # 仪表盘
├── attendance.html     # 签到管理
├── exam.html           # 考试系统
├── vote.html           # 投票抽奖
├── users.html          # 用户管理
├── profile.html        # 个人资料
├── settings.html       # 系统设置
├── participate.html    # 参与页面
├── js/
│   ├── data.js         # 数据存储模块
│   └── utils.js        # 工具函数
├── .github/
│   └── workflows/
│       └── deploy.yml  # GitHub Actions 部署配置
├── wrangler.toml       # Cloudflare 配置
└── .gitignore
```

## 权限说明

| 功能 | 管理员 | 子管理员 | 普通成员 |
|------|:------:|:--------:|:--------:|
| 创建签到/考试/投票/抽奖 | ✅ | ✅ | ❌ |
| 导出数据 | ✅ | ✅ | ❌ |
| 用户管理 | ✅ | ❌ | ❌ |
| 系统设置 | ✅ | ❌ | ❌ |
| 参与签到/考试/投票/抽奖 | ✅ | ✅ | ✅ |
| 修改个人资料 | ✅ | ✅ | ✅ |

## 注意事项

- 本系统使用 LocalStorage 存储数据，数据保存在浏览器本地
- 清除浏览器数据会导致数据丢失
- 建议定期导出重要数据进行备份

## License

MIT License
