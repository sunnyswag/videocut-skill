import { useRef } from '../preact.js';
import { useProjectDataState } from './useProjectDataState.js';
import { useVideoPlayerState } from './useVideoPlayerState.js';
import { useSelectionState } from './useSelectionState.js';
import { useCutActions } from './useCutActions.js';

export function useReviewState() {
  const videoRef = useRef(null);
  const wordRefs = useRef([]);
  const projectState = useProjectDataState();
  const videoState = useVideoPlayerState({
    videoRef,
    wordRefs,
    currentProjectId: projectState.currentProjectId,
    currentState: projectState.currentState,
    stateByProject: projectState.stateByProject,
  });
  const selectionState = useSelectionState({
    videoRef,
    currentProjectId: projectState.currentProjectId,
    currentState: projectState.currentState,
    setProjectState: projectState.setProjectState,
  });
  const cutState = useCutActions({
    currentProjectId: projectState.currentProjectId,
    currentState: projectState.currentState,
    duration: videoState.duration,
  });

  return {
    videoRef,
    wordRefs,
    projects: projectState.projects,
    currentProjectId: projectState.currentProjectId,
    setCurrentProjectId: projectState.setCurrentProjectId,
    words: projectState.words,
    selected: projectState.selected,
    autoSelected: projectState.autoSelected,
    currentTime: videoState.currentTime,
    duration: videoState.duration,
    currentWordIndex: videoState.currentWordIndex,
    loading: cutState.loading,
    burnSubtitle: cutState.burnSubtitle,
    errorText: projectState.errorText,
    selectedDuration: projectState.selectedDuration,
    progressPercent: cutState.progressPercent,
    progressText: cutState.progressText,
    handleVideoTimeUpdate: videoState.handleVideoTimeUpdate,
    handlePlayPause: videoState.handlePlayPause,
    handleCopyDeleteList: cutState.handleCopyDeleteList,
    handleExecuteCut: cutState.handleExecuteCut,
    setBurnSubtitle: cutState.setBurnSubtitle,
    handleClearAll: selectionState.handleClearAll,
    handleWordClick: selectionState.handleWordClick,
    toggleWord: selectionState.toggleWord,
    handleWordMouseDown: selectionState.handleWordMouseDown,
    handleWordMouseEnter: selectionState.handleWordMouseEnter,
  };
}
