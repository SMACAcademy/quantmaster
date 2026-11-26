/** Settings, data export/import, and a deliberately careful reset flow. */

import { el } from '../utils/dom.js';
import { icon } from '../utils/icons.js';
import { DATA_VERSION, SCHEMA_VERSION } from '../app/config.js';
import { getSettings, updateSettings } from '../app/state.js';
import { emit, EVENTS } from '../app/eventBus.js';
import { navigate } from '../app/router.js';
import { button, sectionHead, segmented, settingRow, switchControl } from '../components/ui.js';
import { confirmDialog, openModal } from '../components/Modal.js';
import {
  exportProgress,
  importProgress,
  resetProgress,
  storageIsPersistent,
  getUserProgress
} from '../repositories/progressRepository.js';
import { authoredQuestionCount, loadDataset } from '../data/index.js';
import { installAvailable, startInstall } from '../components/InstallPrompt.js';
import { isStandalone } from '../pwa/pwa.js';
import { ensureGenerators, templateSummary } from '../generators/gate.js';
import { ensureMistakeContent } from '../services/contentGate.js';
import { disableReminders, enableReminders, notificationPermission, remindersSupported } from '../services/reminders.js';

const SYNC_STATUS_LABEL = {
  idle: 'Not synced yet',
  syncing: 'Syncing…',
  synced: 'Up to date',
  offline: 'Offline — will sync when back online',
  error: 'Sync failed — will retry',
  disabled: 'Not signed in'
};

/** Daily reminder: a switch, a time, and an honest note about where it works. */
function reminderSection(settings) {
  const supported = remindersSupported();
  const note = el('div.setting-row__desc');
  const describe = () => {
    const permission = notificationPermission();
    note.textContent = !supported
      ? 'This browser cannot show notifications.'
      : permission === 'denied'
        ? 'Notifications are blocked for this site. Allow them in your browser settings, then switch this on.'
        : 'Shows a notification at this time if you have not practised yet today. It appears while QuantMaster is open in a tab, and on Android when the app is installed, even when closed.';
  };
  describe();

  const toggle = switchControl({
    checked: Boolean(settings.reminderEnabled) && notificationPermission() === 'granted',
    label: 'Daily reminder',
    onChange: async (value) => {
      if (!value) {
        disableReminders();
        return;
      }
      const permission = await enableReminders();
      if (permission !== 'granted') {
        toggle.setAttribute('aria-checked', 'false');
        emit(EVENTS.toast, {
          title: permission === 'unsupported' ? 'Notifications are not supported here' : 'Notifications were not allowed',
          body: permission === 'denied' ? 'You can allow them for this site in your browser settings.' : undefined,
          variant: 'warning'
        });
      }
      describe();
    }
  });
  if (!supported) toggle.disabled = true;

  const time = el('input.input', {
    type: 'time',
    value: settings.reminderTime,
    'aria-label': 'Reminder time',
    on: {
      change: (event) => {
        if (event.target.value) updateSettings({ reminderTime: event.target.value });
      }
    }
  });
  if (!supported) time.disabled = true;

  // Signing in or out changes how the reminder is delivered, and so what the note says.
  const section = el('section.section', {}, [
    sectionHead('Reminders'),
    el('div.card', {}, [
      el('div.setting-row', {}, [
        el('div.setting-row__body', {}, [el('div.setting-row__title', { text: 'Daily practice reminder' }), note]),
        toggle
      ]),
      settingRow({
        title: 'Reminder time',
        description: "Uses this device's clock.",
        control: time
      })
    ])
  ]);
  return { section, describe };
}

