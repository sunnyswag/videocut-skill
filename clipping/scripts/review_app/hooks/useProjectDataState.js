import { useEffect, useMemo, useState } from '../preact.js';
import { fetchProjectData, fetchProjects } from '../api.js';

export function useProjectDataState() {
  const [projects, setProjects] = useState([]);
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [stateByProject, setStateByProject] = useState({});
  const [errorText, setErrorText] = useState('');

  const currentState = currentProjectId ? stateByProject[currentProjectId] : null;
  const words = currentState?.words || [];
  const selected = currentState?.selected || new Set();
  const autoSelected = currentState?.autoSelected || new Set();

  const selectedDuration = useMemo(() => {
    let total = 0;
    selected.forEach((i) => { total += (words[i]?.end || 0) - (words[i]?.start || 0); });
    return total;
  }, [selected, words]);

  const setProjectState = (projectId, updater) => {
    setStateByProject((prev) => {
      const prevState = prev[projectId];
      if (!prevState) return prev;
      const nextState = updater(prevState);
      return { ...prev, [projectId]: nextState };
    });
  };

  const loadOneProject = async (projectId) => {
    const data = await fetchProjectData(projectId);
    const projectWords = data.words || [];
    const projectAutoSelected = new Set(Array.isArray(data.autoSelected) ? data.autoSelected : []);
    const projectSelected = new Set(projectAutoSelected);
    setStateByProject((prev) => ({
      ...prev,
      [projectId]: {
        words: projectWords,
        autoSelected: projectAutoSelected,
        selected: projectSelected,
      },
    }));
  };

  useEffect(() => {
    (async () => {
      try {
        const list = await fetchProjects();
        setProjects(list);
        if (!list.length) return;
        setCurrentProjectId(list[0].id);
        for (const p of list) {
          // eslint-disable-next-line no-await-in-loop
          await loadOneProject(p.id);
        }
      } catch (err) {
        setErrorText(err.message || String(err));
      }
    })();
  }, []);

  return {
    projects,
    currentProjectId,
    setCurrentProjectId,
    stateByProject,
    setProjectState,
    currentState,
    words,
    selected,
    autoSelected,
    selectedDuration,
    errorText,
  };
}
