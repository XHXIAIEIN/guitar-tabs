# 吉他曲谱本

[English](README.md)

在手机或桌面上阅读、编辑和练习吉他六线谱。

**[在线使用](https://xhxiaiein.github.io/guitar-tabs/)**

- 通过触摸或键盘编辑品位与节奏，支持撤销和重做。
- 播放曲谱、调整速度，并按小节范围循环练习。
- 调整谱面大小、弦间距和每行拍数，默认每行 8 拍。
- 支持中文和英文。首次按浏览器语言选择，其他语言默认使用英文。

编辑结果和设置保存在当前浏览器。可以导出 alphaTex 曲谱，或将曲库备份为 JSON。发布版联网访问并完成资源缓存后，可以离线打开。

## 本地运行

安装 Node.js 和 npm，然后运行：

```sh
npm ci
npm run dev
```

打开 Vite 输出的地址。预览发布版时，先运行 `npm run build`，再运行 `npm run preview`。

## 添加曲谱

在 `scores/` 中放入 `.atex` 文件和可选 SVG 预览。分类文件夹用于曲库分组，歌曲文件夹用于收纳源谱和预览。

```text
scores/
  beginner/
    song/
      song.atex
      song.svg
    another-song.atex
```

包含一个 `.atex` 和至少一个 SVG 的文件夹作为歌曲，归入上一级分类。同名文件优先配对；文件夹内只有一个 `.atex` 和一个 `.svg` 时，可以使用不同文件名。

发布版添加或移动文件后需要重新构建。示例见[入门曲谱](scores/beginner/README.md)。

## 开发

```sh
npm test
npm run check:scores
npm run build
```

推送 `main` 后会自动部署到 GitHub Pages。详细说明见[格式与保存](docs/format.md)、[验证方法](docs/validation.md)和[部署配置](docs/deployment.md)。
