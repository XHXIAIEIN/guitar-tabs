// Gives a test process what the browser gets at boot: the configuration, the default language, a first-start state and the built-in scores.
import { readFileSync } from 'node:fs';
import { setConfig } from '../../src/core/config.js';
import { setMessages } from '../../src/core/i18n.js';
import { loadScores } from '../../src/state/songs.js';
import { initState } from '../../src/state/store.js';

export const ROOT = new URL('../../', import.meta.url);
const readTextFile = (path) => readFileSync(new URL(path, ROOT), 'utf8');
export const readJsonFile = (path) => JSON.parse(readTextFile(path));

setConfig(readJsonFile('src/config.json'));
setMessages(readJsonFile('src/lang/zh_CN.json'));
initState();
await loadScores(readJsonFile, readTextFile);
