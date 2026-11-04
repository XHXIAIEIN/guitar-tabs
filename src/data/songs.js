// Built-in songs, written in the app's own text format. A song still under copyright holds only its chords and strums.
// An entry has either `text` or `versions`; the first version is the one a song opens with.

export const SONGS = [
  {
    id: 'mary-lamb',
    group: 'song',
    text: `title: 玛丽有只小羊羔
artist: 美国童谣
key: C
bpm: 80
time: 4/4
level: 入门
note: 只用 1、2 弦的空弦、1 品和 3 品。左手 {1} 按 1 品，{3} 按 3 品。

# 全曲
tab:   | q 1/0 2/3 2/1 2/3 | 1/0 1/0 h 1/0 | q 2/3 2/3 h 2/3 | q 1/0 1/3 h 1/3 |
lyric: | 玛丽有只 | 小羊羔 | 小羊羔 | 小羊羔 |
tab:   | q 1/0 2/3 2/1 2/3 | 1/0 1/0 1/0 1/0 | 2/3 2/3 1/0 2/3 | w 2/1 |
lyric: | 玛丽有只 | 小羊羔它 | 毛白得像 | 雪 |`,
  },
  {
    id: 'twinkle',
    group: 'song',
    versions: [
      {
        id: 'simple',
        text: `title: 小星星
artist: 法国民谣
key: C
bpm: 80
time: 4/4
level: 入门
note: 只用 1、2 弦。左手 {1} 按 1 品，{3} 按 3 品，{4} 按 5 品。先跟节拍器把每个音弹准，然后在「显示」里打开简谱边弹边唱唱名。

# 第一段
tab:   | q 2/1 2/1 1/3 1/3 | 1/5 1/5 h 1/3 | q 1/1 1/1 1/0 1/0 | 2/3 2/3 h 2/1 |
lyric: | 一闪一闪 | 亮晶晶 | 满天都是 | 小星星 |

# 第二段
tab:   | q 1/3 1/3 1/1 1/1 | 1/0 1/0 h 2/3 | q 1/3 1/3 1/1 1/1 | 1/0 1/0 h 2/3 |
lyric: | 挂在天上 | 放光明 | 好像许多 | 小眼睛 |

# 第三段
tab:   | q 2/1 2/1 1/3 1/3 | 1/5 1/5 h 1/3 | q 1/1 1/1 1/0 1/0 | 2/3 2/3 h 2/1 |
lyric: | 一闪一闪 | 亮晶晶 | 满天都是 | 小星星 |`,
      },
      {
        id: 'full',
        text: `title: 小星星
artist: 法国民谣
key: C
bpm: 90
time: 4/4
level: 入门
note: 只用 3、4、5 弦的前三品。先跟节拍器把每个音弹准，然后在「显示」里打开简谱边弹边唱唱名。

# 第一段
chord: | C | F . C . | F . C . | G . C . |
tab:   | q 5/3 5/3 3/0 3/0 | 3/2 3/2 h 3/0 | q 4/3 4/3 4/2 4/2 | 4/0 4/0 h 5/3 |
lyric: | 一闪一闪 | 亮晶晶 | 满天都是 | 小星星 |

# 第二段
chord: | C . F . | C . G . | C . F . | C . G . |
tab:   | q 3/0 3/0 4/3 4/3 | 4/2 4/2 h 4/0 | q 3/0 3/0 4/3 4/3 | 4/2 4/2 h 4/0 |
lyric: | 挂在天上 | 放光明 | 好像许多 | 小眼睛 |

# 第三段
chord: | C | F . C . | F . C . | G . C . |
tab:   | q 5/3 5/3 3/0 3/0 | 3/2 3/2 h 3/0 | q 4/3 4/3 4/2 4/2 | 4/0 4/0 h 5/3 |
lyric: | 一闪一闪 | 亮晶晶 | 满天都是 | 小星星 |`,
      },
    ],
  },
  {
    id: 'two-tigers',
    group: 'song',
    versions: [
      {
        id: 'simple',
        text: `title: 两只老虎
artist: 法国民谣
key: C
bpm: 80
time: 4/4
level: 入门
note: 旋律在 1、2 弦上，只有最后两小节的中间一个音是 3 弦空弦。第 5、6 小节是八分音符，一拍弹两个音。弹不稳时用小节循环单独练这两小节。

# 全曲
tab:   | q 2/1 2/3 1/0 2/1 | 2/1 2/3 1/0 2/1 | 1/0 1/1 h 1/3 | q 1/0 1/1 h 1/3 |
lyric: | 两只老虎 | 两只老虎 | 跑得快 | 跑得快 |
tab:   | e 1/3 1/5 1/3 1/1 q 1/0 2/1 | e 1/3 1/5 1/3 1/1 q 1/0 2/1 | q 2/1 3/0 h 2/1 | q 2/1 3/0 h 2/1 |
lyric: | 一只没有眼睛 | 一只没有尾巴 | 真奇怪 | 真奇怪 |`,
      },
      {
        id: 'full',
        text: `title: 两只老虎
artist: 法国民谣
key: C
bpm: 100
time: 4/4
level: 入门
note: 第 5、6 小节是八分音符，一拍弹两个音。弹不稳时用小节循环单独练这两小节。

# 全曲
chord: | C | C | C | C |
tab:   | q 5/3 4/0 4/2 5/3 | 5/3 4/0 4/2 5/3 | 4/2 4/3 h 3/0 | q 4/2 4/3 h 3/0 |
lyric: | 两只老虎 | 两只老虎 | 跑得快 | 跑得快 |
chord: | C | C | C G C . | C G C . |
tab:   | e 3/0 3/2 3/0 4/3 q 4/2 5/3 | e 3/0 3/2 3/0 4/3 q 4/2 5/3 | q 5/3 6/3 h 5/3 | q 5/3 6/3 h 5/3 |
lyric: | 一只没有眼睛 | 一只没有尾巴 | 真奇怪 | 真奇怪 |`,
      },
    ],
  },
  {
    id: 'ode-to-joy',
    group: 'song',
    versions: [
      {
        id: 'simple',
        text: `title: 欢乐颂
artist: 贝多芬
key: C
bpm: 80
time: 4/4
level: 入门
note: 旋律在 1、2 弦上，只有第 12 小节的最后一个音是 3 弦空弦。第 4、8 小节的附点四分音符占一拍半，数「1 嗒 2」再弹下一个音。

# A
tab: | q 1/0 1/0 1/1 1/3 | 1/3 1/1 1/0 2/3 | 2/1 2/1 2/3 1/0 | q. 1/0 e 2/3 h 2/3 |
tab: | q 1/0 1/0 1/1 1/3 | 1/3 1/1 1/0 2/3 | 2/1 2/1 2/3 1/0 | q. 2/3 e 2/1 h 2/1 |

# B
tab: | q 2/3 2/3 1/0 2/1 | 2/3 e 1/0 1/1 q 1/0 2/1 | 2/3 e 1/0 1/1 q 1/0 2/3 | 2/1 2/3 h 3/0 |
tab: | q 1/0 1/0 1/1 1/3 | 1/3 1/1 1/0 2/3 | 2/1 2/1 2/3 1/0 | q. 2/3 e 2/1 h 2/1 |`,
      },
      {
        id: 'full',
        text: `title: 欢乐颂
artist: 贝多芬
key: C
bpm: 100
time: 4/4
level: 入门
note: 旋律都在 1、2 弦上。第 4、8 小节的附点四分音符占一拍半，数「1 嗒 2」再弹下一个音。

# A
chord: | C | G | C | G |
tab: | q 1/0 1/0 1/1 1/3 | 1/3 1/1 1/0 2/3 | 2/1 2/1 2/3 1/0 | q. 1/0 e 2/3 h 2/3 |
chord: | C | G | C | G . C . |
tab: | q 1/0 1/0 1/1 1/3 | 1/3 1/1 1/0 2/3 | 2/1 2/1 2/3 1/0 | q. 2/3 e 2/1 h 2/1 |

# B
chord: | G . C . | G . C . | G . C G | C G . . |
tab: | q 2/3 2/3 1/0 2/1 | 2/3 e 1/0 1/1 q 1/0 2/1 | 2/3 e 1/0 1/1 q 1/0 2/3 | 2/1 2/3 h 3/0 |
chord: | C | G | C | G . C . |
tab: | q 1/0 1/0 1/1 1/3 | 1/3 1/1 1/0 2/3 | 2/1 2/1 2/3 1/0 | q. 2/3 e 2/1 h 2/1 |`,
      },
    ],
  },
  {
    id: 'happy-birthday',
    group: 'song',
    versions: [
      {
        id: 'simple',
        text: `title: 生日快乐
artist: 美国民歌
key: F
bpm: 90
time: 3/4
level: 入门
note: 3/4 拍，从第 3 拍弱起。只用 1、2 弦，最高到 1 弦 8 品，弹高音时手沿着弦移过去。「祝你」是两个八分音符，各占半拍。

# 全曲
tab:   | e 2/1 2/1 | q 2/3 2/1 1/1 | h 1/0 e 2/1 2/1 | q 2/3 2/1 1/3 | h 1/1 e 2/1 2/1 |
lyric: | 祝你 | 生日快 | 乐 祝你 | 生日快 | 乐 祝你 |
tab:   | q 1/8 1/5 1/1 | 1/0 2/3 e 1/6 1/6 | q 1/5 1/1 1/3 | h. 1/1 |
lyric: | 生日快 | 乐 _ 祝你 | 生日快 | 乐 |`,
      },
      {
        id: 'full',
        text: `title: 生日快乐
artist: 美国民歌
key: C
bpm: 100
time: 3/4
level: 入门
note: 3/4 拍，从第 3 拍弱起。「祝你」是附点八分 + 十六分，前长后短，像「祝——你」。

# 全曲
chord: | | C | G7 | G7 | C |
tab:   | e. 3/0 s 3/0 | q 3/2 3/0 2/1 | h 2/0 e. 3/0 s 3/0 | q 3/2 3/0 2/3 | h 2/1 e. 3/0 s 3/0 |
lyric: | 祝你 | 生日快 | 乐 祝你 | 生日快 | 乐 祝你 |
chord: | C | F | C . G7 | C |
tab:   | q 1/3 1/0 2/1 | 2/0 3/2 e. 1/1 s 1/1 | q 1/0 2/1 2/3 | h. 2/1 |
lyric: | 生日快 | 乐 _ 祝你 | 生日快 | 乐 |`,
      },
    ],
  },
  {
    id: 'farewell',
    group: 'song',
    versions: [
      {
        id: 'simple',
        text: `title: 送别
artist: 李叔同 词 · J. P. Ordway 曲
key: C
bpm: 72
time: 4/4
level: 入门
note: 只用 1、2 弦，最高到 1 弦 8 品，弹高音时手沿着弦移过去。第 5、7 小节的附点四分音符占一拍半。

# 第一段
tab:   | q 1/3 e 1/0 1/3 h 1/8 | q 1/5 1/8 h 1/3 | q 1/3 e 2/1 2/3 q 1/0 e 2/3 2/1 | w 2/3 |
lyric: | 长亭_外 | 古道边 | 芳草_碧连_ | 天 |
tab:   | q 1/3 e 1/0 1/3 q. 1/8 e 1/7 | q 1/5 1/8 h 1/3 | q 1/3 e 2/3 1/0 q. 1/1 e 2/0 | w 2/1 |
lyric: | 晚风_拂柳 | 笛声残 | 夕阳_山外 | 山 |`,
      },
      {
        id: 'full',
        text: `title: 送别
artist: 李叔同 词 · J. P. Ordway 曲
key: C
bpm: 72
time: 4/4
level: 进阶
note: 旋律在第一把位，注意第 5、7 小节的附点四分音符。熟练后可以只看和弦，用民谣节奏型弹唱。

# 第一段
chord: | C | F . C . | C | G |
tab:   | q 3/0 e 4/2 3/0 h 2/1 | q 3/2 2/1 h 3/0 | q 3/0 e 5/3 4/0 q 4/2 e 4/0 5/3 | w 4/0 |
lyric: | 长亭_外 | 古道边 | 芳草_碧连_ | 天 |
chord: | C | F . C . | G7 | C |
tab:   | q 3/0 e 4/2 3/0 q. 2/1 e 2/0 | q 3/2 2/1 h 3/0 | q 3/0 e 4/0 4/2 q. 4/3 e 5/2 | w 5/3 |
lyric: | 晚风_拂柳 | 笛声残 | 夕阳_山外 | 山 |`,
      },
    ],
  },
  {
    id: 'amazing-grace',
    group: 'song',
    text: `title: Amazing Grace
artist: John Newton 词 · 美国民歌
key: G
bpm: 84
time: 3/4
pickup: 1
strum: q D e D U D U
level: 进阶
note: 3/4 拍的华尔兹节奏「下 下上 下上」，每小节重复。从第 3 拍弱起，第一个字「A-」只占一拍。

# Verse
chord: | | G | G7 | C | G |
lyric: | A- | maz-ing | grace! How | sweet the | sound, That |
chord: | G | Em | D | D |
lyric: | saved a | wretch like | me! I | |
chord: | G | G7 | C | G |
lyric: | once was | lost, but | now am | found, Was |
chord: | Em | D | G | G |
lyric: | blind, but | now I | see. | |`,
  },
  {
    id: 'perfect',
    group: 'song',
    text: `title: Perfect
artist: Ed Sheeran · 和弦练习
key: G
bpm: 60
time: 4/4
level: 入门
note: 练 G、Em、C、D 四个和弦的循环，和「换和弦练习」里的 C – D – G – Em 是同一个循环。每个和弦一小节，每拍向下扫一次（↓）。换和弦时提前在第 4 拍准备，宁可最后一下扫空弦，也不要让节拍停下来。

# 每个和弦一小节
chord: | G | Em | C | D |
tab: | q D D D D | D D D D | D D D D | D D D D |
chord: | G | Em | C | D |
tab: | q D D D D | D D D D | D D D D | D D D D |`,
  },
];
