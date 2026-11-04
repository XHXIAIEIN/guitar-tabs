// Gives a test process what the browser gets at boot: the configuration, the default language and a first-start state.
import { readFileSync } from 'node:fs';
import { setConfig } from '../../src/core/config.js';
import { setMessages } from '../../src/core/i18n.js';
import { initState } from '../../src/state/store.js';

export const ROOT = new URL('../../', import.meta.url);
export const readJsonFile = (path) => JSON.parse(readFileSync(new URL(path, ROOT), 'utf8'));

setConfig(readJsonFile('config/app.json'));
setMessages(readJsonFile('lang/zh_CN.json'));
initState();
