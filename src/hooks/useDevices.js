import { useState, useEffect, useCallback, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { fetchDevices as apiFetchDevices } from '../api/devices';
import { useDeviceCache } from './useDeviceCache';

/** Sync status for the device list. */
const SYNC_STATUS = {
  SYNCING: 'syncing',
  SYNCED: 'synced',
  ERROR: 'error',
  OFFLINE: 'offline',
};

/** Cache older than this when sync fails shows "Data may be outdated". */
const STALE_CACHE_THRESHOLD_MS = 60 * 60 * 1000;

/**
 * useDevices hook
 *
 * Fetches and manages device list state.
 *
 * BUGS in this file:
 * 1. fetchDevices is defined without useCallback — new reference on every render
 * 2. No cache integration — always shows loading state on mount
 * 3. No AbortController — can't cancel in-flight requests
 *
 * See BRIEF.md for full spec.
 */
export function useDevices() {
  const { getCachedDevices, setCachedDevices } = useDeviceCache();

  const [devices, setDevices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState(SYNC_STATUS.SYNCING);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [error, setError] = useState(null);

  const abortControllerRef = useRef(null);
  const initialLoadDoneRef = useRef(false);
  const fetchAllDevicesRef = useRef(null);
  const wasOfflineRef = useRef(null);

  const performFetch = useCallback(async (signal) => {
    setSyncStatus(SYNC_STATUS.SYNCING);
    setError(null);
    try {
      const data = await apiFetchDevices(signal);
      const now = Date.now();
      setDevices(data);
      setLastSyncedAt(now);
      setSyncStatus(SYNC_STATUS.SYNCED);
      await setCachedDevices(data);
      return data;
    } catch (err) {
      if (err?.name === 'AbortError') {
        return undefined;
      }
      setError(err?.message ?? 'Sync failed');
      setSyncStatus(SYNC_STATUS.ERROR);
      return undefined;
    } finally {
      if (initialLoadDoneRef.current === false) {
        initialLoadDoneRef.current = true;
        setIsLoading(false);
      }
    }
  }, [setCachedDevices]);

  const fetchAllDevices = useCallback(async () => {
    setSyncStatus(SYNC_STATUS.SYNCING);
    setError(null);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const netState = await NetInfo.fetch();
    if (!netState?.isConnected) {
      setSyncStatus(SYNC_STATUS.OFFLINE);
      if (initialLoadDoneRef.current === false) {
        initialLoadDoneRef.current = true;
        setIsLoading(false);
      }
      return undefined;
    }

    return performFetch(controller.signal);
  }, [performFetch]);

  fetchAllDevicesRef.current = fetchAllDevices;

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const cached = await getCachedDevices();
      if (cancelled) return;
      if (cached?.data?.length) {
        setDevices(cached.data);
        setLastSyncedAt(cached.timestamp);
        setIsLoading(false);
      }
      setSyncStatus(SYNC_STATUS.SYNCING);
      await fetchAllDevices();
    }

    init();
    return () => {
      cancelled = true;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = state?.isConnected === true;
      if (!connected) {
        wasOfflineRef.current = true;
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          abortControllerRef.current = null;
        }
        setSyncStatus(SYNC_STATUS.OFFLINE);
        setError(null);
        if (initialLoadDoneRef.current === false) {
          initialLoadDoneRef.current = true;
          setIsLoading(false);
        }
      } else {
        const reconnecting = wasOfflineRef.current === true;
        wasOfflineRef.current = false;
        setError(null);
        setSyncStatus(SYNC_STATUS.SYNCING);
        if (reconnecting) {
          fetchAllDevicesRef.current?.();
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const isStaleCacheOnError =
    syncStatus === SYNC_STATUS.ERROR &&
    lastSyncedAt != null &&
    Date.now() - lastSyncedAt > STALE_CACHE_THRESHOLD_MS;

  return {
    devices,
    isLoading,
    isSyncing: syncStatus === SYNC_STATUS.SYNCING,
    syncStatus,
    lastSyncedAt,
    error,
    isStaleCacheOnError,
    fetchDevices: fetchAllDevices,
    refresh: fetchAllDevices,
  };
}
