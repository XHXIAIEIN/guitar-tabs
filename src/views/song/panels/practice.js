// Practice settings panel of the song page: count-in, volumes and the speed trainer.
import { config } from '../../../core/config.js';
import { t } from '../../../core/i18n.js';
import { h, fill } from '../../../ui/dom.js';
import { segmented, stepper, toggle } from '../../../ui/controls.js';
import { openPanel } from '../../../ui/panel.js';
import { toast } from '../../../ui/toast.js';
import { state, setSetting } from '../../../state/store.js';
import { setVolume } from '../../../audio/context.js';

/** @param o prefs, savePrefs(), restartIfPlaying() */
export function openPracticePanel({ prefs, savePrefs, restartIfPlaying }) {
  const { settings } = state;
  const { trainer } = prefs;
  const limits = config.song.trainer;
  const trainerBox = h('div', { class: 'stack' });
  const renderTrainer = () => {
    fill(trainerBox,
      toggle(t('trainer.toggle'), trainer.on, (v) => {
        trainer.on = v;
        savePrefs();
        renderTrainer();
        if (v && !prefs.loop) toast(t('trainer.needLoop'));
        restartIfPlaying();
      }),
      trainer.on
        ? h('div', { class: 'row wrap gap-m' },
            h('label', { class: 'field-inline' }, t('trainer.perRound'), stepper(trainer.step, { min: limits.stepRange[0], max: limits.stepRange[1], label: t('trainer.perRoundLabel'), format: (v) => `+${v}`, onchange: (v) => { trainer.step = v; savePrefs(); } })),
            h('label', { class: 'field-inline' }, t('trainer.max'), stepper(trainer.max, { min: limits.maxRange[0], max: limits.maxRange[1], step: limits.maxStep, label: t('trainer.maxLabel'), onchange: (v) => { trainer.max = v; savePrefs(); } })))
        : null,
    );
  };
  renderTrainer();
  const volume = (key, kind) => h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: settings[key], 'aria-label': kind, oninput: (e) => { setSetting(key, +e.target.value); setVolume(kind, +e.target.value); } });
  const countIn = config.song.countInOptions.map((n) => [n, n ? t('practice.countInBars', { n }) : t('common.none')]);
  const jumpCountIn = config.song.jumpCountInOptions.map((n) => [n, n ? t('practice.jumpCountInBeats', { n }) : t('common.none')]);
  openPanel(t('song.practice'), h('div', { class: 'stack' },
    h('div', { class: 'field' }, h('label', null, t('practice.countIn')), segmented(countIn, settings.countIn, (v) => setSetting('countIn', v))),
    h('div', { class: 'field' }, h('label', null, t('practice.jumpCountIn')), segmented(jumpCountIn, settings.jumpCountIn, (v) => setSetting('jumpCountIn', v))),
    h('div', { class: 'field' }, h('label', null, t('practice.volMetronome')), volume('volMetronome', 'metronome')),
    h('div', { class: 'field' }, h('label', null, t('practice.volGuitar')), volume('volGuitar', 'guitar')),
    trainerBox,
    h('p', { class: 'hint' }, t('practice.shortcuts')),
  ));
}
