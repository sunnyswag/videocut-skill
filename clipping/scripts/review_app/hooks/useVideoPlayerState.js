import { useEffect, useRef, useState } from '../preact.js';

export function useVideoPlayerState({ videoRef, wordRefs, currentProjectId, currentState, stateByProject }) {
  const skipRafRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);

  useEffect(() => {
    if (!currentProjectId || !videoRef.current) return;
    videoRef.current.src = '/api/video/' + encodeURIComponent(currentProjectId);
    setCurrentTime(0);
    setDuration(0);
    setCurrentWordIndex(-1);
  }, [currentProjectId, videoRef]);

  useEffect(() => {
    const onKeyDown = (e) => {
      const video = videoRef.current;
      if (!video) return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (video.paused) video.play(); else video.pause();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        video.currentTime = Math.max(0, video.currentTime - (e.shiftKey ? 5 : 1));
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        video.currentTime = video.currentTime + (e.shiftKey ? 5 : 1);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [videoRef]);

  useEffect(() => {
    const node = wordRefs.current[currentWordIndex];
    if (node) node.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [currentWordIndex, wordRefs]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentState) return undefined;

    const tick = () => {
      if (!video || video.paused || !currentProjectId) {
        skipRafRef.current = null;
        return;
      }
      const state = stateByProject[currentProjectId];
      if (!state) {
        skipRafRef.current = null;
        return;
      }
      const t = video.currentTime;
      const sortedSelected = Array.from(state.selected).sort((a, b) => a - b);
      for (let k = 0; k < sortedSelected.length; k += 1) {
        const i = sortedSelected[k];
        const w = state.words[i];
        if (!w) continue;
        if (t >= w.start && t < w.end) {
          let endTime = w.end;
          let j = k + 1;
          while (j < sortedSelected.length) {
            const nextW = state.words[sortedSelected[j]];
            if (nextW && nextW.start - endTime < 0.1) {
              endTime = nextW.end;
              j += 1;
            } else {
              break;
            }
          }
          video.currentTime = endTime;
          break;
        }
      }
      skipRafRef.current = requestAnimationFrame(tick);
    };

    const onPlay = () => {
      if (!skipRafRef.current) skipRafRef.current = requestAnimationFrame(tick);
    };
    const onPause = () => { skipRafRef.current = null; };
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      skipRafRef.current = null;
    };
  }, [currentProjectId, currentState, stateByProject, videoRef]);

  const handleVideoTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !currentState) return;
    const t = video.currentTime || 0;
    const d = video.duration || 0;
    setCurrentTime(t);
    setDuration(d);
    const idx = currentState.words.findIndex((w) => t >= w.start && t < w.end);
    setCurrentWordIndex(idx);
  };

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play();
    else video.pause();
  };

  return {
    currentTime,
    duration,
    currentWordIndex,
    handleVideoTimeUpdate,
    handlePlayPause,
  };
}
