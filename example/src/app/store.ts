import type { SyncStateConfig } from '../../../src/index';
import { configureStore } from '@reduxjs/toolkit';
import counterReducer from '@/features/counterSlice';
import { createStateSyncMiddleware, initMessageListener, initStateWithPrevTab } from '../../../src/index';

// Define RootState type for full type safety
export type RootState = {
  counter: {
    value: number;
  };
};

// Configure redux-state-sync with full type safety
// Using SyncStateConfig generic with RootState ensures type-safe state handling
const stateSyncConfig: SyncStateConfig<RootState> = {
  channel: 'redux-state-sync-example',
  blacklist: [], // All actions will be synced by default
  predicate: (action) => {
    console.warn('[StateSyncMiddleware] Action dispatched:', action.type);
    return true; // All actions pass through
  },
  prepareState: (state: RootState) => {
    // Prepare state for sending to other tabs
    console.warn('[StateSyncMiddleware] Preparing state for other tabs:', state);
    return state;
  },
  receiveState: (_prevState: RootState, nextState: RootState) => {
    // Merge received state from other tabs
    console.warn('[StateSyncMiddleware] Received state from other tab:', nextState);
    return nextState;
  },
};

export const store = configureStore({
  reducer: {
    counter: counterReducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware().concat(
      // Create middleware with generic type for type-safe state handling
      createStateSyncMiddleware<RootState>(stateSyncConfig),
    ),
});

// Initialize message listener to receive and sync state from other tabs
console.warn('[Store] Initializing state sync listener...');
initMessageListener(store);
console.warn('[Store] State sync listener initialized');

// Request initial state from previous tab if it exists
console.warn('[Store] Requesting initial state from previous tab...');
initStateWithPrevTab(store);
console.warn('[Store] Initial state request sent');

// Infer types from the store
export type AppDispatch = typeof store.dispatch;
export type AppStore = typeof store;
