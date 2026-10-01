import { useEffect, useState } from 'react';
// import { WINDOW_STATE_SYNC_ID } from '@mestuka/redux-state-sync';
import { WINDOW_STATE_SYNC_ID } from '../../src/index';
import { useAppDispatch, useAppSelector } from './app/hooks';
import heroImg from './assets/hero.png';
import reactLogo from './assets/react.svg';
import viteLogo from './assets/vite.svg';
import { decrement, increment } from './features/counterSlice';
import './App.css';

function App() {
  // The `state` arg is correctly typed as `RootState` already
  const count = useAppSelector(state => state.counter.value);
  const dispatch = useAppDispatch();
  const [windowId, setWindowId] = useState('');

  useEffect(() => {
    setWindowId(WINDOW_STATE_SYNC_ID);
  }, []);

  return (
    <>
      <section id="center">
        <div className="hero">
          <img src={heroImg} className="base" width="170" height="179" alt="" />
          <img src={reactLogo} className="framework" alt="React logo" />
          <img src={viteLogo} className="vite" alt="Vite logo" />
        </div>
        <div>
          <h1>Redux State Sync Demo</h1>
          <p>
            Open this page in multiple tabs to see state sync in action. Any changes in one tab will
            be reflected in all other tabs automatically.
          </p>
          <p style={{ fontSize: '12px', color: 'var(--text)' }}>
            Window ID:
            {' '}
            <code>
              {windowId.substring(0, 8)}
              ...
            </code>
          </p>
        </div>
        <div>
          <button
            aria-label="Increment value"
            className="counter"
            onClick={() => dispatch(increment())}
          >
            Increment
          </button>
          <button
            aria-label="Decrement value"
            className="counter"
            onClick={() => dispatch(decrement())}
          >
            Decrement
          </button>
        </div>
        <button
          type="button"
          className="counter"
          // onClick={() => setCount(count => count + 1)}
        >
          Count is
          {' '}
          {count}
        </button>
      </section>
    </>
  );
}

export default App;