export async function SettingsView() {
  // Only the generator count needs anything loaded; question totals come from the
  // catalogue, so Settings never waits for topic packs.
  await ensureGenerators().catch(() => {});
  const settings = getSettings();
  const dataset = loadDataset();
  const progress = getUserProgress();

  const reminders = reminderSection(settings);

  const root = el('div', {}, [
    el('div.page-head', {}, [
      el('div.page-head__text', {}, [
        el('h1', { text: 'Settings' }),
        el('p', {
          text: 'Everything is stored on this device. No account, no server.'
        })
      ])
    ]),

    el('section.section', {}, [
      sectionHead('Appearance'),
      el('div.card', {}, [
        settingRow({
          title: 'Theme',
          description: 'System follows your device setting.',
          control: segmented(
            [
              { id: 'system', label: 'System' },
              { id: 'light', label: 'Light' },
              { id: 'dark', label: 'Dark' }
            ],
            settings.theme,
            (id) => updateSettings({ theme: id })
          )
        }),
        settingRow({
          title: 'Animations',
          description: 'Reduced keeps transitions minimal. Your OS reduce-motion setting is always respected.',
          control: segmented(
            [
              { id: 'full', label: 'Full' },
              { id: 'reduced', label: 'Reduced' }
            ],
            settings.motion,
            (id) => updateSettings({ motion: id })
          )
        }),
        settingRow({
          title: 'Keyboard hints',
          description: 'Show shortcut hints under flashcards and questions.',
          control: switchControl({
            checked: settings.showKeyboardHints,
            label: 'Keyboard hints',
            onChange: (value) => updateSettings({ showKeyboardHints: value })
          })
        })
      ])
    ]),

    el('section.section', {}, [
      sectionHead('Practice'),
      el('div.card', {}, [
        settingRow({
          title: 'Timer in learning modes',
          description: 'Off by default. When on, practice questions get 90 seconds each. Exam mode is always timed.',
          control: switchControl({
            checked: settings.timerInLearnMode,
            label: 'Timer in learning modes',
            onChange: (value) => updateSettings({ timerInLearnMode: value })
          })
        }),
        settingRow({
          title: 'Exam timer',
          description: 'Seconds allowed per question in exam simulations.',
          control: segmented(
            [
              { id: '45', label: '45s' },
              { id: '60', label: '60s' },
              { id: '90', label: '90s' }
            ],
            String(settings.examTimerSeconds),
            (id) => updateSettings({ examTimerSeconds: Number(id) })
          )
        }),
        settingRow({
          title: 'Daily goal',
          description: 'Questions per day. Used for the dashboard only — missing it is not punished.',
          control: segmented(
            [
              { id: '10', label: '10' },
              { id: '20', label: '20' },
              { id: '40', label: '40' }
            ],
            String(settings.dailyGoalQuestions),
            (id) => updateSettings({ dailyGoalQuestions: Number(id) })
          )
        }),
        settingRow({
          title: 'Confirm before leaving a session',
          description: 'Asks before you exit a session in progress.',
          control: switchControl({
            checked: settings.confirmBeforeExit,
            label: 'Confirm before leaving a session',
            onChange: (value) => updateSettings({ confirmBeforeExit: value })
          })
        })
      ])
    ]),

    reminders.section,

    el('section.section', {}, [
      sectionHead('App'),
      el('div.card', {}, [
        settingRow({
          title: 'Install QuantMaster',
          description: isStandalone()
            ? 'Installed — you are using the home-screen app.'
            : installAvailable()
              ? 'Add it to your home screen or desktop. Opens full-screen and works offline.'
              : 'Your browser has not offered installation yet. In Chrome or Edge use the install icon in the address bar; on iPhone use Share → Add to Home Screen.',
          control:
            !isStandalone() && installAvailable()
              ? button('Install', { variant: 'soft', iconName: 'download', onClick: startInstall })
              : el('span.text-sm.text-subtle', { text: isStandalone() ? 'Installed' : '' })
        }),
        settingRow({
          title: 'Offline use',
          description:
            'After your first visit, everything — lessons, questions, progress — works without an internet connection.',
          control: el('span.badge.badge--success', { text: 'navigator' in window && 'serviceWorker' in navigator ? 'Supported' : 'Unavailable' })
        })
      ])
    ]),

    el('section.section', {}, [
      sectionHead('Your data'),
      el('div.card', {}, [
        settingRow({
          title: 'Export progress',
          description: 'Download everything as JSON — useful as a backup or to move devices.',
          control: button('Export', { variant: 'soft', iconName: 'download', onClick: doExport })
        }),
        settingRow({
          title: 'Import progress',
          description: 'Restore from a previously exported file. This replaces current progress.',
          control: button('Import', { variant: 'soft', iconName: 'upload', onClick: doImport })
        }),
        settingRow({
          title: 'Reset all progress',
          description:
            'Permanently deletes your XP, streak, mastery, mistakes and history on this device. Content is unaffected. This cannot be undone.',
          control: button('Reset', { variant: 'danger', iconName: 'trash', onClick: doReset })
        })
      ])
    ]),

    el('section.section', {}, [
      sectionHead('About'),
      el('div.card.stack', {}, [
        aboutRow('Content version', dataset.version || DATA_VERSION),
        aboutRow('Progress schema', `v${SCHEMA_VERSION}`),
        aboutRow('Topics in catalogue', String(dataset.topics.length)),
        aboutRow('Authored questions', String(authoredQuestionCount())),
        aboutRow(
          'Question generators',
          `${templateSummary().templates} across ${templateSummary().topics} topics`
        ),
        aboutRow('Formula cards', String(dataset.formulas.length)),
        aboutRow(
          'Storage',
          storageIsPersistent() ? 'Saved on this device' : 'Session only (storage blocked)'
        ),
        aboutRow('Learning since', new Date(progress.createdAt).toLocaleDateString()),
        el('a.text-sm', { href: '#/privacy', text: 'Privacy: what is stored and how to delete it' }),
        el('p.text-xs.text-subtle', {
          style: { marginTop: '8px' },
          text: 'Mastery percentages are learning indicators derived from your own answers. They are useful for choosing what to practise next, not a formal assessment.'
        })
      ])
    ])
  ]);

  return {
    element: root,
    title: 'Settings'
  };
}

