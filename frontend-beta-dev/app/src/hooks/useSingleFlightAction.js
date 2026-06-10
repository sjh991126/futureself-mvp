import { useCallback, useState } from 'react';

const activeActionKeys = new Set();

export const useSingleFlightAction = (actionKey) => {
  const [isRunning, setIsRunning] = useState(false);

  const run = useCallback(async (action) => {
    if (!action || typeof action !== 'function') return false;
    if (isRunning || activeActionKeys.has(actionKey)) return false;

    activeActionKeys.add(actionKey);
    setIsRunning(true);

    try {
      await action();
      return true;
    } finally {
      activeActionKeys.delete(actionKey);
      setIsRunning(false);
    }
  }, [actionKey, isRunning]);

  return { run, isRunning };
};

