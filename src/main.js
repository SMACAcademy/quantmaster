/** Application entry point: styles, shell, routes, global event wiring. */

import './styles/variables.css';
import './styles/global.css';
import './styles/components.css';
import './styles/animations.css';

import { route, setNotFound, startRouter, navigate } from './app/router.js';
import { applyKeyboardHints, applyMotion, applyTheme, getSettings } from './app/state.js';
import { on, EVENTS } from './app/eventBus.js';
import { createAppShell } from './components/AppShell.js';
import { initToasts, showToast } from './components/Toast.js';
import { initModals, showAchievementModal } from './components/Modal.js';
import { celebrate, floatXp, milestoneActive, showStreakMilestone } from './components/Celebration.js';
import { BIG_STREAK_MILESTONES, STREAK_RULES } from './app/config.js';
import { emptyState, linkButton } from './components/ui.js';
import { getUserProgress, storageIsPersistent } from './repositories/progressRepository.js';
import { initPwa } from './pwa/pwa.js';
import { ensureMistakeContent, prefetchAllContent } from './services/contentGate.js';
import { initReminders } from './services/reminders.js';

import { DashboardView } from './views/DashboardView.js';
import { TopicsView } from './views/TopicsView.js';
import { TopicDetailView } from './views/TopicDetailView.js';
import { LevelView } from './views/LevelView.js';
import { FormulaRevisionView } from './views/FormulaRevisionView.js';
import { QuickSheetView } from './views/QuickSheetView.js';
import { TablesView } from './views/TablesView.js';
import { DrillView } from './views/DrillView.js';
import { MockTestsView } from './views/MockTestsView.js';
import { MockRunView } from './views/MockRunView.js';
import { MockResultView } from './views/MockResultView.js';
import { ExploreSimulationView, ExploreView } from './views/ExploreView.js';
import { PracticeView } from './views/PracticeView.js';
import { QuizView } from './views/QuizView.js';
import { ResultsView } from './views/ResultsView.js';
import { MistakesView } from './views/MistakesView.js';
import { ProgressView } from './views/ProgressView.js';
import { SettingsView } from './views/SettingsView.js';
import { PrivacyView } from './views/PrivacyView.js';
import { AboutView } from './views/AboutView.js';
import { LandingView } from './views/LandingView.js';
import { shouldShowLanding } from './landing/journey.js';

async function boot() {
  const settings = getSettings();
  applyTheme(settings.theme);
  applyMotion(settings.motion);
  applyKeyboardHints(settings.showKeyboardHints);

  initToasts(document.getElementById('toast-root'));
  initModals(document.getElementById('modal-root'));

  const app = document.getElementById('app');
  const shell = createAppShell();
  app.replaceChildren(shell.element);
  app.setAttribute('aria-busy', 'false');

  registerRoutes();

  // Mistake counts appear on every screen, so load the few topics they come from
  // before the first render. Everything else loads in the background below.
  await ensureMistakeContent().catch((error) => console.warn('[quantmaster] could not load mistake topics', error));

  startRouter({
    mount: shell.content,
    onNavigate: ({ path, result }) => {
      shell.setTitle(result.title || 'QuantMaster');
      shell.setFocusMode(Boolean(result.focusMode));
      shell.setBare(Boolean(result.bare));
      shell.refresh(path);
    }
  });

  wireGlobalEvents();
  prefetchAllContent();
  initPwa();
  initReminders();

  // The skip link must not use a #fragment href: that would be read as a route.
  document.querySelector('[data-skip-to]')?.addEventListener('click', (event) => {
    event.preventDefault();
    document.getElementById(event.currentTarget.dataset.skipTo)?.focus();
  });

  if (!storageIsPersistent()) {
    showToast({
      title: 'Progress will not be saved',
      body: 'Browser storage is unavailable, so this session will not persist. Private browsing often causes this.',
      variant: 'warning',
      duration: 8000
    });
  }
}

