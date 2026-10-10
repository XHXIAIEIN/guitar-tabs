# Guitar Songbook · 吉他曲谱本

[English](#english) · [中文](#中文)

## English

Guitar Songbook lets you read, edit, and practise six-string tablature on your phone or desktop. It uses a white paper layout and supports English and Chinese. The first visit follows the browser language, with English as the fallback. Your language choice is saved.

### Run locally

Install Node.js and npm. The `node_modules/vite` entry in [package-lock.json](package-lock.json) records the required Node.js range. Then run:

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. To build and preview the production site, run:

```sh
npm run build
npm run preview
```

Once the production site's assets have been cached during an online visit, it can open offline. Desktop installation depends on the browser's install support.

### Read, edit, and practise

Choose a song from the library. In **Edit**, select a string and beat, then enter a fret using the keypad, fret field, or keyboard. You can change durations, add dots, rests, and ties, and undo or redo edits. Settings provide bar copying and insertion.

Keyboard controls work in Edit when an input or select field is not focused:

| Key | Action |
| --- | --- |
| `0`–`9` | Enter a fret; consecutive digits can form a two-digit fret |
| Arrow keys | Move between strings and beat positions |
| `Delete` / `Backspace` | Delete the selected note |
| `Ctrl` / `Cmd` + `Z` | Undo |
| `Ctrl` / `Cmd` + `Shift` + `Z`, or `Ctrl` / `Cmd` + `Y` | Redo |

Playback provides reference tones, pause, seek, speed adjustment, and bar-range looping. Editing or switching songs stops playback.

Settings control language, left and right labels, string lines, score size, string spacing, and rhythm symbols. Rhythm symbols above notes are hidden by default. A row defaults to **8 beats**, usually two 4/4 bars; choose 4, 8, 12, or 16 beats. Bars stay complete, and beat counts follow the time-signature numerator. Staff lines join continuously, with extra space around internal barlines. Narrow layouts reduce fret text size; dense notes or a fine editing grid can scroll horizontally.

### Organise the score library

Store alphaTex source files and optional SVG previews under `scores/`:

```text
scores/
  beginner/
    twinkle-star/
      twinkle-star.atex
      twinkle-star.svg
    another-song.atex
    another-song.svg
  practice/
    song-bundle/
      notes.atex
      preview.svg
```

The library groups songs by folder path. A folder with one `.atex` file and at least one SVG is treated as a song bundle under its parent group. Titles use `\title` first, then the bundle or file name. The bundled songs have translated display titles; custom titles, folder names, and user text retain their original language.

An SVG with the same filename stem takes priority. Different names pair automatically when the folder contains exactly one `.atex` and one `.svg`. Otherwise, previews require matching stems. Songs without a matching SVG still open. **Source preview** shows the paired SVG; the app renders edits from the score data.

The development server picks up source-folder changes. Rebuild the production site after adding or moving files. Saved source songs use relative paths as identifiers, so moving a source creates a different library entry. See the [beginner scores](scores/beginner/README.md).

### Save and exchange scores

Edits and display preferences are saved in the current browser. **Export alphaTex** downloads one score; **Back up library** downloads saved scores as JSON. Restoring a backup replaces the saved browser library after validation. Display preferences are stored separately.

Import accepts alphaTex, plain MusicXML, and supported Guitar Pro files. External scores must fit the supported single-track, single-voice, six-string subset. Read the [format limits](docs/format.md) before importing complex scores.

### Check the project

| Command | Purpose |
| --- | --- |
| `npm test` | Check score conversion, editing, storage, playback, language, and row layout |
| `npm run check:scores` | Check rhythm and alphaTex round trips in every score folder |
| `npm run build` | Check TypeScript and build the site with its offline cache |
| `npm run test:browser` | Exercise real input in muted desktop Chrome against a running server |

Browser checks require Chrome. Set `PREVIEW_URL` to the server URL; the script default is `http://127.0.0.1:5193`. See [verification methods and limits](docs/validation.md) for production and offline checks.

## 中文

吉他曲谱本用于在手机或桌面上阅读、编辑和练习六线谱。界面采用白色纸面布局，支持中文和英文。首次按浏览器语言选择，其他语言默认使用英文；之后记住语言设置。

### 本地运行

安装 Node.js 和 npm。Node.js 的兼容范围见 [package-lock.json](package-lock.json) 中的 `node_modules/vite` 条目。然后运行：

```sh
npm install
npm run dev
```

打开 Vite 输出的本地地址。构建并预览发布版：

```sh
npm run build
npm run preview
```

发布版联网访问并完成资源缓存后，可离线打开。添加到桌面取决于浏览器的安装支持。

### 阅读、编辑和练习

从曲库选择歌曲。在“编辑”中点选弦与拍点，然后通过数字键盘、品位输入框或电脑键盘输入品位。可以修改时值、附点、休止和延音，并撤销或重做。设置中提供小节复制和添加操作。

编辑时，未聚焦输入框或选择框的键盘操作如下：

| 按键 | 操作 |
| --- | --- |
| `0`–`9` | 输入品位；连续输入可组成两位品数 |
| 方向键 | 在弦与拍点之间移动 |
| `Delete` / `Backspace` | 删除选中的音符 |
| `Ctrl` / `Cmd` + `Z` | 撤销 |
| `Ctrl` / `Cmd` + `Shift` + `Z`，或 `Ctrl` / `Cmd` + `Y` | 重做 |

练习播放提供参考音、暂停、定位、调速和小节范围循环。编辑或切换歌曲会停止播放。

设置可调整语言、左右标签、弦线粗细、谱面大小、弦间距和节奏符号。音符上方的节奏符号默认隐藏。每行默认排 **8 拍**，通常为两个 4/4 小节；可选择 4、8、12 或 16 拍。排版保持小节完整，按拍号分子计算拍数。弦线连续相接，小节线两侧保留额外间距。窄屏会缩小品位数字；密集音符或较细的编辑网格可以横向滚动。

### 组织曲库

在 `scores/` 中保存 alphaTex 源谱和可选 SVG 预览：

```text
scores/
  beginner/
    twinkle-star/
      twinkle-star.atex
      twinkle-star.svg
    another-song.atex
    another-song.svg
  practice/
    song-bundle/
      notes.atex
      preview.svg
```

曲库按目录路径分组。含单个 `.atex` 和至少一个 SVG 的目录作为歌曲文件夹，归入上一级分组。曲名优先使用 `\title`，其次使用歌曲文件夹名或文件名。内置歌曲提供翻译后的显示名称；自定义曲名、目录名和用户文字保持原文。

SVG 优先与同名 alphaTex 配对。同目录只有一个 `.atex` 和一个 `.svg` 时，可以使用不同文件名；其他情况只匹配同名文件。未匹配 SVG 的歌曲仍可打开。“原谱预览”显示配对 SVG，编辑后的谱面由页面根据曲谱数据绘制。

开发服务器会读取源目录变化。发布版添加或移动文件后需要重新构建。源谱的保存标识使用相对路径，因此移动源文件会形成不同的曲库条目。参见[入门曲谱](scores/beginner/README.md)。

### 保存与交换曲谱

编辑结果和显示偏好保存在当前浏览器。“导出 alphaTex”下载单首曲谱，“备份曲库”将已保存的曲谱下载为 JSON。恢复备份先校验内容，再替换浏览器中的已保存曲库。显示偏好单独保存。

导入接受 alphaTex、普通 MusicXML 和受支持的 Guitar Pro 文件。外部曲谱需要符合单轨、单声部、六弦谱的支持范围。导入复杂曲谱前请阅读[格式说明](docs/format.md)。

### 检查项目

| 命令 | 用途 |
| --- | --- |
| `npm test` | 检查格式转换、编辑、保存、播放、多语言和整行排版 |
| `npm run check:scores` | 检查全部曲谱目录中的节奏和 alphaTex 往返 |
| `npm run build` | 检查 TypeScript，构建网站和离线缓存 |
| `npm run test:browser` | 对运行中的服务器使用静音桌面 Chrome 验证实际输入 |

浏览器检查需要安装 Chrome。通过 `PREVIEW_URL` 指定服务器地址，脚本默认使用 `http://127.0.0.1:5193`。发布版和离线检查见[验证方法与边界](docs/validation.md)。
