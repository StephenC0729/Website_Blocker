import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

function send(msg) {
  if (
    typeof window !== 'undefined' &&
    typeof window.sendMessagePromise === 'function'
  ) {
    return window.sendMessagePromise(msg);
  }
  return Promise.resolve({ success: true });
}

function formatHM(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}m`;
}

function formatDurationShort(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

function getCreditedDuration(session) {
  const planned = session.plannedSec || 0;
  const actual = session.actualSec || 0;
  if (planned > 0 && actual > 0) return Math.min(planned, actual);
  return actual || planned || 0;
}

export default function Dashboard() {
  const sessionsConfig = useMemo(
    () => ({
      pomodoro: { duration: 25 * 60, label: 'Time to focus!' },
      'short-break': { duration: 5 * 60, label: 'Time for a short break!' },
      'long-break': { duration: 15 * 60, label: 'Time for a long break!' },
      custom: { duration: 30 * 60, label: 'Custom timer session' },
    }),
    []
  );

  const [currentSession, setCurrentSession] = useState('pomodoro');
  const [totalTime, setTotalTime] = useState(sessionsConfig.pomodoro.duration);
  const [timeLeft, setTimeLeft] = useState(sessionsConfig.pomodoro.duration);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionCount, setSessionCount] = useState(1);
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const [customDuration, setCustomDuration] = useState(
    sessionsConfig.custom.duration
  );
  const [metrics, setMetrics] = useState({
    todayFocusSeconds: 0,
    weeklyFocusSeconds: 0,
    sitesBlockedToday: 0,
    completionRate: 0,
  });
  const [history, setHistory] = useState([]);
  const [unifiedEnabled, setUnifiedEnabled] = useState(false);
  const intervalRef = useRef(null);
  const alignTimeoutRef = useRef(null);

  const endTsRef = useRef(null);

  const updateLocalTicker = useCallback(() => {
    if (!endTsRef.current) return;
    const remainingMs = Math.max(0, endTsRef.current - Date.now());
    const newLeft = Math.ceil(remainingMs / 1000);
    setTimeLeft(newLeft);
    if (remainingMs <= 0) {
      try {
        chrome.runtime.sendMessage({
          action: 'timerComplete',
          session: currentSession,
          pomodoroCount,
        });
      } catch {}
      setIsRunning(false);
      endTsRef.current = null;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [currentSession, pomodoroCount]);

  const startAlignedTicker = useCallback(() => {
    if (intervalRef.current) return;
    if (!endTsRef.current) return;
    const firstDelay = (endTsRef.current - Date.now()) % 1000 || 1000;
    if (alignTimeoutRef.current) clearTimeout(alignTimeoutRef.current);
    alignTimeoutRef.current = setTimeout(() => {
      updateLocalTicker();
      intervalRef.current = setInterval(updateLocalTicker, 1000);
    }, firstDelay);
  }, [updateLocalTicker]);

  const stopTicker = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (alignTimeoutRef.current) {
      clearTimeout(alignTimeoutRef.current);
      alignTimeoutRef.current = null;
    }
  }, []);

  const applyTimerState = useCallback(
    (state) => {
      const cfg = sessionsConfig;
      const nextSession = state.currentSession || currentSession;
      setCurrentSession(nextSession);
      setSessionCount(
        typeof state.sessionCount === 'number'
          ? state.sessionCount
          : sessionCount
      );
      setPomodoroCount(
        typeof state.pomodoroCount === 'number'
          ? state.pomodoroCount
          : pomodoroCount
      );
      const nextTotal =
        typeof state.totalTime === 'number'
          ? state.totalTime
          : cfg[nextSession]?.duration || cfg.pomodoro.duration;
      setTotalTime(nextTotal);

      if (state.isRunning && state.endTimestamp) {
        endTsRef.current = state.endTimestamp;
        const left = Math.max(
          0,
          Math.ceil((state.endTimestamp - Date.now()) / 1000)
        );
        setTimeLeft(left);
        setIsRunning(true);
        stopTicker();
        startAlignedTicker();
      } else {
        endTsRef.current = null;
        setTimeLeft(
          typeof state.timeLeft === 'number' ? state.timeLeft : nextTotal
        );
        setIsRunning(!!state.isRunning);
        stopTicker();
      }
    },
    [
      sessionsConfig,
      currentSession,
      sessionCount,
      pomodoroCount,
      startAlignedTicker,
      stopTicker,
    ]
  );

  const fetchTimerState = useCallback(async () => {
    try {
      const loc = await chrome.storage.local.get(['timerState']);
      if (loc && loc.timerState) {
        applyTimerState(loc.timerState);
        return;
      }
    } catch {}
    try {
      const res = await chrome.runtime.sendMessage({ action: 'getTimerState' });
      if (res && res.success && res.timerState) applyTimerState(res.timerState);
    } catch {}
  }, [applyTimerState]);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await send({ action: 'getSettings' });
      setUnifiedEnabled(
        !!(res && res.settings && res.settings.unifiedModeEnabled)
      );
    } catch {}
  }, []);

  const refreshAnalytics = useCallback(async () => {
    try {
      const [m, h] = await Promise.all([
        send({ action: 'analyticsGetMetrics' }),
        send({ action: 'analyticsGetHistory', limit: 5 }),
      ]);
      if (m && m.success) setMetrics(m);
      if (h && h.success) setHistory(h.sessions || []);
    } catch (e) {
      console.error('dashboard refresh analytics error:', e);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    fetchTimerState();
    refreshAnalytics();

    const onMsg = (message) => {
      if (
        message &&
        message.action === 'timerStateUpdated' &&
        message.timerState
      ) {
        applyTimerState(message.timerState);
      }
      if (message && message.action === 'analyticsUpdated') {
        refreshAnalytics();
      }
    };
    try {
      chrome.runtime.onMessage.addListener(onMsg);
    } catch {}
    return () => {
      try {
        chrome.runtime.onMessage.removeListener(onMsg);
      } catch {}
      stopTicker();
    };
  }, [
    fetchSettings,
    fetchTimerState,
    refreshAnalytics,
    applyTimerState,
    stopTicker,
  ]);

  const switchSession = useCallback(
    async (type) => {
      try {
        const payload = { action: 'switchSession', session: type };
        if (type === 'custom' && typeof customDuration === 'number')
          payload.customDuration = customDuration;
        await chrome.runtime.sendMessage(payload);
      } catch {}
    },
    [customDuration]
  );

  const start = useCallback(async () => {
    try {
      if (unifiedEnabled && currentSession === 'pomodoro') {
        chrome.runtime.sendMessage({
          action: 'focusStart',
          sessionId: Date.now().toString(),
          session: currentSession,
          duration: totalTime,
        });
      }
      chrome.runtime.sendMessage({
        action: 'timerStarted',
        session: currentSession,
        duration: totalTime,
        timeLeft,
      });
    } catch {}
  }, [unifiedEnabled, currentSession, totalTime, timeLeft]);

  const pause = useCallback(async () => {
    try {
      if (unifiedEnabled && currentSession === 'pomodoro') {
        chrome.runtime.sendMessage({ action: 'focusStop' });
      }
      chrome.runtime.sendMessage({ action: 'timerStopped' });
    } catch {}
  }, [unifiedEnabled, currentSession]);

  const reset = useCallback(async () => {
    try {
      chrome.runtime.sendMessage({
        action: 'timerReset',
        session: currentSession,
      });
    } catch {}
  }, [currentSession]);

  const applyCustom = useCallback(async () => {
    const dur = Math.max(60, Number(customDuration) || 60);
    setCustomDuration(dur);
    await switchSession('custom');
  }, [customDuration, switchSession]);

  const timerDisplay = useMemo(() => {
    const minutes = Math.floor(timeLeft / 60)
      .toString()
      .padStart(2, '0');
    const seconds = (timeLeft % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  }, [timeLeft]);

  const progressPct = useMemo(() => {
    if (!totalTime) return 0;
    return Math.max(
      0,
      Math.min(100, ((totalTime - timeLeft) / totalTime) * 100)
    );
  }, [totalTime, timeLeft]);

  const colorMap = {
    pomodoro: 'bg-red-600',
    'short-break': 'bg-green-600',
    'long-break': 'bg-purple-600',
    custom: 'bg-blue-600',
  };
  const activeColor = colorMap[currentSession] || colorMap.pomodoro;

  const sessionLabel =
    sessionsConfig[currentSession]?.label || sessionsConfig.pomodoro.label;

  return (
    <div className="flex-1 p-6 overflow-auto min-h-full">
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            <i className="fas fa-clock text-red-500 mr-2"></i>Pomodoro Timer
          </h2>
          <div className="flex space-x-2">
            {['pomodoro', 'short-break', 'long-break', 'custom'].map((t) => {
              const classInactive = 'bg-gray-100 text-gray-700';
              const activeMap = {
                pomodoro: 'bg-red-100 text-red-800',
                'short-break': 'bg-green-100 text-green-800',
                'long-break': 'bg-purple-100 text-purple-800',
                custom: 'bg-blue-100 text-blue-800',
              };
              const isActive = currentSession === t;
              const className = `session-tab ${
                isActive ? activeMap[t] : classInactive
              } px-4 py-2 rounded-md text-sm font-medium`;
              const label =
                t === 'pomodoro'
                  ? 'Pomodoro'
                  : t === 'short-break'
                  ? 'Short Break'
                  : t === 'long-break'
                  ? 'Long Break'
                  : 'Custom';
              return (
                <button
                  key={t}
                  className={className}
                  aria-selected={isActive ? 'true' : 'false'}
                  onClick={() => switchSession(t)}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-center mb-6">
          {currentSession !== 'custom' ? (
            <div id="placeholderSpace" className="p-0">
              <div className="flex items-center space-x-4">
                <div className="h-10"></div>
              </div>
            </div>
          ) : (
            <div id="customTimerInput">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-4">
                  <label className="text-sm font-medium text-gray-700">
                    Custom Duration:
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      className="w-20 border border-gray-300 rounded-md px-3 py-2 text-center"
                      value={Math.floor(customDuration / 60)}
                      min="1"
                      max="999"
                      onChange={(e) => {
                        const mins = Math.max(
                          1,
                          Math.min(999, Number(e.target.value) || 1)
                        );
                        setCustomDuration(mins * 60 + (customDuration % 60));
                      }}
                    />
                    <span className="text-sm text-gray-600">minutes</span>
                    <input
                      type="number"
                      className="w-20 border border-gray-300 rounded-md px-3 py-2 text-center"
                      value={customDuration % 60}
                      min="0"
                      max="59"
                      onChange={(e) => {
                        const secs = Math.max(
                          0,
                          Math.min(59, Number(e.target.value) || 0)
                        );
                        setCustomDuration(
                          Math.floor(customDuration / 60) * 60 + secs
                        );
                      }}
                    />
                    <span className="text-sm text-gray-600">seconds</span>
                  </div>
                  <button
                    className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
                    onClick={applyCustom}
                  >
                    <i className="fas fa-check mr-2"></i>Set Timer
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center mb-6">
          <div className="text-center">
            <div
              id="timerDisplay"
              className="text-6xl font-mono font-light text-gray-900 mb-4"
            >
              {timerDisplay}
            </div>
            <div id="sessionType" className="text-lg text-gray-600 mb-4">
              {sessionLabel}
            </div>
            <div className="flex space-x-4 justify-center">
              {!isRunning && (
                <button
                  id="startButton"
                  className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
                  onClick={start}
                >
                  <i className="fas fa-play mr-2"></i>Start
                </button>
              )}
              {isRunning && (
                <button
                  id="pauseButton"
                  className="bg-yellow-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-yellow-700 transition-colors"
                  onClick={pause}
                >
                  <i className="fas fa-pause mr-2"></i>Pause
                </button>
              )}
              <button
                id="resetButton"
                className="bg-gray-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-700 transition-colors"
                onClick={reset}
              >
                <i className="fas fa-stop mr-2"></i>Reset
              </button>
            </div>
          </div>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div
            id="progressBar"
            className={`${activeColor} h-2 rounded-full transition-all duration-1000`}
            style={{ width: `${progressPct}%` }}
          ></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            <i className="fas fa-chart-bar text-blue-500 mr-2"></i>Productivity
            Overview
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div
                className="text-2xl font-bold text-green-600"
                id="todayFocusTime"
              >
                {formatHM(metrics.todayFocusSeconds)}
              </div>
              <div className="text-sm text-gray-600">Today's Focus</div>
            </div>
            <div className="text-center">
              <div
                className="text-2xl font-bold text-blue-600"
                id="weeklyFocusTime"
              >
                {formatHM(metrics.weeklyFocusSeconds)}
              </div>
              <div className="text-sm text-gray-600">This Week</div>
            </div>
            <div className="text-center">
              <div
                className="text-2xl font-bold text-red-600"
                id="sitesBlockedToday"
              >
                {metrics.sitesBlockedToday || 0}
              </div>
              <div className="text-sm text-gray-600">Sites Blocked</div>
            </div>
            <div className="text-center">
              <div
                className="text-2xl font-bold text-purple-600"
                id="completionRate"
              >
                {metrics.completionRate || 0}%
              </div>
              <div className="text-sm text-gray-600">Completion Rate</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            <i className="fas fa-history text-green-500 mr-2"></i>Recent
            Sessions
          </h3>
          <div id="sessionHistory" className="space-y-3">
            {(!history || history.length === 0) && (
              <div className="text-sm text-gray-500">No sessions yet</div>
            )}
            {history &&
              history.map((s) => {
                const d = new Date(s.end || s.start);
                const when = `${d.toLocaleDateString()} ${d.toLocaleTimeString(
                  [],
                  { hour: '2-digit', minute: '2-digit' }
                )}`;
                const label =
                  s.type === 'pomodoro'
                    ? 'Focus'
                    : s.type === 'short-break' || s.type === 'long-break'
                    ? 'Break'
                    : 'Custom';
                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded"
                  >
                    <div className="flex items-center space-x-2">
                      <i
                        className={`fas ${
                          s.type === 'pomodoro'
                            ? 'fa-fire text-red-500'
                            : 'fa-coffee text-green-600'
                        }`}
                      ></i>
                      <span className="text-sm text-gray-700">{label}</span>
                      <span className="text-xs text-gray-400">{when}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {formatDurationShort(getCreditedDuration(s))}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}
