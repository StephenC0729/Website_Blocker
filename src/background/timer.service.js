import { get, set } from './storage.js';
import * as unifiedOrchestrator from './unified-orchestrator.js';
import * as analyticsService from './analytics.service.js';

async function playBackgroundAudioNotification() {
  console.log('🔔 playBackgroundAudioNotification called - using Chrome Notifications API');
  try {
    // Get settings for enabled status
    let enabled = true;
    
    try {
      const result = await get(['settings']);
      const settings = result.settings || {};
      if (typeof settings.soundNotificationsEnabled === 'boolean') enabled = settings.soundNotificationsEnabled;
    } catch (e) {
      console.warn('Could not load notification settings, using defaults');
    }
    
    if (!enabled) {
      console.log('🔇 Sound notifications disabled, skipping');
      return;
    }
    console.log('🔔 Sound notifications enabled - showing system notification');

    // Use Chrome Notifications API for reliable system sound
    try {
      // Get the correct icon URL using chrome.runtime.getURL()
      const iconUrl = chrome.runtime.getURL('src/assets/icons/Icon.png');
      console.log('🔔 Using icon URL:', iconUrl);
      
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: iconUrl,
        title: '⏰ Timer Completed',
        message: 'Your focus session has ended!',
        priority: 2, // High priority for sound
        requireInteraction: false // Auto-dismiss after a few seconds
      });
      console.log('🔔 System notification created successfully');
      
      // Add TTS backup for audible notification since Chrome notifications are often silent
      try {
        console.log('🔊 Playing TTS audio backup for reliable sound...');
        chrome.tts.speak('Timer completed. Your focus session has ended.', {
          rate: 1.0,
          pitch: 1.0,
          volume: 0.8
        });
        console.log('🔊 TTS audio backup played successfully');
      } catch (ttsError) {
        console.error('🔊 TTS backup failed:', ttsError);
      }
    } catch (error) {
      console.error('🔔 Failed to create system notification:', error);
      
      // Fallback: Try without icon
      try {
        console.log('🔔 Trying notification without icon...');
        await chrome.notifications.create({
          type: 'basic',
          title: '⏰ Timer Completed',
          message: 'Your focus session has ended!',
          priority: 2,
          requireInteraction: false
        });
        console.log('🔔 Fallback notification (no icon) created successfully');
        
        // Add TTS backup for this fallback case too
        try {
          console.log('🔊 Playing TTS audio backup for fallback notification...');
          chrome.tts.speak('Timer completed. Your focus session has ended.', {
            rate: 1.0,
            pitch: 1.0,
            volume: 0.8
          });
          console.log('🔊 TTS audio backup played successfully');
        } catch (ttsError) {
          console.error('🔊 TTS backup failed:', ttsError);
        }
      } catch (fallbackError) {
        console.error('🔔 Fallback notification also failed:', fallbackError);
        
        // If both notifications fail, try TTS only
        try {
          console.log('🔊 Both notifications failed - trying TTS only...');
          chrome.tts.speak('Timer completed. Your focus session has ended.', {
            rate: 1.0,
            pitch: 1.0,
            volume: 0.8
          });
          console.log('🔊 TTS-only fallback played successfully');
        } catch (ttsError) {
          console.error('🔊 All notification methods failed:', ttsError);
        }
      }
    }
  } catch (error) {
    console.error('Error playing background notification:', error);
  }
}

export async function getTimerState() {
  try {
    const result = await get(['timerState']);
    return result.timerState;
  } catch (error) {
    console.error('Error getting timer state:', error);
    return null;
  }
}

export async function updateTimerState(updates) {
  try {
    const currentState = await getTimerState();
    const newState = { ...currentState, ...updates };
    await set({ timerState: newState });

    chrome.runtime
      .sendMessage({
        action: 'timerStateUpdated',
        timerState: newState,
      })
      .catch(() => {
        // Ignore errors if no listeners
      });
  } catch (error) {
    console.error('Error updating timer state:', error);
  }
}

export async function handleTimerStart(request) {
  try {
    const preState = await getTimerState();
    const now = Date.now();
    const timeLeft = request.timeLeft || request.duration || 25 * 60;
    const endTimestamp = now + timeLeft * 1000;

    await updateTimerState({
      isRunning: true,
      startTimestamp: now,
      endTimestamp: endTimestamp,
      currentSession: request.session || 'pomodoro',
      totalTime: request.duration || 25 * 60,
      timeLeft: timeLeft,
    });

    // Log analytics for session start only if it's a fresh start (not resume)
    try {
      const isFreshStart =
        preState &&
        !preState.isRunning &&
        preState.timeLeft === preState.totalTime;
      if (isFreshStart) {
        await analyticsService.logSessionStart({
          session: request.session || 'pomodoro',
          duration: request.duration || 25 * 60,
        });
      }
    } catch (e) {
      console.warn('Analytics logSessionStart failed:', e);
    }

    // Unified mode: apply appropriate category at start
    try {
      const session = request.session || 'pomodoro';
      if (session === 'pomodoro') {
        await unifiedOrchestrator.handleFocusStart({ sessionId: String(now) });
      } else if (session === 'short-break' || session === 'long-break') {
        // Starting a break manually should apply break category
        await unifiedOrchestrator.handleFocusStop();
      }
    } catch (e) {
      console.warn('Unified orchestrator start hook failed:', e);
    }
  } catch (error) {
    console.error('Error handling timer start:', error);
  }
}

