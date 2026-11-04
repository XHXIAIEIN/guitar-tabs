// Tools: a standalone metronome and a microphone tuner with reference tones.
import { t } from '../../core/i18n.js';
import { h } from '../../ui/dom.js';
import { segmented } from '../../ui/controls.js';
import { metronomeTool } from './metronome.js';
import { tunerTool } from './tuner.js';

export function toolsView(root, tab = 'metronome') {
  const body = h('div');
  let cleanup = () => {};
  const show = (name) => {
    cleanup();
    body.replaceChildren();
    history.replaceState(null, '', `#/tools/${name}`);
    cleanup = (name === 'tuner' ? tunerTool : metronomeTool)(body);
  };
  root.append(
    h('div', { class: 'page' },
      h('header', { class: 'page-head' }, h('h1', null, t('nav.tools')), segmented([['metronome', t('common.metronome')], ['tuner', t('tools.tuner')]], tab, show)),
      body,
    ),
  );
  show(tab);
  return () => cleanup();
}
