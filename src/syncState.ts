import type { Middleware, Reducer, Store, UnknownAction } from '@reduxjs/toolkit';
import type { BroadcastChannelOptions } from 'broadcast-channel';

import { BroadcastChannel } from 'broadcast-channel';

export type Sync = {
  $uuid: string;
  $window_uid: string;
  $isSynced: boolean;
};
export type SyncedAction = UnknownAction & Sync;
export type Predicate = ((action: UnknownAction) => boolean | null) | null;

export type SyncStateConfig = {
  channel: string;
  predicate?: Predicate;
  blacklist?: string[];
  whitelist?: string[];
  broadcastChannelOptions?: BroadcastChannelOptions;
  prepareState?: (state: unknown) => unknown;
  receiveState?: (prevState: unknown, state: unknown) => unknown;
};

export type MessageListenerConfig = {
  channel: BroadcastChannel;
  dispatch: (action: UnknownAction | SyncedAction) => void;
  allowed: Predicate;
};

let lastUuid = '';
export const GET_INIT_STATE = '&_GET_INIT_STATE';
export const SEND_INIT_STATE = '&_SEND_INIT_STATE';
export const RECEIVE_INIT_STATE = '&_RECEIVE_INIT_STATE';
export const INIT_MESSAGE_LISTENER = '&_INIT_MESSAGE_LISTENER';

const defaultConfig: SyncStateConfig = {
  channel: 'redux-state-sync',
  predicate: null,
  blacklist: [],
  whitelist: [],
  broadcastChannelOptions: undefined,
  prepareState: state => state,
  receiveState: (prevState, state) => state,
};

function getInitState() {
  return {
    type: GET_INIT_STATE,
  };
}
function sendInitState() {
  return {
    type: SEND_INIT_STATE,
  };
}
function receiveInitState(state: unknown) {
  return {
    type: RECEIVE_INIT_STATE,
    payload: state,
  };
}
function initListener() {
  return {
    type: INIT_MESSAGE_LISTENER,
  };
}

function s4() {
  return Math.floor((1 + Math.random()) * 0x10000)
    .toString(16)
    .substring(1);
}

function generateUuid() {
  return `${s4() + s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
}

// generate current window unique identifier
export const WINDOW_STATE_SYNC_ID = generateUuid();

// export for test
export function generateUuidForAction(action: UnknownAction): SyncedAction {
  const syncedAction = action;
  syncedAction.$uuid = generateUuid();
  syncedAction.$window_uid = WINDOW_STATE_SYNC_ID;
  return syncedAction as SyncedAction;
}

// export for test
export function isActionAllowed({ predicate, blacklist, whitelist }: SyncStateConfig): NonNullable<Predicate> {
  let allowed: typeof predicate = (_action: UnknownAction) => true;

  if (predicate && typeof predicate === 'function') {
    allowed = predicate;
  }
  else if (Array.isArray(blacklist) && blacklist.length > 0) {
    allowed = (action: UnknownAction) => !blacklist.includes(action.type);
  }
  else if (Array.isArray(whitelist) && whitelist.length > 0) {
    allowed = (action: UnknownAction) => whitelist.includes(action.type);
  }
  return allowed;
}

// export for test
export function isActionSynced(action: SyncedAction) {
  return !!action.$isSynced;
}

class MessageListener {
  messageChannel: BroadcastChannel;
  private isSynced = false;
  private tabs: Record<string, boolean> = {};

  constructor(private options: MessageListenerConfig) {
    this.messageChannel = options.channel;
    this.messageChannel.onmessage = this.handleMessage;
  }

  handleMessage = (syncedAction: SyncedAction): void => {
    const { dispatch, allowed } = this.options;

    // Ignore if this action is triggered by the current window
    if (syncedAction.$window_uid === WINDOW_STATE_SYNC_ID) {
      return;
    }
    // IE bug https://stackoverflow.com/questions/18265556/why-does-internet-explorer-fire-the-window-storage-event-on-the-window-that-st
    if (syncedAction.type === RECEIVE_INIT_STATE) {
      return;
    }
    // ignore other values that saved to localstorage.
    if (syncedAction.$uuid && syncedAction.$uuid !== lastUuid) {
      if (syncedAction.type === GET_INIT_STATE && !this.tabs[syncedAction.$window_uid]) {
        this.tabs[syncedAction.$window_uid] = true;
        dispatch(sendInitState());
      }
    }
    else if (syncedAction.type === SEND_INIT_STATE && !this.tabs[syncedAction.$window_uid]) {
      if (!this.isSynced) {
        this.isSynced = true;
        dispatch(receiveInitState(syncedAction.payload));
      }
    }
    else if (allowed?.(syncedAction)) {
      lastUuid = syncedAction.$uuid;
      dispatch(Object.assign(
        syncedAction,
        { $isSynced: true },
      ));
    }
  };
}

export function createStateSyncMiddleware(config = defaultConfig): Middleware {
  const allowed = isActionAllowed(config);
  const channel = new BroadcastChannel(config?.channel ?? 'redux-state-sync', config.broadcastChannelOptions);
  const prepareState = config.prepareState || defaultConfig.prepareState;
  let messageListener: MessageListener | null = null;

  return ({ getState, dispatch }) => next => (action: unknown) => {
    if (!messageListener) {
      messageListener = new MessageListener({ channel, allowed, dispatch });
    }
    if (action && typeof action === 'object' && !('$uuid' in action)) {
      const syncedAction = generateUuidForAction(action as SyncedAction);
      lastUuid = syncedAction.$uuid;

      try {
        if ('type' in action) {
          if (action.type === SEND_INIT_STATE) {
            if (getState()) {
              syncedAction.payload = prepareState?.(getState());
              channel.postMessage(syncedAction);
            }
          }
          if (allowed(syncedAction) || action.type === GET_INIT_STATE) {
            channel.postMessage(syncedAction);
          }
        }
      }
      catch (err) {
        console.error(err);
        console.error('Your browser doesn\'t support cross tab communication');
      }
    }

    return next(
      typeof action === 'object'
        ? Object.assign(action as SyncedAction, {
            $isSynced:
          typeof (action as SyncedAction)?.$isSynced === 'undefined'
            ? false
            : (action as SyncedAction)?.$isSynced,
          })
        : action,
    );
  };
}

export function createReduxStateSync<T extends Reducer>(appReducer: T, receiveState = defaultConfig.receiveState): T {
  const wrappedReducer = (state: unknown, action: any): T => {
    let initState = state;
    if (action.type === RECEIVE_INIT_STATE) {
      initState = receiveState?.(state, action.payload);
    }

    return appReducer(initState, action);
  };

  return wrappedReducer as T;
}

export const withReduxStateSync = createReduxStateSync;

export function initStateWithPrevTab({ dispatch }: Store) {
  dispatch(getInitState());
}

export function initMessageListener({ dispatch }: Store) {
  dispatch(initListener());
}
