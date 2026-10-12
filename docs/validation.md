# 验证方法与边界

项目使用单元测试、源谱检查、构建和实际浏览器输入验证曲谱行为。自动检查与桌面浏览器模拟分别提供证据，真机检查单独记录。

## 自动检查

在仓库根目录运行：

```sh
npm test
npm run check:scores
npm run build
```

| 入口 | 检查范围 |
| --- | --- |
| `npm test` | 格式往返与拒绝边界、编辑历史、保存恢复、目录配对、多语言、整行布局、播放时间表、采样格式、音频启动、中断和取消 |
| `npm run check:scores` | 递归读取 `.atex`，检查完整小节时值和导出重读的音乐内容 |
| `npm run build` | TypeScript 检查、Vite 构建、离线缓存生成 |

源谱检查要求仓库中的每个小节填满。应用模型允许未填满的小节，因此导入文件与示例曲库的检查标准不同。

## 浏览器检查

浏览器脚本需要安装桌面 Chrome，使用静音模式模拟手机。先启动开发服务器：

```sh
npm run dev -- --port 5193 --strictPort
```

再在另一个 PowerShell 终端运行：

```powershell
$env:PREVIEW_URL = 'http://127.0.0.1:5193'
npm run test:browser
Remove-Item Env:PREVIEW_URL
```

脚本覆盖目录分组、SVG 配对、点选与键盘输入、编辑历史、保存与刷新、导出、备份恢复、非法导入、中英文切换、Worker、播放状态和长谱滚动。开发模式会临时创建 `scores/__browser-fixture/` 目录并在结束时清理。报告与截图写入 `.tmp/browser/`。

生产与离线检查先构建，再启动预览：

```sh
npm run build
npm run preview -- --port 5194 --strictPort
```

在另一个 PowerShell 终端中运行：

```powershell
$env:PREVIEW_URL = 'http://127.0.0.1:5194'
$env:PRODUCTION = '1'
npm run test:browser
Remove-Item Env:PRODUCTION
Remove-Item Env:PREVIEW_URL
```

生产检查包含缓存后的断网刷新与源谱打开。安装功能需要另行在支持安装的浏览器中检查。

## 视觉与交互检查

| 场景 | 判断依据 |
| --- | --- |
| 曲库、阅读、编辑、设置、练习、错误及空曲库 | 320、390 和 1200 像素截图；空曲库组件样例 |
| 每行拍数和完整小节 | 更改 4/8/12/16 设置，检查小节分组与刷新后的偏好 |
| 连续阅读 | 密集与稀疏乐句使用相同字号、拍距；窄屏按完整小节换行，放大后的两位品保留边距 |
| 阅读窗口 | 当前行和下一行可见时换行保持静止；空间不足时滚动，手动浏览和恢复跟随正常 |
| 拍点与拼接留白 | 比较行内拍点间距、小节线两侧留白和不同整行的小节线位置 |
| 弦线连续 | 检查相邻小节弦线端点的水平位置与高度 |
| 第二小节点选与细分网格 | 通过实际点选检查小节、弦号和音乐刻度 |
| 长谱与性能 | 滚动长谱，检查附近小节绘制和点选反馈；脚本要求反馈低于 100 毫秒 |
| 播放 | 检查音频取消、和弦与休止高亮、暂停保留位置、停止清除、首次播放前定位、换行与循环跟随、手动滚动后暂停跟随、聚焦按钮、重排和调速；信号检查使用 OfflineAudioContext |

浏览器脚本将逐次检查结果写入 `.tmp/browser/`。人工浏览器验收的截图和坐标记录保存在本机 `.tmp/redesign/`。评估改动时，应核对报告对应的提交及覆盖范围，分别确认整行排版、完整浏览器流程和生产离线行为。

## iOS Safari 音频验收

实现依据：[WebKit 的点击授权限制](https://bugs.webkit.org/show_bug.cgi?id=149367)、[音频中断状态测试](https://github.com/WebKit/WebKit/blob/main/LayoutTests/webaudio/audiocontext-state-interrupted.html)和 [Audio Session 的播放类型](https://w3c.github.io/audio-session/#audiosession-types)。采样使用 PCM WAV，音频启动在点击处理器内调用 `resume()`，然后等待曲谱和采样载入。

| 真机场景 | 预期结果 |
| --- | --- |
| 首次打开页面，点击播放 | 吉他发声，进度跟随音频；载入期间可以取消 |
| 开启或关闭静音开关 | 支持 Audio Session API 的 Safari 使用播放类型；其他版本需关闭静音并检查媒体音量 |
| 切换应用、锁屏或接听来电 | 保留拍位并暂停，返回后点击播放继续 |
| 使用扬声器、耳机或蓝牙输出 | 声音从选定输出设备播放；被系统中断后可再次启动 |
| 等待缓存完成后断网刷新 | 曲谱打开，吉他采样可以解码和播放 |
| 音源加载失败，再点击重试 | 显示错误，重试后发声，旧请求不会迟到播放 |

iOS Safari 真机、物理静音开关、蓝牙路由和系统桌面安装未验证。桌面静音信号检测、用户授权观测及模拟中断分别提供有限证据。它们不能替代真机听音检查。外部文件支持范围见[格式说明](format.md)。
