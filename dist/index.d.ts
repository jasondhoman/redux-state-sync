import { BroadcastChannel as BroadcastChannel_2 } from 'broadcast-channel';
import { BroadcastChannelOptions } from 'broadcast-channel';
import { Middleware } from '@reduxjs/toolkit';
import { Reducer } from '@reduxjs/toolkit';
import { Store } from '@reduxjs/toolkit';
import { UnknownAction } from '@reduxjs/toolkit';

export declare function createReduxStateSync<S, A extends UnknownAction = UnknownAction>(appReducer: Reducer<S, A>, receiveState?: (prevState: S, nextState: unknown) => S): Reducer<S, A>;

export declare function createStateSyncMiddleware<S = unknown, A extends UnknownAction = UnknownAction>(config?: SyncStateConfig<S, A>): Middleware<Record<string, unknown>, S, any>;

export declare function generateUuidForAction<A extends UnknownAction>(action: A): SyncedAction<A>;

export declare const GET_INIT_STATE = "&_GET_INIT_STATE";

export declare const INIT_MESSAGE_LISTENER = "&_INIT_MESSAGE_LISTENER";

export declare function initMessageListener<A extends UnknownAction = UnknownAction>({ dispatch }: Store<any, A>): void;

export declare function initStateWithPrevTab<A extends UnknownAction = UnknownAction>({ dispatch }: Store<any, A>): void;

export declare function isActionAllowed<A extends UnknownAction = UnknownAction>({ predicate, blacklist, whitelist }: Omit<SyncStateConfig<unknown, A>, 'prepareState' | 'receiveState'>): NonNullable<Predicate<A>>;

export declare function isActionSynced<A extends UnknownAction = UnknownAction>(action: SyncedAction<A>): boolean;

export declare type MessageListenerConfig<A extends UnknownAction = UnknownAction> = {
    channel: BroadcastChannel_2;
    dispatch: (action: A | SyncedAction<A>) => void;
    allowed: Predicate<A>;
};

export declare type Predicate<A extends UnknownAction = UnknownAction> = ((action: A) => boolean | null) | null;

export declare const RECEIVE_INIT_STATE = "&_RECEIVE_INIT_STATE";

export declare const SEND_INIT_STATE = "&_SEND_INIT_STATE";

export declare type StateSyncConfig<S = unknown, A extends UnknownAction = UnknownAction> = SyncStateConfig<S, A>;

export declare type Sync = {
    $uuid: string;
    $window_uid: string;
    $isSynced: boolean;
};

export declare type SyncedAction<A extends UnknownAction = UnknownAction> = A & Sync & {
    payload?: unknown;
};

export declare type SyncStateConfig<S = unknown, A extends UnknownAction = UnknownAction> = {
    channel: string;
    predicate?: Predicate<A>;
    blacklist?: string[];
    whitelist?: string[];
    broadcastChannelOptions?: BroadcastChannelOptions;
    prepareState?: (state: S) => S;
    receiveState?: (prevState: S, nextState: S) => S;
};

export declare const WINDOW_STATE_SYNC_ID: string;

export declare const withReduxStateSync: typeof createReduxStateSync;

export { }
