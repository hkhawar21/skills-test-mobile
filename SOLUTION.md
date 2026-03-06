First the setup of the repo was done and initially there was an error. Project was not running due to the following error

```
 ERROR  Invariant Violation: "main" has not been registered. This can happen if:
* Metro (the local dev server) is run from the wrong folder. Check if Metro is running, stop it and restart it in the current project.
* A module failed to load due to an error and `AppRegistry.registerComponent` wasn't called., js engine: hermes
```

It was fixed by the introduction of index.js and placing it as the starter point instead of App.js from package.json. Register component is called here. Also assets folder was missing so another project icon and splash image was attached in this repo to keep the app running.

These changes were made before the actual work on bug fixing was started.

Solution to Bug 1 — Excessive Re-renders on DeviceListScreen

- **Stable callbacks:** `fetchDevices` and list callbacks are wrapped in `useCallback` so child components (e.g. `DeviceCard`) do not get new function references on every render.
- **Memoized list items:** `DeviceCard` is wrapped in `React.memo` with a custom comparison that checks only the device fields used in the component (id, status, lastSeen, name, type, location, battery). List items re-render only when their data changes.
- **Throttled refetch instead of focus-based fetch:** The previous `useFocusEffect` (which re-fetched on every tab switch) was replaced by a timestamp-based interval: a single `setTimeout` loop refetches every 30 seconds. Manual pull-to-refresh resets this window so the next auto-fetch happens 30 seconds after the refresh. Tab changes no longer trigger a fetch unless the 30-second window has elapsed.

Solution to Bug 2 — Pull-to-Refresh Doesn't Work (Stale State)

- **Awaiting the fetch:** `handleRefresh` now `await`s `fetchDevices()` so the refresh spinner stays visible until the request completes and state is updated. The list then re-renders with the new `devices` from the hook.
- **Returned data:** `fetchDevices` returns the fetched devices array so callers (e.g. `handleRefresh`) can use the result in the same flow for analytics or other logic without relying on a stale closure.
- **Refresh bypasses throttle:** Pull-to-refresh always triggers an immediate fetch; the 30-second auto-fetch timer is reset after a manual refresh.

Solution to Feature: Offline-First Device List

- **Cache (AsyncStorage):** Implemented `useDeviceCache` with key `'devices_cache'`. Cache shape: `{ data: Device[], timestamp: number, version: number }`. Version is checked on read; if it does not match the current constant, the cache is discarded and the app treats it as a cold start. On every successful fetch, devices and timestamp are written so the list is available on next launch.
- **Sync status:** `SyncStatus` shows four states: **syncing** (with activity indicator), **synced** (“Updated just now” / “Updated X min ago”), **error** (“Sync failed — tap to retry”), **offline** (“Offline — showing cached data”). Relative time for “synced” updates every 30 seconds via `setInterval`.
- **Network awareness:** `@react-native-community/netinfo` is used to detect connectivity. When the app is offline, no fetch is attempted and status shows “Offline”; when the connection returns, a background sync runs automatically so data refreshes without user action. In-flight fetches are cancelled via `AbortController` when the user pulls to refresh or when the device goes offline.
- **Loading behaviour:** With cache: list is shown immediately and “Syncing…” appears while a background fetch runs; no full-screen loader. Without cache (first launch): full-screen “Loading devices…” until the first fetch completes. Empty cache plus offline shows an empty state: “You're offline and there's no cached data.”
- **SyncStatus layout:** `adjustsFontSizeToFit` and `numberOfLines={1}` are used on the status text so the bar keeps a consistent height across devices and font sizes while keeping the label visible.

Total time spent on all the tasks is 90 minutes approximately.
