import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { DesktopIcon, MobileIcon, WifiIcon, WifiOffIcon } from '../Icons';

const DEVICE_ICON_MAP: Record<string, React.FC<{ size?: number }>> = {
  Desktop: DesktopIcon,
  Tablet: MobileIcon,
  Mobile: MobileIcon,
};

const UserIndicator: React.FC = () => {
  const onlineCount = useSelector((s: RootState) => s.user.onlineCount);
  const devices = useSelector((s: RootState) => s.user.devices);
  const wsConnected = useSelector((s: RootState) => s.user.wsConnected);

  const desktopCount = devices.filter((d) => d.deviceType === 'Desktop').length;
  const tabletCount = devices.filter((d) => d.deviceType === 'Tablet').length;
  const mobileCount = devices.filter((d) => d.deviceType === 'Mobile').length;

  return (
    <div className={`user-indicator ${wsConnected ? 'connected' : 'disconnected'}`}>
      <span className="user-status-icon">
        {wsConnected ? <WifiIcon size={14} /> : <WifiOffIcon size={14} />}
      </span>
      {!wsConnected && <span className="user-status-dot" />}
      <span className="user-count-text">
        {wsConnected ? `在线: ${onlineCount}人` : '未连接'}
      </span>

      {wsConnected && onlineCount > 0 && (
        <span className="user-device-breakdown">
          {desktopCount > 0 && (
            <span className="device-count-item">
              <DesktopIcon size={12} /> ×{desktopCount}
            </span>
          )}
          {tabletCount > 0 && (
            <span className="device-count-item">
              <MobileIcon size={12} /> ×{tabletCount}
            </span>
          )}
          {mobileCount > 0 && (
            <span className="device-count-item">
              <MobileIcon size={12} /> ×{mobileCount}
            </span>
          )}
        </span>
      )}
    </div>
  );
};

export default React.memo(UserIndicator);
