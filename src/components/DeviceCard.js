import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

/**
 * DeviceCard — Memoized with custom comparison.
 * Re-renders only when any device data used in the component changes.
 */

const STATUS_CONFIG = {
  online: { color: '#22C55E', label: 'Online' },
  offline: { color: '#EF4444', label: 'Offline' },
  warning: { color: '#F59E0B', label: 'Warning' },
};

/** Device fields used in this component: id, status, lastSeen, name, type, location, battery */
function isDeviceEqual(prev, next) {
  if (prev === next) return true;
  if (!prev || !next) return false;
  return (
    prev.id === next.id &&
    prev.status === next.status &&
    prev.lastSeen === next.lastSeen &&
    prev.name === next.name &&
    prev.type === next.type &&
    prev.location === next.location &&
    prev.battery === next.battery
  );
}

function DeviceCard({ device, onPress }) {
  const status = STATUS_CONFIG[device.status] || { color: '#999', label: device.status };

  const lastSeenDate = new Date(device.lastSeen);
  const now = new Date();
  const diffMs = now - lastSeenDate;
  const diffMins = Math.floor(diffMs / 60000);

  let lastSeenText;
  if (diffMins < 1) lastSeenText = 'Just now';
  else if (diffMins < 60) lastSeenText = `${diffMins}m ago`;
  else if (diffMins < 1440) lastSeenText = `${Math.floor(diffMins / 60)}h ago`;
  else lastSeenText = lastSeenDate.toLocaleDateString();

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(device)}
      activeOpacity={0.7}
    >
      <View style={styles.left}>
        <View style={[styles.statusIndicator, { backgroundColor: status.color }]} />
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{device.name}</Text>
          <Text style={styles.meta} numberOfLines={1}>
            {device.type} · {device.location || 'No location'} · {lastSeenText}
          </Text>
        </View>
      </View>

      <View style={styles.right}>
        {device.battery !== null && (
          <View style={styles.battery}>
            <Text style={[
              styles.batteryText,
              device.battery < 20 && styles.batteryLow
            ]}>
              {device.battery}%
            </Text>
          </View>
        )}
        <Text style={styles.chevron}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

export default React.memo(DeviceCard, (prevProps, nextProps) =>
  isDeviceEqual(prevProps.device, nextProps.device)
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  info: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  meta: {
    fontSize: 13,
    color: '#888',
    textTransform: 'capitalize',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },
  battery: {},
  batteryText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  batteryLow: {
    color: '#EF4444',
    fontWeight: '700',
  },
  chevron: {
    fontSize: 20,
    color: '#CCC',
    lineHeight: 22,
  },
});
