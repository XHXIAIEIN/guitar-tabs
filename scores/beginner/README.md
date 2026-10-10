# 吉他六线谱

每首曲谱包含可编辑的 `.atex` 文件和可查看、打印的 `.svg` 谱面。数字表示品位，`0` 表示空弦；六条线从上到下对应第 1 至第 6 弦。

| 曲名 | 可编辑曲谱 | 谱面 |
| --- | --- | --- |
| 欢乐颂 | [alphaTex](ode-to-joy/ode-to-joy.atex) | [六线谱](ode-to-joy/ode-to-joy.svg) |
| 小蜜蜂 | [alphaTex](little-bee/little-bee.atex) | [六线谱](little-bee/little-bee.svg) |
| 小星星 | [alphaTex](twinkle-star/twinkle-star.atex) | [六线谱](twinkle-star/twinkle-star.svg) |
| 两只老虎 | [alphaTex](two-tigers/two-tigers.atex) | [六线谱](two-tigers/two-tigers.svg) |

拍号为 4/4，标准调弦为 E4、B3、G3、D3、A2、E2。节奏符号位于六线谱上方；实心符头表示四分或八分音符，空心带符干表示二分音符，空心无符干表示全音符。

alphaTex 使用 `品位.弦号.时值`。例如 `3.2.4` 表示第 2 弦第 3 品的四分音符；时值 `1`、`2`、`4`、`8` 分别表示全、二分、四分、八分音符。每行一个小节，`|` 分隔小节。

文件中的每分钟 60 拍是练习速度。核对记录保存在本机忽略目录 `.local/tutorial-scores/source.json`。
