import type { UnknownAction } from 'redux';

import { describe, expect, it } from 'vitest';

import { createStateSyncMiddleware, generateUuidForAction, isActionAllowed } from './index';

describe('action should have uuid', () => {
  it('action should have both $uuid and $window_uid', () => {
    const action = { type: 'Test', payload: 'Test' };
    const stampedAction = generateUuidForAction(action);
    expect(stampedAction.$uuid).toBeDefined();
    expect(stampedAction.$window_uid).toBeDefined();
  });
  it('action should have different $uuid and same $window_uid', () => {
    const action1 = { type: 'Test', payload: 'Test' };
    const action2 = { type: 'Test', payload: 'Test' };
    const stampedAction1 = generateUuidForAction(action1);
    const stampedAction2 = generateUuidForAction(action2);
    expect(stampedAction1.$uuid === stampedAction2.$uuid).toBeFalsy();
    expect(stampedAction1.$window_uid === stampedAction2.$window_uid).toBeTruthy();
  });
});

describe('is action allowed', () => {
  it('action in blacklist should not be triggered', () => {
    const channel = 'test-channel';
    const predicate = null;
    const blacklist = ['Test'];
    const whitelist = [] as string[];
    const allowed = isActionAllowed({
      channel,
      predicate,
      blacklist,
      whitelist,
    });
    const action = { type: 'Test', payload: 'Test' };
    expect(allowed(action)).toBeFalsy();
  });
  it('action in blacklist and whitelist should not be triggered', () => {
    const channel = 'test-channel';
    const predicate = null;
    const blacklist = ['Test'];
    const whitelist = ['Test'];
    const allowed = isActionAllowed({ channel, predicate, blacklist, whitelist });
    const action = { type: 'Test', payload: 'Test' };
    expect(allowed(action)).toBeFalsy();
  });
  it('action in blacklist and predicate should be triggered', () => {
    const channel = 'test-channel';
    const predicate = (action: UnknownAction) => action.type === 'Test' || action.payload === 'Test';
    const blacklist = ['Test'];
    const whitelist = ['Test'];
    const allowed = isActionAllowed({ channel, predicate, blacklist, whitelist });
    const action = { type: 'Test', payload: 'Test' };
    expect(allowed(action)).toBeTruthy();
    const action2 = { type: 'SecondTest', payload: 'Test' };
    expect(allowed(action2)).toBeTruthy();
  });
});

describe('state should be mapped', () => {
  it('state mapped to JSON', () => {
    const channel = 'test-channel';
    const mockState = {
      test: 'Test',
    };
    const mockStore = {
      getState: () => mockState,
      dispatch: () => {},
    };

    const next = (action: unknown) => expect((action as UnknownAction).payload).toEqual(JSON.stringify(mockState));
    // eslint-disable-next-line ts/ban-ts-comment
    // @ts-expect-error
    createStateSyncMiddleware({ channel, prepareState: JSON.stringify })(mockStore)(next)({ type: '&_SEND_INIT_STATE' });
  });
});