export async function handleTimerStop() {
  try {
    const timerState = await getTimerState();
    if (timerState.isRunning && timerState.endTimestamp) {
      const now = Date.now();
      const newTimeLeft = Math.max(
        0,
        Math.ceil((timerState.endTimestamp - now) / 1000)
      );

      await updateTimerState({
        isRunning: false,
        timeLeft: newTimeLeft,
        startTimestamp: null,
        endTimestamp: null,
      });
    }
  } catch (error) {
    console.error('Error handling timer stop:', error);
  }
}

export async function handleTimerReset(request) {
  try {
    const timerState = await getTimerState();
    const session = request.session || timerState.currentSession;
    const duration = timerState.sessions[session]?.duration || 25 * 60;

    await updateTimerState({
      isRunning: false,
      timeLeft: duration,
      totalTime: duration,
      startTimestamp: null,
      endTimestamp: null,
      currentSession: session,
    });
  } catch (error) {
    console.error('Error handling timer reset:', error);
  }
}

export async function handleTimerComplete(request) {
  try {
    const timerState = await getTimerState();
    const now = Date.now();
    // Compute actual duration from startTimestamp when available
    const actualSec =
      timerState && timerState.startTimestamp
        ? Math.max(0, Math.round((now - timerState.startTimestamp) / 1000))
        : undefined;
    let updates = {
      isRunning: false,
      timeLeft: 0,
      startTimestamp: null,
      endTimestamp: null,
    };

    // Handle unified mode orchestration
    if (request.session === 'pomodoro') {
      // Pomodoro completed - handle focus stop in unified mode
      await unifiedOrchestrator.handleFocusStop();

      const newPomodoroCount = timerState.pomodoroCount + 1;
      const newSessionCount = timerState.sessionCount + 1;

      let nextSession;
      let nextDuration;
      if (newPomodoroCount % 4 === 0) {
        nextSession = 'long-break';
        nextDuration = timerState.sessions['long-break'].duration;
      } else {
        nextSession = 'short-break';
        nextDuration = timerState.sessions['short-break'].duration;
      }

      updates = {
        ...updates,
        pomodoroCount: newPomodoroCount,
        sessionCount: newSessionCount,
        currentSession: nextSession,
        timeLeft: nextDuration,
        totalTime: nextDuration,
      };
    } else if (
      request.session === 'short-break' ||
      request.session === 'long-break'
    ) {
      // Break completed - handle break complete in unified mode
      await unifiedOrchestrator.handleBreakComplete();

      const duration = timerState.sessions.pomodoro.duration;
      updates = {
        ...updates,
        sessionCount: timerState.sessionCount + 1,
        currentSession: 'pomodoro',
        timeLeft: duration,
        totalTime: duration,
      };
    } else if (request.session === 'custom') {
      // Custom completed - reset to configured custom duration
      const duration =
        (timerState && timerState.sessions && timerState.sessions.custom
          ? timerState.sessions.custom.duration
          : 30 * 60) || 30 * 60;
      updates = {
        ...updates,
        sessionCount: timerState.sessionCount + 1,
        currentSession: 'custom',
        timeLeft: duration,
        totalTime: duration,
      };
    }

    await updateTimerState(updates);

    // Play background audio notification when timer completes
    console.log('🔔 Timer completed - attempting to play sound notification');
    try {
      await playBackgroundAudioNotification();
      console.log('🎵 Sound notification completed successfully');
    } catch (e) {
      console.warn('Background audio notification failed:', e);
    }

    // Log analytics for session completion (pass actualSec to ensure robust recording)
    try {
      await analyticsService.logSessionComplete({
        session: request.session,
        actualSec,
      });
    } catch (e) {
      console.warn('Analytics logSessionComplete failed:', e);
    }
  } catch (error) {
    console.error('Error handling timer complete:', error);
  }
}

export async function handleSessionSwitch(request) {
  try {
    const timerState = await getTimerState();
    const session = request.session;
    let duration = timerState.sessions[session]?.duration;

    if (session === 'custom' && request.customDuration) {
      duration = request.customDuration;
      const sessions = { ...timerState.sessions };
      sessions.custom.duration = duration;

      await updateTimerState({
        sessions,
        currentSession: session,
        timeLeft: duration,
        totalTime: duration,
        isRunning: false,
        startTimestamp: null,
        endTimestamp: null,
      });
    } else if (duration) {
      await updateTimerState({
        currentSession: session,
        timeLeft: duration,
        totalTime: duration,
        isRunning: false,
        startTimestamp: null,
        endTimestamp: null,
      });
    }

    // Unified mode: synchronize categories on manual session switch
    try {
      if (session === 'pomodoro') {
        // Close out any break context and start focus
        await unifiedOrchestrator.handleBreakComplete();
        await unifiedOrchestrator.handleFocusStart({
          sessionId: String(Date.now()),
        });
      } else if (session === 'short-break' || session === 'long-break') {
        // Switch to break category
        await unifiedOrchestrator.handleFocusStop();
      }
    } catch (e) {
      console.warn('Unified orchestrator switch hook failed:', e);
    }
  } catch (error) {
    console.error('Error handling session switch:', error);
  }
}

// Dev/Test helpers removed
