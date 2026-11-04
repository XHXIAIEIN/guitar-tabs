// Display panel of the song page: what the score shows, string lines, size, theme and language.
import { config } from '../../../core/config.js';
import { currentLocale, t } from '../../../core/i18n.js';
import { h } from '../../../ui/dom.js';
import { segmented, stepper, toggle } from '../../../ui/controls.js';
import { openPanel } from '../../../ui/panel.js';
import { applyTheme } from '../../../ui/theme.js';
import { state, setSetting } from '../../../state/store.js';

function languageField() {
  const locales = Object.entries(config.i18n.locales);
  if (locales.length < 2) return null;
  return h('div', { class: 'field' }, h('label', null, t('display.language')),
    segmented(locales.map(([code, { name }]) => [code, name]), currentLocale(), (code) => {
      setSetting('locale', code);
      // Text is read once when each view renders, so a reload shows the new language everywhere.
      location.reload();
    }));
}

/** @param o perform, show: the toggles in use, saveShow(), refresh(): redraw info and score, renderScore(), setStage(on) */
export function openDisplayPanel({ perform, show, saveShow, refresh, renderScore, setStage }) {
  const { settings } = state;
  const { range, step } = config.song.zoom;
  const zoomKey = perform ? 'performZoom' : 'zoom';
  const showToggles = (items) => h('div', { class: 'toggle-grid' },
    ...items.map(([k, label]) =>
      toggle(label, show[k], (v) => {
        show[k] = v;
        saveShow();
        refresh();
      })),
  );
  const labelChoice = (side) => segmented([['none', t('common.none')], ['tab', 'TAB'], ['number', '123456'], ['name', 'EBGDAe']], settings.stringLabels[side], (v) => {
    setSetting('stringLabels', { ...settings.stringLabels, [side]: v });
    renderScore();
  });
  openPanel(t('song.display'), h('div', { class: 'stack' },
    showToggles([['chords', t('display.chords')], ['tab', t('display.tab')], ['lyrics', t('display.lyrics')]]),
    h('div', { class: 'stack' },
      h('div', { class: 'field-label' }, t('display.numbersGroup')),
      showToggles([['numbers', t('display.numbers')], ['rhythm', t('display.rhythm')]]),
    ),
    h('div', { class: 'stack' },
      h('div', { class: 'field-label' }, t('display.strings')),
      h('div', { class: 'field' }, h('label', null, t('display.left')), labelChoice('left')),
      h('div', { class: 'field' }, h('label', null, t('display.right')), labelChoice('right')),
      h('div', { class: 'field' }, h('label', null, t('display.width')),
        segmented([['uniform', t('display.widthUniform')], ['real', t('display.widthReal')]], settings.stringWidth, (v) => {
          setSetting('stringWidth', v);
          renderScore();
        })),
    ),
    h('div', { class: 'field' }, h('label', null, t('display.zoom')),
      stepper(Math.round(settings[zoomKey] * 100), { min: range[0], max: range[1], step, label: t('display.zoom'), format: (v) => `${v}%`, onchange: (v) => {
        setSetting(zoomKey, v / 100);
        renderScore();
      } })),
    perform
      ? toggle(t('display.stage'), settings.stage, (v) => {
          setSetting('stage', v);
          setStage(v);
          renderScore();
        })
      : h('div', { class: 'field' }, h('label', null, t('display.theme')),
          segmented([['auto', t('display.themeAuto')], ['light', t('display.themeLight')], ['dark', t('display.themeDark')]], settings.theme, (v) => {
            setSetting('theme', v);
            applyTheme();
            renderScore();
          })),
    languageField(),
    h('p', { class: 'hint' }, t('display.arrowHint')),
  ));
}
