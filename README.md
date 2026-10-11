# Guitar Songbook

[简体中文](README.zh-CN.md)

Read, edit, and practise six-string guitar tablature on your phone or desktop.

**[Open the songbook](https://xhxiaiein.github.io/guitar-tabs/)**

- Edit frets and rhythms with touch or keyboard input, with undo and redo.
- Change BPM during playback while keeping your place, and loop a bar range for practice.
- Adjust score size, string spacing, and beats per row. The default is 8 beats.
- Use English or Chinese. The first visit follows your browser language, with English as the fallback.

Edits and settings stay in your browser. Export scores as alphaTex or back up your library as JSON. After an online visit completes asset caching, the production site can open offline.

## Run locally

Install Node.js and npm, then run:

```sh
npm ci
npm run dev
```

Open the address printed by Vite. To preview a production build, run `npm run build`, then `npm run preview`.

## Add scores

Place `.atex` files and optional SVG previews under `scores/`. Category folders group the library; song folders keep source and preview together.

```text
scores/
  beginner/
    song/
      song.atex
      song.svg
    another-song.atex
```

A folder with one `.atex` file and at least one SVG is a song bundle in its parent category. Matching filename stems take priority. Different names pair when the folder contains exactly one `.atex` and one `.svg`.

Rebuild the production site after adding or moving files. See the [beginner scores](scores/beginner/README.md) for examples.

## Development

```sh
npm test
npm run check:scores
npm run build
```

Pushes to `main` deploy to GitHub Pages. Further documentation is in Chinese: [formats and storage](docs/format.md), [verification](docs/validation.md), and [deployment](docs/deployment.md).
