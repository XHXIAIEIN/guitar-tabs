// Built-in exercises and public-domain songs, written in the app's own text format.
// An entry has either `text` or `versions`; the first version is the one a song opens with.

export const BUILTIN = [
  {
    id: 'ex-spider',
    group: '练习',
    versions: [
      {
        id: 'simple',
        name: '简单版',
        text: `title: 爬格子 1-2-3-4
artist: 左手基本功
key: C
bpm: 60
time: 4/4
level: 入门
note: 只用 1、2 弦，每个音一拍。食指按 1 品，中指按 2 品，无名指按 3 品，小指按 4 品。按下一个音时，前面的手指先别抬起。

# 从 2 弦到 1 弦
tab: | q 2/1 2/2 2/3 2/4 | 1/1 1/2 1/3 1/4 |

# 从 1 弦回到 2 弦
tab: | q 1/4 1/3 1/2 1/1 | 2/4 2/3 2/2 2/1 |`,
      },
      {
        id: 'full',
        name: '完整版',
        text: `title: 爬格子 1-2-3-4
artist: 左手基本功
key: C
bpm: 60
time: 4/4
level: 入门
note: 每个手指负责一个品：食指 1 品、中指 2 品、无名指 3 品、小指 4 品。按下一个音时，前面的手指先别抬起。先用 60 BPM 弹干净，再每次加 5 BPM。

# 从 6 弦到 1 弦
tab: | e 6/1 6/2 6/3 6/4 5/1 5/2 5/3 5/4 | 4/1 4/2 4/3 4/4 3/1 3/2 3/3 3/4 | 2/1 2/2 2/3 2/4 1/1 1/2 1/3 1/4 |

# 从 1 弦回到 6 弦
tab: | e 1/4 1/3 1/2 1/1 2/4 2/3 2/2 2/1 | 3/4 3/3 3/2 3/1 4/4 4/3 4/2 4/1 | 5/4 5/3 5/2 5/1 6/4 6/3 6/2 6/1 |`,
      },
    ],
  },
  {
    id: 'ex-c-scale',
    group: '练习',
    versions: [
      {
        id: 'simple',
        name: '简单版',
        text: `title: C 大调音阶（第一把位）
artist: 认识音名与唱名
key: C
bpm: 60
time: 4/4
level: 入门
note: 只练前五个音：2 弦 1 品是 1（do），1 弦 3 品是 5（sol）。打开简谱对照，边弹边唱出唱名。

# 上行与下行
tab: | q 2/1 2/3 1/0 1/1 | h 1/3 q 1/1 1/0 | h 2/3 2/1 |`,
      },
      {
        id: 'full',
        name: '完整版',
        text: `title: C 大调音阶（第一把位）
artist: 认识音名与唱名
key: C
bpm: 70
time: 4/4
level: 入门
note: 打开简谱对照：5 弦 3 品是 1（do），2 弦 1 品是高音 1̇。边弹边唱出唱名，记住每个音在指板上的位置。

# 上行与下行
chord: | | | | C |
tab: | e 5/3 4/0 4/2 4/3 3/0 3/2 2/0 2/1 | 2/3 1/0 1/1 1/3 1/1 1/0 2/3 2/1 | 2/0 3/2 3/0 4/3 4/2 4/0 q 5/3 | w 5/3+4/2+3/0+2/1+1/0 |`,
      },
    ],
  },
  {
    id: 'ex-strum-quarter',
    group: '练习',
    versions: [
      {
        id: 'simple',
        name: '简单版',
        text: `title: 四分音符扫弦
artist: 换和弦入门
key: Am
bpm: 60
time: 4/4
level: 入门
note: 每拍向下扫一次（↓）。只用 Em 和 Am，每个和弦弹两小节。换和弦时提前在第 4 拍准备，宁可最后一下扫空弦，也不要让节拍停下来。

# 每个和弦两小节
chord: | Em | Em | Am | Am |
tab: | q D D D D | D D D D | D D D D | D D D D |
chord: | Em | Em | Am | Am |
tab: | q D D D D | D D D D | D D D D | D D D D |`,
      },
      {
        id: 'full',
        name: '完整版',
        text: `title: 四分音符扫弦
artist: 换和弦入门
key: G
bpm: 70
time: 4/4
level: 入门
note: 每拍向下扫一次（↓）。换和弦时提前在第 4 拍准备，宁可最后一下扫空弦，也不要让节拍停下来。

# 每个和弦一小节
chord: | G | D | Em | C |
tab: | q D D D D | D D D D | D D D D | D D D D |
chord: | G | D | Em | C |
tab: | q D D D D | D D D D | D D D D | D D D D |`,
      },
    ],
  },
  {
    id: 'ex-strum-eighth',
    group: '练习',
    versions: [
      {
        id: 'simple',
        name: '简单版',
        text: `title: 八分音符下上扫
artist: 稳定的手腕摆动
key: Am
bpm: 60
time: 4/4
level: 入门
note: 只用 Em 和 Am，每个和弦弹两小节。手腕像钟摆一样一直上下摆动：数「1 嗒 2 嗒」，数字时向下（↓），「嗒」时向上（↑）。上扫只需要扫到高音的 3～4 根弦。

# 每个和弦两小节
chord: | Em | Em | Am | Am |
tab: | e D U D U D U D U | D U D U D U D U | D U D U D U D U | D U D U D U D U |
chord: | Em | Em | Am | Am |
tab: | e D U D U D U D U | D U D U D U D U | D U D U D U D U | D U D U D U D U |`,
      },
      {
        id: 'full',
        name: '完整版',
        text: `title: 八分音符下上扫
artist: 稳定的手腕摆动
key: C
bpm: 70
time: 4/4
level: 入门
note: 手腕像钟摆一样一直上下摆动：数「1 嗒 2 嗒」，数字时向下（↓），「嗒」时向上（↑）。上扫只需要扫到高音的 3～4 根弦。

# 一个和弦一小节
chord: | C | Am | Dm | G |
tab: | e D U D U D U D U | D U D U D U D U | D U D U D U D U | D U D U D U D U |
chord: | C | Am | Dm | G |
tab: | e D U D U D U D U | D U D U D U D U | D U D U D U D U | D U D U D U D U |`,
      },
    ],
  },
  {
    id: 'ex-folk-strum',
    group: '练习',
    versions: [
      {
        id: 'simple',
        name: '简单版',
        text: `title: 民谣节奏型 下 下上 上下上
artist: 弹唱最常用的节奏型
key: Am
bpm: 60
time: 4/4
strum: q D e D U r U D U
level: 入门
note: 节奏型写在开头，每小节重复。只用 Em 和 Am，每个和弦弹两小节。第 3 拍的下扫是「空拍」：手照常向下摆，但不碰弦。

# 每个和弦两小节
chord: | Em | Em | Am | Am |
chord: | Em | Em | Am | Am |`,
      },
      {
        id: 'full',
        name: '完整版',
        text: `title: 民谣节奏型 下 下上 上下上
artist: 弹唱最常用的节奏型
key: C
bpm: 76
time: 4/4
strum: q D e D U r U D U
level: 进阶
note: 节奏型写在开头，每小节重复。第 3 拍的下扫是「空拍」：手照常向下摆，但不碰弦。熟练后把 Fmaj7 换成横按 F。

# 1–6–4–5
chord: | C | Am | Fmaj7 | G |
chord: | C | Am | Fmaj7 | G |`,
      },
    ],
  },
  {
    id: 'ex-arpeggio',
    group: '练习',
    versions: [
      {
        id: 'simple',
        name: '简单版',
        text: `title: 分解和弦
artist: 右手 p i m a
key: Am
bpm: 60
time: 4/4
level: 入门
note: 每拍弹一个音。拇指（p）弹低音弦，食指（i）、中指（m）、无名指（a）分别弹 3、2、1 弦。Em 这两小节弹到的都是空弦，可以先不按左手，把右手练稳。

# 每个和弦两小节
chord: | Em | Em | Am | Am |
tab: | q 6/0 3/0 2/0 1/0 | 6/0 3/0 2/0 1/0 | 5/0 3/2 2/1 1/0 | 5/0 3/2 2/1 1/0 |
chord: | Em | Em | Am | Am |
tab: | q 6/0 3/0 2/0 1/0 | 6/0 3/0 2/0 1/0 | 5/0 3/2 2/1 1/0 | w 5/0+3/2+2/1+1/0 |`,
      },
      {
        id: 'full',
        name: '完整版',
        text: `title: 分解和弦
artist: 右手 p i m a
key: C
bpm: 72
time: 4/4
level: 进阶
note: 拇指（p）弹低音弦，食指（i）、中指（m）、无名指（a）分别负责 3、2、1 弦。左手按住整个和弦再弹，让每个音都延续下去。

# 每个和弦一小节
chord: | C | Am | Dm | G |
tab: | e 5/3 3/0 2/1 3/0 1/0 3/0 2/1 3/0 | 5/0 3/2 2/1 3/2 1/0 3/2 2/1 3/2 | 4/0 3/2 2/3 3/2 1/1 3/2 2/3 3/2 | 6/3 3/0 2/0 3/0 1/3 3/0 2/0 3/0 |
chord: | C |
tab: | w 5/3+3/0+2/1+1/0 |`,
      },
    ],
  },
  {
    id: 'ex-arpeggio-68',
    group: '练习',
    versions: [
      {
        id: 'simple',
        name: '简单版',
        text: `title: 6/8 拍分解和弦
artist: 小调的抒情律动
key: Am
bpm: 90
time: 6/8
level: 入门
note: 6/8 拍每小节 6 个八分音符，重音在第 1 和第 4 下。只用 Am 和 Em，每个和弦弹两小节。速度 90 指每分钟 90 个八分音符。

# 每个和弦两小节
chord: | Am | Am | Em | Em |
tab: | e 5/0 3/2 2/1 1/0 2/1 3/2 | 5/0 3/2 2/1 1/0 2/1 3/2 | 6/0 3/0 2/0 1/0 2/0 3/0 | 6/0 3/0 2/0 1/0 2/0 3/0 |
chord: | Am | Am | Em | Am |
tab: | e 5/0 3/2 2/1 1/0 2/1 3/2 | 5/0 3/2 2/1 1/0 2/1 3/2 | 6/0 3/0 2/0 1/0 2/0 3/0 | q. 5/0+3/2+2/1+1/0 r |`,
      },
      {
        id: 'full',
        name: '完整版',
        text: `title: 6/8 拍分解和弦
artist: 小调的抒情律动
key: Am
bpm: 120
time: 6/8
level: 进阶
note: 6/8 拍每小节 6 个八分音符，重音在第 1 和第 4 下。速度 120 指每分钟 120 个八分音符。

# 小调进行
chord: | Am | C | Dm | E |
tab: | e 5/0 3/2 2/1 1/0 2/1 3/2 | 5/3 3/0 2/1 1/0 2/1 3/0 | 4/0 3/2 2/3 1/1 2/3 3/2 | 6/0 3/1 2/0 1/0 2/0 3/1 |
chord: | Am | F | E | Am |
tab: | e 5/0 3/2 2/1 1/0 2/1 3/2 | 4/3 3/2 2/1 1/1 2/1 3/2 | 6/0 3/1 2/0 1/0 2/0 3/1 | q. 5/0+3/2+2/1+1/0 r |`,
      },
    ],
  },
  {
    id: 'mary-lamb',
    group: '歌曲',
    text: `title: 玛丽有只小羊羔
artist: 美国童谣
key: C
bpm: 80
time: 4/4
level: 入门
note: 只用 1、2 弦的空弦、1 品和 3 品。1 品用食指，3 品用无名指。

# 全曲
tab:   | q 1/0 2/3 2/1 2/3 | 1/0 1/0 h 1/0 | q 2/3 2/3 h 2/3 | q 1/0 1/3 h 1/3 |
lyric: | 玛丽有只 | 小羊羔 | 小羊羔 | 小羊羔 |
tab:   | q 1/0 2/3 2/1 2/3 | 1/0 1/0 1/0 1/0 | 2/3 2/3 1/0 2/3 | w 2/1 |
lyric: | 玛丽有只 | 小羊羔它 | 毛白得像 | 雪 |`,
  },
  {
    id: 'twinkle',
    group: '歌曲',
    versions: [
      {
        id: 'simple',
        name: '简单版',
        text: `title: 小星星
artist: 法国民谣
key: C
bpm: 80
time: 4/4
level: 入门
note: 只用 1、2 弦。1 品用食指，3 品用无名指，5 品用小指。先跟节拍器把每个音弹准，再打开简谱边弹边唱唱名。

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
        name: '完整版',
        text: `title: 小星星
artist: 法国民谣
key: C
bpm: 90
time: 4/4
level: 入门
note: 只用 3、4、5 弦的前三品。先跟节拍器把每个音弹准，再打开简谱边弹边唱唱名。

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
    group: '歌曲',
    versions: [
      {
        id: 'simple',
        name: '简单版',
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
        name: '完整版',
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
    group: '歌曲',
    versions: [
      {
        id: 'simple',
        name: '简单版',
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
        name: '完整版',
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
    group: '歌曲',
    versions: [
      {
        id: 'simple',
        name: '简单版',
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
        name: '完整版',
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
    group: '歌曲',
    versions: [
      {
        id: 'simple',
        name: '简单版',
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
        name: '完整版',
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
    group: '歌曲',
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
];
