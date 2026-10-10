吉他曲谱本用于在手机上阅读和记录六线谱。

运行 `npm install`，再运行 `npm run dev`。界面候选页提供两版手机排版和曲谱格式验证。

`scores/` 保存四首 alphaTex 曲谱及可打印的谱面。每个文件包含完整旋律、练习速度、拍号和六弦调弦。曲谱说明见 `scores/README.md`。

运行 `npm test` 和 `npm run check:scores` 验证模型、节奏与格式往返。运行 `npm run build` 生成网站。开发服务器运行时，`npm run test:browser` 使用静音 Chrome 验证实际输入和 Worker。
