import { useState, useMemo, useCallback } from 'react';
import { formatTime, toFloat, calcShiftStats, normalizeSearch } from '../utils/pos';

export const useSessionActivity = ({
  orders = []
}) => {
  const [sessionStartTime] = useState(new Date());
  const [sessionActivities, setSessionActivities] = useState([
    { id: 'start', time: formatTime(new Date()), type: 'Shift Started', details: 'Session initialized' }
  ]);
  const [sessionOrders, setSessionOrders] = useState([]);
  const [showShiftPanel, setShowShiftPanel] = useState(false);
  const [sessionMetrics, setSessionActivitiesCount] = useState({ holds: 0, voids: 0, overrides: 0, reprints: 0 });

  const [showTimeline, setShowTimeline] = useState(false);
  const [timelineFilter, setTimelineFilter] = useState('All');
  const [timelineSearch, setTimelineSearch] = useState('');

  const [showHardwareDashboard, setShowHardwareDashboard] = useState(false);
  const [hardwareLogs, setHardwareLogs] = useState([
    { id: 1, time: formatTime(new Date()), event: 'System Boot', device: 'Main Terminal', status: 'success' }
  ]);
  const [lastHardwareAction, setLastHardwareAction] = useState({
    scanner: '-', printer: '-', drawer: '-', checkout: '-'
  });

  const addSessionActivity = useCallback((type, details, category = 'Sales', status = 'info') => {
    setSessionActivities(prev => [{
      id: Date.now(),
      time: formatTime(new Date()),
      type,
      details,
      category,
      status
    }, ...prev].slice(0, 100));
  }, []);

  const addHardwareLog = useCallback((event, device, status = 'info') => {
    const time = formatTime(new Date());
    setHardwareLogs(prev => [{ id: Date.now(), time, event, device, status }, ...prev].slice(0, 20));
    if (device === 'Barcode Scanner') setLastHardwareAction(prev => ({ ...prev, scanner: time }));
    if (device === 'Receipt Printer') setLastHardwareAction(prev => ({ ...prev, printer: time }));
    if (device === 'Cash Drawer') setLastHardwareAction(prev => ({ ...prev, drawer: time }));
  }, []);

  const shiftStats = useMemo(() => calcShiftStats(sessionOrders), [sessionOrders]);

  const filteredTimeline = useMemo(() => {
    const term = normalizeSearch(timelineSearch);
    return sessionActivities.filter(act => {
      const matchesSearch = !term ||
        normalizeSearch(act.type).includes(term) ||
        normalizeSearch(act.details).includes(term);
      const matchesFilter = timelineFilter === 'All' || act.category === timelineFilter;
      return matchesSearch && matchesFilter;
    });
  }, [sessionActivities, timelineSearch, timelineFilter]);

  const timelineStats = useMemo(() => {
    return {
      added: sessionActivities.filter(a => a.type === 'Item Added').length,
      completed: sessionActivities.filter(a => a.type === 'Sale Completed').length,
      overrides: sessionActivities.filter(a => a.category === 'Manager').length,
      alerts: sessionActivities.filter(a => a.category === 'Inventory Alerts').length,
    };
  }, [sessionActivities]);

  return {
    sessionStartTime,
    sessionActivities,
    sessionOrders, setSessionOrders,
    showShiftPanel, setShowShiftPanel,
    sessionMetrics, setSessionActivitiesCount,
    showTimeline, setShowTimeline,
    timelineFilter, setTimelineFilter,
    timelineSearch, setTimelineSearch,
    showHardwareDashboard, setShowHardwareDashboard,
    hardwareLogs,
    lastHardwareAction, setLastHardwareAction,
    addSessionActivity,
    addHardwareLog,
    shiftStats,
    filteredTimeline,
    timelineStats
  };
};
