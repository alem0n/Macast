import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from './store';
import { useWebSocket } from './hooks/useWebSocket';
import { useKeyboard } from './hooks/useKeyboard';
import VideoPlayer from './components/VideoPlayer';
import Playlist from './components/Playlist';
import CastInput from './components/CastInput';
import UserIndicator from './components/UserStatus/UserIndicator';
import './styles/global.css';
import './styles/player.css';
import './styles/playlist.css';
import './styles/responsive.css';

const App: React.FC = () => {
  useWebSocket();
  useKeyboard();

  const media = useSelector((s: RootState) => s.player.media);

  return (
    <div className="app-root">
      <header className="top-bar">
        <div className="top-bar-left">
          <span className="app-title">Macast Web Renderer</span>
          {media && (
            <span className="media-info">
              <span className="media-info-separator">|</span>
              当前: <span className="media-title">{media.title}</span>
              <span className="media-info-separator">|</span>
              格式: {media.format.toUpperCase()}
            </span>
          )}
        </div>
        <UserIndicator />
      </header>

      <div className="app-body">
        <main className="main-content">
          <VideoPlayer />
        </main>
        <Playlist />
      </div>

      <footer className="bottom-bar">
        <CastInput />
      </footer>
    </div>
  );
};

export default App;