function aboutRow(label, value) {
  return el('div.row', {}, [
    el('span.text-sm.text-muted', { style: { flex: 1 }, text: label }),
    el('span.text-sm.font-bold', { text: value })
  ]);
}

function doExport() {
  const payload = exportProgress();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `quantmaster-progress-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  emit(EVENTS.toast, { title: 'Progress exported', variant: 'success' });
}

function doImport() {
  const input = el('input', { type: 'file', accept: 'application/json', style: { display: 'none' } });
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      confirmDialog({
        title: 'Replace current progress?',
        message: `This will overwrite your current progress with the file exported on ${
          payload.exportedAt ? new Date(payload.exportedAt).toLocaleDateString() : 'an unknown date'
        }.`,
        confirmLabel: 'Import',
        danger: true,
        onConfirm: async () => {
          importProgress(payload);
          // Imported mistakes may point at topics whose questions are not loaded yet.
          await ensureMistakeContent().catch(() => {});
          emit(EVENTS.toast, { title: 'Progress imported', variant: 'success' });
          navigate('/');
        }
      });
    } catch (error) {
      emit(EVENTS.toast, {
        title: 'Could not read that file',
        body: error.message,
        variant: 'danger'
      });
    }
    input.remove();
  });
  document.body.appendChild(input);
  input.click();
}

function doReset() {
  let typed = '';
  openModal({
    title: 'Reset all progress?',
    body: (close) =>
      el('div.stack', {}, [
        el('p.text-muted', {
          text: 'This permanently deletes your XP, streak, mastery scores, mistake history and session log on this device. Topics and questions are unaffected. It cannot be undone.'
        }),
        el('div.lesson__callout', { style: { borderLeftColor: 'var(--danger)', background: 'var(--danger-soft)' } }, [
          el('p.text-sm', { text: 'Consider exporting a backup first.' })
        ]),
        el('label.text-sm.text-muted', { text: 'Type RESET to confirm' }),
        el('input', {
          class: 'input input--text',
          placeholder: 'RESET',
          'aria-label': 'Type RESET to confirm',
          on: {
            input: (event) => {
              typed = event.target.value;
              const confirmBtn = event.target
                .closest('.modal')
                .querySelector('.modal__actions .btn--danger');
              if (confirmBtn) confirmBtn.disabled = typed.trim().toUpperCase() !== 'RESET';
            }
          }
        })
      ]),
    actions: [
      { label: 'Export backup first', variant: 'soft', onClick: doExport, closeOnClick: false },
      { label: 'Cancel', variant: 'ghost' },
      {
        label: 'Reset everything',
        variant: 'danger',
        onClick: () => {
          if (typed.trim().toUpperCase() !== 'RESET') return false;
          resetProgress();
          emit(EVENTS.toast, { title: 'Progress reset', variant: 'warning' });
          navigate('/');
          return true;
        }
      }
    ]
  });

  // The destructive action starts disabled until RESET is typed.
  requestAnimationFrame(() => {
    const confirmBtn = document.querySelector('.modal__actions .btn--danger');
    if (confirmBtn) confirmBtn.disabled = true;
  });
}
