import React, { useState, useCallback } from 'react';
import { postCast } from '../../services/api';
import { LinkIcon } from '../Icons';

type InputState = 'normal' | 'loading' | 'success' | 'error';

const CastInput: React.FC = () => {
  const [url, setUrl] = useState('');
  const [inputState, setInputState] = useState<InputState>('normal');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = useCallback(async () => {
    const trimmed = url.trim();
    if (!trimmed) {
      setErrorMsg('请输入视频URL');
      setInputState('error');
      return;
    }

    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      setErrorMsg('URL必须以 http:// 或 https:// 开头');
      setInputState('error');
      return;
    }

    setInputState('loading');
    setErrorMsg('');

    try {
      console.log(`[CastInput] manual cast url=${trimmed.substring(0, 80)}`);
      const result = await postCast(trimmed);
      console.log(`[CastInput] OK — server assigned id=${result.media.id} title="${result.media.title}"`);
      setInputState('success');
      setUrl('');
      setTimeout(() => setInputState('normal'), 2000);
    } catch (err: any) {
      console.log(`[CastInput] FAILED — ${err?.message || err}`);
      setErrorMsg(err.message || '投屏失败');
      setInputState('error');
    }
  }, [url]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  return (
    <div className="cast-input-bar">
      <div className={`cast-input-wrapper cast-input-${inputState}`}>
        <span className="cast-input-icon">
          <LinkIcon size={16} />
        </span>
        <input
          type="text"
          className="cast-input-field"
          placeholder="粘贴视频链接（支持 MP4、WebM、M3U8、MPD）"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (inputState === 'error') setInputState('normal');
          }}
          onKeyDown={handleKeyDown}
          disabled={inputState === 'loading'}
        />
        <button
          className="cast-submit-btn"
          onClick={handleSubmit}
          disabled={inputState === 'loading'}
        >
          {inputState === 'loading' ? '加载中...' : '加载'}
        </button>
      </div>
      {inputState === 'error' && errorMsg && (
        <p className="cast-input-error">{errorMsg}</p>
      )}
      <p className="cast-input-hint">由DLNA自动接收，也可手动粘贴视频链接</p>
    </div>
  );
};

export default CastInput;
