import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Text,
} from "react-native";
import { useDevices } from "../hooks/useDevices";
import DeviceCard from "../components/DeviceCard";
import EmptyState from "../components/EmptyState";
import ErrorBanner from "../components/ErrorBanner";
import SyncStatus from "../components/SyncStatus";

/**
 * DeviceListScreen
 *
 * Fetches devices on mount (via useDevices), then auto-fetches every 30 seconds.
 * Manual pull-to-refresh resets the 30-second window (next auto-fetch 30s after refresh).
 *
 * See BRIEF.md for full spec.
 */
const AUTO_FETCH_INTERVAL_MS = 30000;

export default function DeviceListScreen({ navigation }) {
  const { devices, isLoading, syncStatus, lastSyncedAt, error, isStaleCacheOnError, fetchDevices } = useDevices();
  const [refreshing, setRefreshing] = useState(false);

  const fetchDevicesRef = useRef(fetchDevices);
  fetchDevicesRef.current = fetchDevices;

  const lastFetchedAtRef = useRef(Date.now());
  const timeoutRef = useRef(null);
  const resetTimerRef = useRef(null);

  useEffect(() => {
    const scheduleNextFetch = () => {
      const delay = Math.max(
        0,
        lastFetchedAtRef.current + AUTO_FETCH_INTERVAL_MS - Date.now(),
      );
      timeoutRef.current = setTimeout(async () => {
        await fetchDevicesRef.current?.();
        lastFetchedAtRef.current = Date.now();
        scheduleNextFetch();
      }, delay);
    };

    resetTimerRef.current = () => {
      lastFetchedAtRef.current = Date.now();
      if (timeoutRef.current != null) clearTimeout(timeoutRef.current);
      scheduleNextFetch();
    };

    scheduleNextFetch();

    return () => {
      if (timeoutRef.current != null) clearTimeout(timeoutRef.current);
      resetTimerRef.current = null;
    };
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    const devices = await fetchDevices();
    // We can use this devices variable to update the state
    // This devices variable contains the updated devices list in the same render cycle
    resetTimerRef.current?.();
    setRefreshing(false);
  };

  const handleDevicePress = useCallback(
    (device) => {
      navigation.navigate("DeviceDetail", { deviceId: device.id });
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }) => <DeviceCard device={item} onPress={handleDevicePress} />,
    [handleDevicePress],
  );

  const keyExtractor = (item) => item.id;

  if (isLoading && devices.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Loading devices...</Text>
      </View>
    );
  }

  const showEmptyOffline = syncStatus === "offline" && devices.length === 0;

  return (
    <View style={styles.container}>
      {error && <ErrorBanner message={error} onRetry={fetchDevices} />}

      <SyncStatus
        status={syncStatus}
        lastSyncedAt={lastSyncedAt}
        onRetry={fetchDevices}
        isStale={isStaleCacheOnError}
      />

      {showEmptyOffline ? (
        <View style={styles.emptyContainer}>
          <EmptyState message="You're offline and there's no cached data" />
        </View>
      ) : (
      <FlatList
        data={devices}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={
          devices.length === 0 ? styles.emptyContainer : styles.listContent
        }
        ListEmptyComponent={<EmptyState message="No devices found" />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#0066CC"]}
            tintColor="#0066CC"
          />
        }
      />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
  },
  listContent: {
    padding: 16,
    gap: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
