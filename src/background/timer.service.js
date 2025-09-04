import { get, set } from './storage.js';
import * as unifiedOrchestrator from './unified-orchestrator.js';
import * as analyticsService from './analytics.service.js';

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
        
        chrome.runtime.sendMessage({
            action: 'timerStateUpdated',
            timerState: newState
        }).catch(() => {
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
        const endTimestamp = now + (timeLeft * 1000);
        
        await updateTimerState({
            isRunning: true,
            startTimestamp: now,
            endTimestamp: endTimestamp,
            currentSession: request.session || 'pomodoro',
            totalTime: request.duration || 25 * 60,
            timeLeft: timeLeft
        });

        // Log analytics for session start only if it's a fresh start (not resume)
        try {
            const isFreshStart = preState && !preState.isRunning && preState.timeLeft === preState.totalTime;
            if (isFreshStart) {
                await analyticsService.logSessionStart({ session: request.session || 'pomodoro', duration: request.duration || 25 * 60 });
            }
        } catch (e) {
            console.warn('Analytics logSessionStart failed:', e);
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
            const newTimeLeft = Math.max(0, Math.ceil((timerState.endTimestamp - now) / 1000));
            
            await updateTimerState({
                isRunning: false,
                timeLeft: newTimeLeft,
                startTimestamp: null,
                endTimestamp: null
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
            currentSession: session
        });
    } catch (error) {
        console.error('Error handling timer reset:', error);
    }
}

export async function handleTimerComplete(request) {
    try {
        const timerState = await getTimerState();
        let updates = {
            isRunning: false,
            timeLeft: 0,
            startTimestamp: null,
            endTimestamp: null
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
                totalTime: nextDuration
            };
        } else if (request.session !== 'custom') {
            // Break completed - handle break complete in unified mode
            if (request.session === 'short-break' || request.session === 'long-break') {
                await unifiedOrchestrator.handleBreakComplete();
            }
            
            const duration = timerState.sessions.pomodoro.duration;
            updates = {
                ...updates,
                sessionCount: timerState.sessionCount + 1,
                currentSession: 'pomodoro',
                timeLeft: duration,
                totalTime: duration
            };
        }

        await updateTimerState(updates);

        // Log analytics for session completion
        try {
            await analyticsService.logSessionComplete({ session: request.session });
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
                endTimestamp: null
            });
        } else if (duration) {
            await updateTimerState({
                currentSession: session,
                timeLeft: duration,
                totalTime: duration,
                isRunning: false,
                startTimestamp: null,
                endTimestamp: null
            });
        }
    } catch (error) {
        console.error('Error handling session switch:', error);
    }
}

// Dev/Test helper: Fast-complete the current running Pomodoro session and credit full planned duration
export async function testCompletePomodoro() {
    try {
        const timerState = await getTimerState();
        if (!timerState || !timerState.isRunning || timerState.currentSession !== 'pomodoro') {
            return { success: false, error: 'Pomodoro is not running' };
        }

        // Credit analytics with full planned duration
        try {
            const planned = timerState.totalTime || 25 * 60;
            await analyticsService.logSessionComplete({ session: 'pomodoro', actualSec: planned });
        } catch (e) {
            console.warn('Analytics test complete failed:', e);
        }

        // Handle unified mode orchestration similar to a normal completion
        await unifiedOrchestrator.handleFocusStop();

        const newPomodoroCount = (timerState.pomodoroCount || 0) + 1;
        const newSessionCount = (timerState.sessionCount || 0) + 1;

        let nextSession;
        let nextDuration;
        if (newPomodoroCount % 4 === 0) {
            nextSession = 'long-break';
            nextDuration = timerState.sessions['long-break'].duration;
        } else {
            nextSession = 'short-break';
            nextDuration = timerState.sessions['short-break'].duration;
        }

        await updateTimerState({
            isRunning: false,
            timeLeft: nextDuration,
            totalTime: nextDuration,
            startTimestamp: null,
            endTimestamp: null,
            pomodoroCount: newPomodoroCount,
            sessionCount: newSessionCount,
            currentSession: nextSession
        });

        return { success: true };
    } catch (error) {
        console.error('Error in testCompletePomodoro:', error);
        return { success: false, error: error.message };
    }
}
