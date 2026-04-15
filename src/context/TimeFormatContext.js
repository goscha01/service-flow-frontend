import React, { createContext, useContext, useEffect, useState } from 'react';
import { businessDetailsAPI } from '../services/api';
import {
  formatTime as formatTimeBase,
  formatTimeRange as formatTimeRangeBase,
  getTimeFormat,
  setTimeFormat as setModuleTimeFormat,
  subscribeTimeFormat
} from '../utils/formatTime';
import { useAuth } from './AuthContext';

const TimeFormatContext = createContext({
  timeFormat: '12h',
  setTimeFormat: () => {},
  formatTime: (d) => formatTimeBase(d),
  formatTimeRange: (s, e) => formatTimeRangeBase(s, e)
});

export const TimeFormatProvider = ({ children }) => {
  const { user } = useAuth();
  const [timeFormat, setLocal] = useState(() => getTimeFormat());

  // Subscribe to module-level changes (for components that need re-render
  // when the business format flips).
  useEffect(() => {
    const unsub = subscribeTimeFormat((tf) => setLocal(tf));
    return () => unsub();
  }, []);

  // Fetch the business preference after login.
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await businessDetailsAPI.getBusinessDetails(user.id);
        if (cancelled) return;
        const tf = data?.timeFormat === '24h' ? '24h' : '12h';
        setModuleTimeFormat(tf);
      } catch (e) { /* fall back to cached */ }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const value = {
    timeFormat,
    setTimeFormat: setModuleTimeFormat,
    formatTime: (d) => formatTimeBase(d, timeFormat),
    formatTimeRange: (s, e) => formatTimeRangeBase(s, e, timeFormat)
  };

  return (
    <TimeFormatContext.Provider value={value}>{children}</TimeFormatContext.Provider>
  );
};

export const useTimeFormat = () => useContext(TimeFormatContext);
