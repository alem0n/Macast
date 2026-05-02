import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { setVolume, toggleMute } from '../../store/playerSlice';
import { VolumeHighIcon, VolumeMuteIcon } from '../Icons';

const VolumeControl: React.FC = () => {
  const dispatch = useDispatch();
  const volume = useSelector((s: RootState) => s.player.volume);
  const muted = useSelector((s: RootState) => s.player.muted);

  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      dispatch(setVolume(Number(e.target.value)));
    },
    [dispatch]
  );

  const handleToggleMute = useCallback(() => {
    dispatch(toggleMute());
  }, [dispatch]);

  return (
    <div className="volume-control">
      <button
        className="control-btn mute-btn"
        onClick={handleToggleMute}
        title={muted ? '取消静音 (M)' : '静音 (M)'}
        aria-label={muted ? '取消静音' : '静音'}
      >
        {muted || volume === 0 ? <VolumeMuteIcon size={20} /> : <VolumeHighIcon size={20} />}
      </button>
      <input
        type="range"
        className="volume-slider"
        min={0}
        max={100}
        value={muted ? 0 : volume}
        onChange={handleVolumeChange}
        aria-label="音量"
      />
    </div>
  );
};

export default React.memo(VolumeControl);
