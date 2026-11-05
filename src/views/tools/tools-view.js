// Tools: a standalone metronome and a microphone tuner with reference tones.
import { t } from '../../core/i18n.js';
import { h } from '../../ui/dom.js';
import { segmented } from '../../ui/controls.js';
import { metronomeTool } from './metronome.js';
import { tunerTool } from './tuner.js';

export function toolsView(root, tab = 'metronome') {
  const body = h('div', { class: 'practice-grid' });
  let cleanup = () => {};
  const show = (name) => {
    cleanup();
    body.replaceChildren();
    history.replaceState(null, '', `#/tools/${name}`);
    cleanup = (name === 'tuner' ? tunerTool : metronomeTool)(body);
  };
  const page = h('div', { class: 'page practice' },
    h('header', { class: 'page-head' }, h('h1', null, t('nav.tools')), segmented([['metronome', t('common.metronome')], ['tuner', t('tools.tuner')]], tab, show)),
    body,
  );
  root.append(page);
  show(tab);
  return () => cleanup();
}