function registerRoutes() {
  // A first visit to the home address gets the 3D landing page; after that, the dashboard.
  route('/', (ctx) => (shouldShowLanding(getUserProgress()) ? LandingView(ctx) : DashboardView(ctx)));
  route('/welcome', LandingView);
  route('/topics', TopicsView);
  route('/topics/:topicId', TopicDetailView);
  route('/topics/:topicId/levels/:levelId', LevelView);
  route('/revise', FormulaRevisionView);
  route('/revise/:topicId', FormulaRevisionView);
  route('/sheet', QuickSheetView);
  route('/sheet/:topicId', QuickSheetView);
  route('/tables', TablesView);
  route('/drill/:tableId', DrillView);
  route('/mock', MockTestsView);
  route('/mock/run', MockRunView);
  route('/mock/result', MockResultView);
  route('/explore', ExploreView);
  route('/explore/:simulationId', ExploreSimulationView);
  route('/practice', PracticeView);
  route('/quiz', QuizView);
  route('/results', ResultsView);
  route('/mistakes', MistakesView);
  route('/progress', ProgressView);
  route('/settings', SettingsView);
  route('/privacy', PrivacyView);
  route('/about', AboutView);

  setNotFound(() => ({
    title: 'Not found',
    element: emptyState({
      title: 'That page does not exist',
      body: 'The link may be out of date.',
      iconName: 'compass',
      action: linkButton('Back to dashboard', '/', { variant: 'primary' })
    })
  }));
}

function wireGlobalEvents() {
  const achievementQueue = [];
  let showingAchievement = false;

  const drainAchievements = () => {
    // A full-screen streak celebration goes first; achievements follow when it closes.
    if (showingAchievement || milestoneActive() || !achievementQueue.length) return;
    showingAchievement = true;
    const achievement = achievementQueue.shift();
    const modal = showAchievementModal(achievement);
    const observer = new MutationObserver(() => {
      if (!document.getElementById('modal-root').contains(modal.element)) {
        observer.disconnect();
        showingAchievement = false;
        drainAchievements();
      }
    });
    observer.observe(document.getElementById('modal-root'), { childList: true, subtree: true });
  };

  on(EVENTS.achievementUnlocked, (achievement) => {
    achievementQueue.push(achievement);
    // Let any in-flight view render before interrupting with a modal.
    setTimeout(drainAchievements, 450);
  });

  on(EVENTS.levelCompleted, ({ level }) => {
    showToast({
      title: 'Level complete',
      body: level.title,
      variant: 'success'
    });
  });

  on(EVENTS.rankUp, ({ rank }) => {
    celebrate({ intensity: 'high' });
    showToast({
      title: `New rank: ${rank.name}`,
      body: 'Ranks are motivational labels, not proficiency claims — but well earned.',
      variant: 'achievement',
      duration: 5200
    });
  });

  on(EVENTS.streakExtended, ({ current, usedFreezes, earnedFreeze, freezes, repaired, milestone }) => {
    const notes = [];
    if (usedFreezes) {
      notes.push(
        usedFreezes === 1
          ? 'A streak freeze covered the day you missed.'
          : `${usedFreezes} streak freezes covered the days you missed.`
      );
    }
    if (earnedFreeze) notes.push(`You earned a streak freeze (${freezes} of ${STREAK_RULES.maxFreezes}).`);

    if (BIG_STREAK_MILESTONES.includes(milestone)) {
      showStreakMilestone(milestone, { onDone: drainAchievements });
      if (notes.length) showToast({ title: `${current}-day streak`, body: notes.join(' '), variant: 'success' });
      return;
    }
    if (milestone || repaired) celebrate({ intensity: 'medium' });
    showToast({
      title: repaired ? `Streak repaired: ${current} days` : `${current}-day streak`,
      body:
        notes.join(' ') ||
        (repaired
          ? 'Your old streak is back, with the days since you returned added on.'
          : current === 1
            ? 'Day one. Come back tomorrow to build it.'
            : 'Today is counted.'),
      variant: milestone || repaired ? 'achievement' : 'success'
    });
  });

  on(EVENTS.xpAwarded, ({ amount, reason }) => {
    if (amount >= 25) {
      const anchor = document.querySelector('.stat-pill--xp');
      floatXp(amount, anchor);
    }
  });

  // Global shortcut: "/" focuses search where one exists.
  document.addEventListener('keydown', (event) => {
    if (event.key === '/' && !event.target.matches('input, textarea, select')) {
      const search = document.querySelector('.search-input input');
      if (search) {
        event.preventDefault();
        search.focus();
      }
    }
  });

  window.addEventListener('error', (event) => {
    console.error('[quantmaster] uncaught error', event.error);
  });
}

boot();
