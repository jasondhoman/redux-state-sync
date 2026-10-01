import type { UnknownAction } from 'redux';

import { describe, expect, it } from 'vitest';

import {
  generateUuidForAction,
  isActionAllowed,
} from './index';

describe('multi-tab state sync - core logic', () => {
  it('should add uuid and window_uid to actions', () => {
    const action = { type: 'INCREMENT' };
    const syncedAction = generateUuidForAction(action);

    expect(syncedAction.$uuid).toBeDefined();
    expect(syncedAction.$window_uid).toBeDefined();
    expect(syncedAction.type).toBe('INCREMENT');
    expect(typeof syncedAction.$uuid).toBe('string');
    expect(syncedAction.$uuid.length).toBeGreaterThan(0);
  });

  it('should generate different uuids for different actions', () => {
    const action1 = generateUuidForAction({ type: 'ACTION1' });
    const action2 = generateUuidForAction({ type: 'ACTION2' });

    expect(action1.$uuid).not.toBe(action2.$uuid);
    expect(action1.$window_uid).toBe(action2.$window_uid);
  });

  it('should preserve original action properties', () => {
    const originalAction = { type: 'TEST', payload: { data: 'value' } };
    const syncedAction = generateUuidForAction(originalAction);

    expect(syncedAction.type).toBe('TEST');
    expect(syncedAction.payload).toEqual({ data: 'value' });
  });

  describe('isActionAllowed', () => {
    it('should allow all actions by default', () => {
      const allowed = isActionAllowed({
        channel: 'test',
        blacklist: [],
        whitelist: [],
        predicate: null,
      });

      expect(allowed({ type: 'ANY_ACTION' } as UnknownAction)).toBe(true);
      expect(allowed({ type: 'ANOTHER_ACTION' } as UnknownAction)).toBe(true);
    });

    it('should filter by blacklist', () => {
      const allowed = isActionAllowed({
        channel: 'test',
        blacklist: ['BLOCKED_ACTION', 'ANOTHER_BLOCKED'],
        whitelist: [],
        predicate: null,
      });

      expect(allowed({ type: 'BLOCKED_ACTION' } as UnknownAction)).toBe(false);
      expect(allowed({ type: 'ANOTHER_BLOCKED' } as UnknownAction)).toBe(false);
      expect(allowed({ type: 'ALLOWED_ACTION' } as UnknownAction)).toBe(true);
    });

    it('should filter by whitelist', () => {
      const allowed = isActionAllowed({
        channel: 'test',
        blacklist: [],
        whitelist: ['ALLOWED_ACTION', 'ANOTHER_ALLOWED'],
        predicate: null,
      });

      expect(allowed({ type: 'ALLOWED_ACTION' } as UnknownAction)).toBe(true);
      expect(allowed({ type: 'ANOTHER_ALLOWED' } as UnknownAction)).toBe(true);
      expect(allowed({ type: 'BLOCKED_ACTION' } as UnknownAction)).toBe(false);
    });

    it('should use predicate when set (takes priority)', () => {
      const allowed = isActionAllowed({
        channel: 'test',
        blacklist: ['BLOCKED'],
        whitelist: [],
        predicate: action => (action.type as string).startsWith('SYNC_'),
      });

      // Predicate overrides blacklist
      expect(allowed({ type: 'SYNC_BLOCKED' } as UnknownAction)).toBe(true);
      expect(allowed({ type: 'BLOCKED' } as UnknownAction)).toBe(false);
      expect(allowed({ type: 'OTHER' } as UnknownAction)).toBe(false);
    });

    it('should handle empty blacklist and whitelist', () => {
      const allowed = isActionAllowed({
        channel: 'test',
        blacklist: [],
        whitelist: [],
        predicate: null,
      });

      expect(allowed({ type: 'ACTION' } as UnknownAction)).toBe(true);
    });

    it('should prioritize predicate over blacklist and whitelist', () => {
      const allowed = isActionAllowed({
        channel: 'test',
        blacklist: ['ACTION'],
        whitelist: ['OTHER'],
        predicate: () => true,
      });

      expect(allowed({ type: 'ACTION' } as UnknownAction)).toBe(true);
      expect(allowed({ type: 'OTHER' } as UnknownAction)).toBe(true);
      expect(allowed({ type: 'ANYTHING' } as UnknownAction)).toBe(true);
    });

    it('should handle predicate returning false', () => {
      const allowed = isActionAllowed({
        channel: 'test',
        blacklist: [],
        whitelist: [],
        predicate: action => (action.type as string).length > 10,
      });

      expect(allowed({ type: 'SHORT' } as UnknownAction)).toBe(false);
      expect(allowed({ type: 'VERY_LONG_ACTION_NAME' } as UnknownAction)).toBe(true);
    });
  });
});
