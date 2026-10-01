import type { Middleware, Reducer, Store, UnknownAction } from '@reduxjs/toolkit';
import type { BroadcastChannelOptions } from 'broadcast-channel';

import { BroadcastChannel } from 'broadcast-channel';

export type Sync = {
  $uuid: string;
  $window_uid: string;
  $isSynced: boolean;
};

export type SyncedAction<A extends UnknownAction = UnknownAction> = A & Sync & { payload?: unknown };

export type Predicate<A extends UnknownAction = UnknownAction> = ((action: A) => boolean | null) | null;

export type SyncStateConfig<S = unknown, A extends UnknownAction = UnknownAction> = {
  channel: string;
  predicate?: Predicate<A>;
  blacklist?: string[];
  whitelist?: string[];
  broadcastChannelOptions?: BroadcastChannelOptions;
  prepareState?: (state: S) => S;
  receiveState?: (prevState: S, nextState: S) => S;
};

export type StateSyncConfig<S = unknown, A extends UnknownAction = UnknownAction> = SyncStateConfig<S, A>;

export type MessageListenerConfig<A extends UnknownAction = UnknownAction> = {
  channel: BroadcastChannel;
  dispatch: (action: A | SyncedAction<A>) => void;
  allowed: Predicate<A>;
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
  prepareState: (state: unknown) => state,
  receiveState: (_prevState: unknown, state: unknown) => state,
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

function receiveInitState<S = unknown>(state: S) {
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
export function generateUuidForAction<A extends UnknownAction>(action: A): SyncedAction<A> {
  const syncedAction = action as SyncedAction<A>;
  syncedAction.$uuid = generateUuid();
  syncedAction.$window_uid = WINDOW_STATE_SYNC_ID;
  return syncedAction;
}

// export for test
export function isActionAllowed<A extends UnknownAction = UnknownAction>(
  { predicate, blacklist, whitelist }: Omit<SyncStateConfig<unknown, A>, 'prepareState' | 'receiveState'>,
): NonNullable<Predicate<A>> {
  let allowed: Predicate<A> = (_action: A) => true;

  if (predicate && typeof predicate === 'function') {
    allowed = predicate;
  }
  else if (Array.isArray(blacklist) && blacklist.length > 0) {
    allowed = (action: A) => !blacklist.includes((action as UnknownAction).type as string);
  }
  else if (Array.isArray(whitelist) && whitelist.length > 0) {
    allowed = (action: A) => whitelist.includes((action as UnknownAction).type as string);
  }
  return allowed;
}

// export for test
export function isActionSynced<A extends UnknownAction = UnknownAction>(action: SyncedAction<A>): boolean {
  return !!action.$isSynced;
}

class MessageListener<A extends UnknownAction = UnknownAction> {
  messageChannel: BroadcastChannel;
  private isSynced = false;
  private tabs: Record<string, boolean> = {};

  constructor(private options: MessageListenerConfig<A>) {
    this.messageChannel = options.channel;
    this.messageChannel.onmessage = this.handleMessage;
  }

  handleMessage = (syncedAction: SyncedAction<A>): void => {
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
        dispatch(sendInitState() as A);
      }
      else if (syncedAction.type === SEND_INIT_STATE && !this.tabs[syncedAction.$window_uid]) {
        if (!this.isSynced) {
          this.isSynced = true;
          const { payload } = syncedAction.payload as SyncedAction<A>;
          dispatch(receiveInitState(payload) as unknown as A);
        }
      }
      else if (allowed?.(syncedAction)) {
        lastUuid = syncedAction.$uuid;
        dispatch(
          Object.assign(syncedAction, {
            $isSynced: true,
          }),
        );
      }
    }
    else if ((syncedAction.type as string) === SEND_INIT_STATE && !this.tabs[syncedAction.$window_uid]) {
      if (!this.isSynced) {
        this.isSynced = true;
        dispatch(receiveInitState(syncedAction.payload) as unknown as A);
      }
    }
  };
}

export function createStateSyncMiddleware<S = unknown, A extends UnknownAction = UnknownAction>(
  config: SyncStateConfig<S, A> = defaultConfig as SyncStateConfig<S, A>,
): Middleware<Record<string, unknown>, S, any> {
  const allowed = isActionAllowed<A>({
    predicate: config.predicate,
    blacklist: config.blacklist,
    whitelist: config.whitelist,
    channel: config.channel,
  });
  const channel = new BroadcastChannel(config?.channel ?? 'redux-state-sync', config.broadcastChannelOptions);
  const prepareState = config.prepareState || ((state: unknown) => state);
  let messageListener: MessageListener<A> | null = null;

  return ({ getState, dispatch }) => next => (action: unknown) => {
    if (!messageListener) {
      messageListener = new MessageListener({ channel, allowed, dispatch: dispatch as any });
    }
    if (action && typeof action === 'object' && !('$uuid' in action)) {
      const syncedAction = generateUuidForAction(action as A);
      lastUuid = syncedAction.$uuid;

      try {
        if ('type' in action) {
          if ((action.type as string) === SEND_INIT_STATE) {
            if (getState()) {
              syncedAction.payload = prepareState?.(getState());
              channel.postMessage(syncedAction);
            }
          }
          if (allowed(syncedAction) || (action.type as string) === GET_INIT_STATE) {
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
        ? Object.assign(action as SyncedAction<A>, {
            $isSynced:
          typeof (action as SyncedAction<A>)?.$isSynced === 'undefined'
            ? false
            : (action as SyncedAction<A>)?.$isSynced,
          })
        : action,
    );
  };
}

export function createReduxStateSync<S, A extends UnknownAction = UnknownAction>(
  appReducer: Reducer<S, A>,
  receiveState: (prevState: S, nextState: unknown) => S = defaultConfig.receiveState as any,
): Reducer<S, A> {
  const wrappedReducer = (state: S | undefined, action: A): S => {
    let initState = state;
    if ((action.type as string) === RECEIVE_INIT_STATE) {
      initState = receiveState?.(state as S, (action as any).payload);
    }

    return appReducer(initState, action);
  };

  return wrappedReducer;
}

export const withReduxStateSync = createReduxStateSync;

export function initStateWithPrevTab<A extends UnknownAction = UnknownAction>({ dispatch }: Store<any, A>): void {
  dispatch(getInitState() as A);
}

export function initMessageListener<A extends UnknownAction = UnknownAction>({ dispatch }: Store<any, A>): void {
  dispatch(initListener() as A);
}
