// Built-in exercises, written in the app's own text format. The first version is the one an entry opens with.

export const EXERCISES = [
  {
    id: 'ex-spider',
    group: 'exercise',
    versions: [
      {
        id: 'simple',
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
    group: 'exercise',
    versions: [
      {
        id: 'simple',
        text: `title: C 大调音阶（第一把位）
artist: 认识音名与唱名
key: C
bpm: 60
time: 4/4
level: 入门
note: 只练前五个音：2 弦 1 品是 1（do），1 弦 3 品是 5（sol）。在「显示」里打开简谱对照，边弹边唱出唱名。

# 上行与下行
tab: | q 2/1 2/3 1/0 1/1 | h 1/3 q 1/1 1/0 | h 2/3 2/1 |`,
      },
      {
        id: 'full',
        text: `title: C 大调音阶（第一把位）
artist: 认识音名与唱名
key: C
bpm: 70
time: 4/4
level: 入门
note: 在「显示」里打开简谱对照：5 弦 3 品是 1（do），2 弦 1 品是高音 1̇。边弹边唱出唱名，记住每个音在指板上的位置。

# 上行与下行
chord: | | | | C |
tab: | e 5/3 4/0 4/2 4/3 3/0 3/2 2/0 2/1 | 2/3 1/0 1/1 1/3 1/1 1/0 2/3 2/1 | 2/0 3/2 3/0 4/3 4/2 4/0 q 5/3 | w 5/3+4/2+3/0+2/1+1/0 |`,
      },
    ],
  },
  {
    id: 'ex-strum-quarter',
    group: 'exercise',
    versions: [
      {
        id: 'simple',
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
    group: 'exercise',
    versions: [
      {
        id: 'simple',
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
    group: 'exercise',
    versions: [
      {
        id: 'simple',
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
    group: 'exercise',
    versions: [
      {
        id: 'simple',
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
    group: 'exercise',
    versions: [
      {
        id: 'simple',
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
];
