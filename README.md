# Pi中文网 Waline 评论系统

## 部署步骤（只需 Vercel 一个平台）

### 第1步：一键部署
点击下方按钮，用 GitHub 登录 Vercel，然后点 Deploy：

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/DMSQ-creator/pibizh-waline)

### 第2步：创建数据库
1. 部署完成后，进入 Vercel 项目页面
2. 点击顶部 **Storage** 标签
3. 点击 **Create Database** → 选择 **Postgres (Serverless)**
4. 选择免费区域（推荐 Singapore），点 Create
5. 创建完成后，环境变量会自动注入

### 第3步：添加额外环境变量
进入 **Settings → Environment Variables**，添加：
- `SECURE_DOMAINS` = `pibizh.com`
- `SITE_URL` = `https://pibizh.com`

### 第4步：重新部署
进入 **Deployments** 标签，点击最新部署旁的 **⋯** → **Redeploy**

完成！评论系统地址：`https://你的项目名.vercel.app`

## 支持的登录方式
- ✅ 匿名评论（填昵称即可）
- ✅ 邮箱登录
- ✅ GitHub
- ✅ Google
- ✅ Facebook / Twitter
