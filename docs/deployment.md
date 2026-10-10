# GitHub Pages 部署

网站通过 GitHub Actions 构建并部署到 GitHub Pages。在线地址为 https://xhxiaiein.github.io/guitar-tabs/。

仓库的 Pages 发布来源使用 GitHub Actions。推送 `main` 或手动运行 `Deploy GitHub Pages` 工作流，会安装依赖、执行测试与曲谱检查，再构建并部署 `dist/`。发布记录见仓库的 Actions 和 `github-pages` 环境。

工作流从 Pages 配置读取项目路径，通过 `VITE_BASE_PATH` 传给构建。Vite 资源、manifest、Service Worker 注册和离线缓存共用该路径。离线缓存按部署路径区分，清理时只处理相同部署路径的旧缓存。

本地预览项目路径时，在 PowerShell 中运行：

```powershell
$env:VITE_BASE_PATH = '/guitar-tabs/'
npm run build
npm run preview
```

打开预览输出地址下的 `/guitar-tabs/`。结束后清除变量：

```powershell
Remove-Item Env:VITE_BASE_PATH
```

未设置 `VITE_BASE_PATH` 时使用根路径 `/`。发布前检查页面、源谱 SVG、Worker 和 manifest 地址；完成资源缓存后，再检查离线刷新。检查入口见[验证方法](validation.md)。
