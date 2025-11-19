import * as React from 'react';
import { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { DEFAULT_LIST_WATCH_RESULT } from '@odh-dashboard/internal/utilities/const';
import { ProjectsContext, byName } from '@odh-dashboard/internal/concepts/projects/ProjectsContext';
import { CustomWatchK8sResult } from '@odh-dashboard/internal/types';
import { usePyTorchJobs, useTrainJobs, useRayJobs } from '../api';
import { PyTorchJobKind, TrainJobKind, RayJobKind } from '../k8sTypes';

type ModelTrainingContextType = {
  pytorchJobs: CustomWatchK8sResult<PyTorchJobKind[]>;
  trainJobs: CustomWatchK8sResult<TrainJobKind[]>;
  rayJobs: CustomWatchK8sResult<RayJobKind[]>;
  project?: ProjectKind | null;
  preferredProject?: ProjectKind | null;
  projects?: ProjectKind[] | null;
};

type ModelTrainingContextProviderProps = {
  children: React.ReactNode;
  namespace?: string;
};

export const ModelTrainingContext = React.createContext<ModelTrainingContextType>({
  pytorchJobs: DEFAULT_LIST_WATCH_RESULT,
  trainJobs: DEFAULT_LIST_WATCH_RESULT,
  rayJobs: DEFAULT_LIST_WATCH_RESULT,
  project: null,
  preferredProject: null,
  projects: null,
});

export const ModelTrainingContextProvider: React.FC<ModelTrainingContextProviderProps> = ({
  children,
  namespace,
}) => {
  const { projects, preferredProject } = React.useContext(ProjectsContext);
  const project = projects.find(byName(namespace)) ?? null;

  const pytorchJobs = usePyTorchJobs(namespace ?? '');
  const trainJobs = useTrainJobs(namespace ?? '');
  const rayJobs = useRayJobs(namespace ?? '');

  const contextValue = React.useMemo(
    () => ({
      pytorchJobs,
      trainJobs,
      rayJobs,
      project,
      preferredProject,
      projects,
    }),
    [pytorchJobs, trainJobs, rayJobs, project, preferredProject, projects],
  );

  return (
    <ModelTrainingContext.Provider value={contextValue}>{children}</ModelTrainingContext.Provider>
  );
};

export const useModelTrainingContext = (): ModelTrainingContextType =>
  React.useContext(ModelTrainingContext);
