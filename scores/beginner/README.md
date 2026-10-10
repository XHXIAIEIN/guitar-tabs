# Beginner scores · 入门曲谱

Each song folder contains an editable alphaTex source and an SVG score for viewing or printing. The app groups these songs under `beginner`.

每个歌曲文件夹包含可编辑的 alphaTex 源谱，以及用于查看或打印的 SVG 谱面。应用将这些歌曲归入 `beginner` 分组。

| Song · 曲名 | alphaTex | SVG |
| --- | --- | --- |
| Ode to Joy · 欢乐颂 | [Source · 源谱](ode-to-joy/ode-to-joy.atex) | [Score · 谱面](ode-to-joy/ode-to-joy.svg) |
| Little Bee · 小蜜蜂 | [Source · 源谱](little-bee/little-bee.atex) | [Score · 谱面](little-bee/little-bee.svg) |
| Twinkle, Twinkle, Little Star · 小星星 | [Source · 源谱](twinkle-star/twinkle-star.atex) | [Score · 谱面](twinkle-star/twinkle-star.svg) |
| Frère Jacques · 两只老虎 | [Source · 源谱](two-tigers/two-tigers.atex) | [Score · 谱面](two-tigers/two-tigers.svg) |

## Reading the scores

Numbers show frets; `0` means an open string. The six lines run from string 1 at the top to string 6 at the bottom. These scores use 4/4, a practice tempo of 60 BPM, and standard tuning: E4, B3, G3, D3, A2, E2.

The SVGs include rhythm symbols above the staff. Filled noteheads indicate quarter or eighth notes, hollow heads with stems indicate half notes, and hollow heads without stems indicate whole notes. The app hides rhythm symbols above notes by default; enable **Rhythm symbols** in Settings to show them in the editable score.

alphaTex uses `fret.string.duration`. For example, `3.2.4` means a quarter note on string 2, fret 3. Durations `1`, `2`, `4`, and `8` mean whole, half, quarter, and eighth notes. Source lines contain complete bars separated by `|`; the app controls display rows independently.

## 读谱说明

数字表示品位，`0` 表示空弦。六条线从上到下对应第 1 至第 6 弦。这些曲谱使用 4/4 拍、每分钟 60 拍的练习速度，以及标准调弦 E4、B3、G3、D3、A2、E2。

SVG 的节奏符号位于弦线上方。实心符头表示四分或八分音符，空心带符干表示二分音符，空心无符干表示全音符。应用默认隐藏音符上方的节奏符号；在设置中打开“显示节奏符号”即可在编辑谱面中显示。

alphaTex 使用 `品位.弦号.时值`。例如 `3.2.4` 表示第 2 弦第 3 品的四分音符。时值 `1`、`2`、`4`、`8` 分别表示全、二分、四分、八分音符。源文件按完整小节书写，以 `|` 分隔；应用独立控制每行的显示拍数。

[App guide · 使用说明](../../README.md) · [Format limits · 格式范围](../../docs/format.md)
