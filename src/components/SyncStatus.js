import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

/**
 * SyncStatus — skeleton
 *
 * Implement this component as part of the offline-first feature.
 * See BRIEF.md → Feature → Sync status indicator.
 *
 * Props:
 *   status: 'syncing' | 'synced' | 'error' | 'offline'
 *   lastSyncedAt: number | null  (Date.now() timestamp of last successful sync)
 *   onRetry: () => void          (called when user taps error state)
 *   isStale: boolean             (when status is error and cache >1h old, show "Data may be outdated")
 *
 * States to display:
 *   syncing  → "Syncing..." with activity indicator
 *   synced   → "Updated just now" or "Updated 3 min ago"
 *   error    → "Sync failed — tap to retry"
 *   offline  → "Offline — showing cached data"
 *
 * The relative time ("3 min ago") should update every 30 seconds.
 * Don't cause layout shift when transitioning between states.
 */

const RELATIVE_TIME_INTERVAL_MS = 30000;

function getRelativeTime(timestamp) {
  if (timestamp == null || typeof timestamp !== "number") return null;
  const diffMs = Date.now() - timestamp;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  const hours = Math.floor(diffMins / 60);
  return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
}

export default function SyncStatus({ status, lastSyncedAt, onRetry, isStale }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (lastSyncedAt == null || status !== "synced") return;
    const id = setInterval(
      () => setTick((t) => t + 1),
      RELATIVE_TIME_INTERVAL_MS,
    );
    return () => clearInterval(id);
  }, [lastSyncedAt, status]);

  const relativeTime = getRelativeTime(lastSyncedAt);
  const syncedLabel = relativeTime
    ? `Updated ${relativeTime}`
    : "Updated just now";

  return (
    <View style={styles.container}>
      {status === "syncing" && (
        <>
          <ActivityIndicator
            size="small"
            color="#0066CC"
            style={styles.indicator}
          />
          <Text style={styles.text} adjustsFontSizeToFit numberOfLines={1}>
            Syncing...
          </Text>
        </>
      )}
      {status === "synced" && (
        <Text style={styles.text} adjustsFontSizeToFit numberOfLines={1}>
          {syncedLabel}
        </Text>
      )}
      {status === "error" && (
        <TouchableOpacity
          onPress={onRetry}
          activeOpacity={0.7}
          style={styles.touchable}
        >
          <View style={styles.errorContent}>
            <Text style={styles.text} adjustsFontSizeToFit numberOfLines={1}>
              Sync failed — tap to retry
            </Text>
            {isStale && (
              <Text style={styles.staleNote} numberOfLines={1}>
                Data may be outdated
              </Text>
            )}
          </View>
        </TouchableOpacity>
      )}
      {status === "offline" && (
        <Text adjustsFontSizeToFit numberOfLines={1} style={styles.text}>
          Offline — showing cached data
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#F0F0F0",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#DDD",
    minHeight: 36,
  },
  indicator: {
    marginRight: 8,
  },
  text: {
    fontSize: 12,
    color: "#666",
  },
  touchable: {
    flex: 1,
  },
  errorContent: {
    flex: 1,
  },
  staleNote: {
    fontSize: 11,
    color: "#999",
    marginTop: 2,
    fontStyle: "italic",
  },
});
