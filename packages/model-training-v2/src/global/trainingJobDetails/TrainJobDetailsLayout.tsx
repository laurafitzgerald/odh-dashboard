import React from 'react';
import {
  Stack,
  StackItem,
  Grid,
  GridItem,
  Card,
  CardBody,
  CardTitle,
  Divider,
  Flex,
  FlexItem,
  Label,
  List,
  ListItem,
  Skeleton,
  EmptyState,
  EmptyStateBody,
  Title,
  PageSection,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  Button,
  Tooltip,
  ExpandableSection,
  Tabs,
  Tab,
  TabTitleText,
  Dropdown,
  DropdownList,
  DropdownItem,
  MenuToggle,
  MenuToggleElement,
  Truncate,
  Modal,
  ModalVariant,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { CubesIcon, ExclamationCircleIcon, AngleRightIcon, SyncAltIcon, ExpandIcon } from '@patternfly/react-icons';
import DashboardLogViewer from '@odh-dashboard/internal/concepts/dashboard/DashboardLogViewer';
import { TrainJobKind } from '../../k8sTypes';
import { getJobsForTrainJob, getPodsForTrainJob, JobKind } from '../../api';
import { PodKind } from '@odh-dashboard/internal/k8sTypes';
import useTrainJobFetchLogs from './useTrainJobFetchLogs';
import useTrainJobPodContainerLogState, { PodContainer } from './useTrainJobPodContainerLogState';
import SimpleTerminal from './components/SimpleTerminal';

type TrainJobDetailsLayoutProps = {
  job: TrainJobKind;
};

// Enhanced Job info with Kubernetes Job and Pod data
type JobInfo = {
  job: JobKind;
  type: 'dataset-initializer' | 'model-initializer' | 'trainer';
  pods: PodKind[];
};

const TrainJobDetailsLayout: React.FC<TrainJobDetailsLayoutProps> = ({ job }) => {
  const [jobs, setJobs] = React.useState<JobInfo[]>([]);
  const [selectedJob, setSelectedJob] = React.useState<JobInfo | null>(null);
  const [selectedPod, setSelectedPod] = React.useState<PodKind | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [isPaused, setIsPaused] = React.useState(false);
  const [showAllLogs, setShowAllLogs] = React.useState(false);
  const [expandedJobs, setExpandedJobs] = React.useState<Set<string>>(new Set());
  const [expandedVolumeMounts, setExpandedVolumeMounts] = React.useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = React.useState<string | number>('logs');
  const [containerDropdownOpen, setContainerDropdownOpen] = React.useState(false);
  const [isLogsModalOpen, setIsLogsModalOpen] = React.useState(false);
  const logContainerRef = React.useRef<{ scrollToBottom: () => void }>();

  const fetchJobsAndPods = React.useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      // Fetch Jobs and Pods for this TrainJob
      const [jobsData, podsData] = await Promise.all([
        getJobsForTrainJob(job),
        getPodsForTrainJob(job).catch((error) => {
          // If pods are not found (404), continue without them
          if (error.response?.status === 404 || error.message?.includes('not found')) {
            console.warn('Pods not found for training job, continuing without pods:', error.message);
            return [];
          }
          throw error;
        }),
      ]);

      // Group pods by their parent job
      const podsByJob = podsData.reduce((acc, pod) => {
        const jobName = pod.metadata.labels?.['batch.kubernetes.io/job-name'] || 
                       pod.metadata.labels?.['job-name'];
        if (jobName) {
          if (!acc[jobName]) acc[jobName] = [];
          acc[jobName].push(pod);
        }
        return acc;
      }, {} as Record<string, PodKind[]>);

      // Create JobInfo objects with real data, filtering out jobs with no pods
      const jobInfos: JobInfo[] = jobsData
        .map((k8sJob) => {
          const jobName = k8sJob.metadata.name;
          const jobPods = podsByJob[jobName] || [];
          
          // Determine job type from name
          let type: 'dataset-initializer' | 'model-initializer' | 'trainer' = 'trainer';
          if (jobName.includes('dataset-initializer')) {
            type = 'dataset-initializer';
          } else if (jobName.includes('model-initializer')) {
            type = 'model-initializer';
          }

          return {
            job: k8sJob,
            type,
            pods: jobPods,
          };
        })
        .filter((jobInfo) => jobInfo.pods.length > 0); // Only include jobs that have pods

      // Sort jobs by type priority (initializers first, then trainer)
      const sortedJobs = jobInfos.sort((a, b) => {
        const order = { 'dataset-initializer': 0, 'model-initializer': 1, 'trainer': 2 };
        return order[a.type] - order[b.type];
      });

      setJobs(sortedJobs);
      
      // Only set default job if we don't have a selection or this is initial load
      if (!isRefresh) {
        // Default to trainer job if available, otherwise first job
        const trainerJob = sortedJobs.find(j => j.type === 'trainer');
        const defaultJob = trainerJob || sortedJobs[0] || null;
        setSelectedJob(defaultJob);
        // Set default pod (first pod of the selected job)
        if (defaultJob && defaultJob.pods.length > 0) {
          setSelectedPod(defaultJob.pods[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch TrainJob resources:', error);
      setJobs([]);
      if (!isRefresh) {
        setSelectedJob(null);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [job]);

  React.useEffect(() => {
    fetchJobsAndPods();
  }, [job.metadata.name, job.metadata.namespace]);

  const handleRefresh = () => {
    fetchJobsAndPods(true);
  };

  // Helper functions to extract information from Kubernetes resources
  const getJobStatus = (job: JobKind): string => {
    if (job.status?.succeeded && job.status.succeeded > 0) {
      return 'Completed';
    }
    if (job.status?.failed && job.status.failed > 0) {
      return 'Failed';
    }
    if (job.status?.active && job.status.active > 0) {
      return 'Running';
    }
    return 'Pending';
  };

  const getPodStatus = (pod: PodKind): string => {
    return pod.status?.phase || 'Unknown';
  };

  const getJobCompletions = (job: JobKind): string => {
    const succeeded = job.status?.succeeded || 0;
    const parallelism = job.spec?.parallelism || 1;
    return `${succeeded}/${parallelism}`;
  };

  const getJobDuration = (job: JobKind): string => {
    const startTime = job.status?.startTime;
    const completionTime = job.status?.completionTime;
    
    if (startTime && completionTime) {
      const start = new Date(startTime).getTime();
      const end = new Date(completionTime).getTime();
      const durationMs = end - start;
      
      if (durationMs < 60000) {
        return `${Math.round(durationMs / 1000)}s`;
      } else {
        return `${Math.round(durationMs / 60000)}m`;
      }
    }
    
    return 'N/A';
  };

  const getPodRestarts = (pod: PodKind): number => {
    return pod.status?.containerStatuses?.reduce((total, container) => {
      return total + ((container as any).restartCount || 0);
    }, 0) || 0;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
      case 'Succeeded':
        return 'green';
      case 'Running':
        return 'blue';
      case 'Failed':
        return 'red';
      case 'Pending':
        return 'orange';
      default:
        return 'grey';
    }
  };

  const getLogContent = (jobType: string) => {
    if (jobType === 'trainer') {
      return `[2025-09-09 16:05:12] Starting training job...
[2025-09-09 16:05:13] Loading configuration from /workspace/config.yaml
[2025-09-09 16:05:14] Initializing distributed training environment
[2025-09-09 16:05:15] Setting up data loaders
[2025-09-09 16:05:16] Model architecture: GPT-2 (124M parameters)
[2025-09-09 16:05:17] Optimizer: AdamW (lr=5e-5, weight_decay=0.01)
[2025-09-09 16:05:18] Starting epoch 1/3
[2025-09-09 16:05:25] Step 100/1500 | Loss: 4.2847 | LR: 4.8e-5
[2025-09-09 16:05:32] Step 200/1500 | Loss: 3.9234 | LR: 4.6e-5
[2025-09-09 16:05:39] Step 300/1500 | Loss: 3.7156 | LR: 4.4e-5
[2025-09-09 16:05:46] Step 400/1500 | Loss: 3.5892 | LR: 4.2e-5
[2025-09-09 16:05:53] Step 500/1500 | Loss: 3.4721 | LR: 4.0e-5
[2025-09-09 16:06:00] Epoch 1/3 completed | Avg Loss: 3.4721
[2025-09-09 16:06:01] Saving checkpoint: epoch_1.pt
[2025-09-09 16:06:02] Starting epoch 2/3
[2025-09-09 16:06:09] Step 600/1500 | Loss: 3.2156 | LR: 3.8e-5
[2025-09-09 16:06:16] Step 700/1500 | Loss: 3.0892 | LR: 3.6e-5
[2025-09-09 16:06:23] Step 800/1500 | Loss: 2.9734 | LR: 3.4e-5
[2025-09-09 16:06:30] Step 900/1500 | Loss: 2.8621 | LR: 3.2e-5
[2025-09-09 16:06:37] Step 1000/1500 | Loss: 2.7543 | LR: 3.0e-5
[2025-09-09 16:06:44] Epoch 2/3 completed | Avg Loss: 2.7543
[2025-09-09 16:06:45] Saving checkpoint: epoch_2.pt
[2025-09-09 16:06:46] Starting epoch 3/3
[2025-09-09 16:06:53] Step 1100/1500 | Loss: 2.5234 | LR: 2.8e-5
[2025-09-09 16:07:00] Step 1200/1500 | Loss: 2.4156 | LR: 2.6e-5
[2025-09-09 16:07:07] Step 1300/1500 | Loss: 2.3089 | LR: 2.4e-5
[2025-09-09 16:07:14] Step 1400/1500 | Loss: 2.2134 | LR: 2.2e-5
[2025-09-09 16:07:21] Step 1500/1500 | Loss: 2.1947 | LR: 2.0e-5
[2025-09-09 16:07:22] Epoch 3/3 completed | Avg Loss: 2.1947
[2025-09-09 16:07:23] Final validation loss: 2.0892
[2025-09-09 16:07:24] Training completed successfully!
[2025-09-09 16:07:25] Total training time: 2m 13s
[2025-09-09 16:07:26] Best checkpoint: epoch_3.pt
[2025-09-09 16:07:27] Model saved to /workspace/checkpoints/final_model.pt
[2025-09-09 16:07:28] Tokenizer saved to /workspace/checkpoints/tokenizer/
[2025-09-09 16:07:29] Training metrics saved to /workspace/logs/metrics.json
[2025-09-09 16:07:30] Cleaning up temporary files...
[2025-09-09 16:07:31] Job completed successfully`;
    } else if (jobType === 'dataset-initializer') {
      return `[2025-09-09 03:08:10] Dataset initializer starting...
[2025-09-09 03:08:11] Checking dataset configuration
[2025-09-09 03:08:12] Dataset source: tatsu-lab/alpaca
[2025-09-09 03:08:13] Connecting to Hugging Face Hub...
[2025-09-09 03:08:14] Downloading dataset metadata...
[2025-09-09 03:08:15] Dataset size: 52,002 examples
[2025-09-09 03:08:16] Downloading dataset files...
[2025-09-09 03:08:17] ████████████████████████████████ 100% (52.1MB/52.1MB)
[2025-09-09 03:08:18] Validating dataset integrity...
[2025-09-09 03:08:19] Processing train split: train[:500]
[2025-09-09 03:08:20] Processing test split: train[500:520]
[2025-09-09 03:08:21] Applying data preprocessing...
[2025-09-09 03:08:22] Tokenizing examples...
[2025-09-09 03:08:23] Creating data shards...
[2025-09-09 03:08:24] Saving processed dataset to /workspace/dataset/
[2025-09-09 03:08:25] Dataset statistics:
[2025-09-09 03:08:25]   - Training examples: 500
[2025-09-09 03:08:25]   - Test examples: 20
[2025-09-09 03:08:25]   - Average sequence length: 128 tokens
[2025-09-09 03:08:25]   - Vocabulary size: 50,257
[2025-09-09 03:08:26] Dataset initialization completed successfully`;
    } else {
      return `[2025-09-09 03:08:05] Model initializer starting...
[2025-09-09 03:08:06] Loading model configuration: gpt2
[2025-09-09 03:08:07] Checking model availability...
[2025-09-09 03:08:08] Downloading model from Hugging Face Hub...
[2025-09-09 03:08:09] ████████████████████████████████ 100% (548MB/548MB)
[2025-09-09 03:08:10] Model downloaded successfully
[2025-09-09 03:08:11] Loading model weights...
[2025-09-09 03:08:12] Initializing tokenizer...
[2025-09-09 03:08:13] Configuring model for fine-tuning...
[2025-09-09 03:08:14] Setting up gradient checkpointing...
[2025-09-09 03:08:15] Model parameters: 124,439,808
[2025-09-09 03:08:16] Trainable parameters: 124,439,808
[2025-09-09 03:08:17] Model memory usage: ~500MB
[2025-09-09 03:08:18] Saving model to /workspace/model/
[2025-09-09 03:08:19] Saving tokenizer to /workspace/model/tokenizer/
[2025-09-09 03:08:20] Model initialization completed successfully`;
    }
  };

  // Pod container log state
  const {
    podContainers,
    selectedContainer,
    defaultContainerName,
    setSelectedContainer,
    podStatus,
  } = useTrainJobPodContainerLogState(selectedPod);

  // Get container name from selected container
  const containerName = selectedContainer?.name || '';
  
  const [logs, logsLoaded, logsError] = useTrainJobFetchLogs(
    job.metadata.namespace || '',
    selectedPod?.metadata.name || '',
    containerName,
    !isPaused,
    showAllLogs ? 0 : 10000, // 0 = all logs, 10000 = tailed logs
  );

  // Auto-scroll to bottom when logs update
  React.useEffect(() => {
    if (!isPaused && logs && logContainerRef.current) {
      logContainerRef.current.scrollToBottom();
    }
  }, [isPaused, logs]);

  // Update selected pod when job changes
  React.useEffect(() => {
    if (selectedJob && selectedJob.pods.length > 0) {
      setSelectedPod(selectedJob.pods[0]);
    }
  }, [selectedJob]);

  // Toggle expanded state for job metadata
  const toggleJobExpanded = (jobName: string) => {
    setExpandedJobs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(jobName)) {
        newSet.delete(jobName);
      } else {
        newSet.add(jobName);
      }
      return newSet;
    });
  };

  const toggleVolumeMountsExpanded = (jobName: string) => {
    setExpandedVolumeMounts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(jobName)) {
        newSet.delete(jobName);
      } else {
        newSet.add(jobName);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <PageSection isFilled>
        <Grid hasGutter>
          <GridItem span={4}>
            <Card isFullHeight>
              <CardTitle>
                <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                  <FlexItem>
                    <CubesIcon />
                  </FlexItem>
                  <FlexItem>
                    <Title headingLevel="h3" size="md">Associated Jobs</Title>
                  </FlexItem>
                </Flex>
              </CardTitle>
              <Divider />
              <CardBody>
                <Skeleton height="300px" />
              </CardBody>
            </Card>
          </GridItem>
          <GridItem span={8}>
            <Card isFullHeight>
              <CardTitle>
                <Title headingLevel="h3" size="md">Logs</Title>
              </CardTitle>
              <Divider />
              <CardBody>
                <Skeleton height="400px" />
              </CardBody>
            </Card>
          </GridItem>
        </Grid>
      </PageSection>
    );
  }

  return (
    <PageSection isFilled>
      {/* Page Header with Refresh Button */}
      <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }} style={{ marginBottom: 'var(--pf-v5-global--spacer--md)' }}>
        <FlexItem>
          <Title headingLevel="h2" size="lg">Training Job Details</Title>
        </FlexItem>
        <FlexItem>
          <Tooltip content="Refresh jobs and pods">
            <Button
              variant="plain"
              icon={<SyncAltIcon />}
              onClick={handleRefresh}
              isLoading={refreshing}
              isDisabled={refreshing}
              aria-label="Refresh"
            />
          </Tooltip>
        </FlexItem>
      </Flex>
      <Grid hasGutter>
        <GridItem span={4}>
          <Card>
            <CardTitle>
                  <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                    <FlexItem>
                      <CubesIcon />
                    </FlexItem>
                    <FlexItem>
                      <Title headingLevel="h3" size="md">Associated Jobs</Title>
                    </FlexItem>
                <FlexItem>
                  <Label color="blue" isCompact>
                    {jobs.length}
                  </Label>
                </FlexItem>
              </Flex>
            </CardTitle>
            <Divider />
            <CardBody style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <Stack hasGutter>
                {jobs.map((jobInfo) => {
                  const jobStatus = getJobStatus(jobInfo.job);
                  const completions = getJobCompletions(jobInfo.job);
                  const duration = getJobDuration(jobInfo.job);
                  const completedPods = jobInfo.pods.filter(p => getPodStatus(p) === 'Succeeded').length;
                  const isSelected = selectedJob?.job.metadata.name === jobInfo.job.metadata.name;
                  const isExpanded = expandedJobs.has(jobInfo.job.metadata.name);
                  
                  return (
                    <StackItem key={jobInfo.job.metadata.name}>
                      <div
                        style={{ 
                          padding: 'var(--pf-v5-global--spacer--sm)',
                          backgroundColor: isSelected ? 'var(--pf-v5-global--BackgroundColor--200)' : undefined,
                          borderRadius: 'var(--pf-v5-global--BorderRadius--sm)',
                          border: isSelected ? '1px solid var(--pf-v5-global--primary-color--100)' : '1px solid var(--pf-v5-global--BorderColor--100)'
                        }}
                      onClick={() => setSelectedJob(jobInfo)}
                      >
                        <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                          <FlexItem>
                            <Button
                              variant="plain"
                              onClick={() => toggleJobExpanded(jobInfo.job.metadata.name)}
                      style={{
                                padding: '4px',
                                minWidth: 'auto',
                                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                transition: 'transform 0.2s ease'
                              }}
                            >
                              <AngleRightIcon />
                            </Button>
                          </FlexItem>
                          <FlexItem flex={{ default: 'flex_1' }}>
                            <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                              <FlexItem>
                                <Title headingLevel="h5" size="md">
                                  {jobInfo.type.replace('-', ' ')}
                                </Title>
                              </FlexItem>
                              <FlexItem>
                                <Label color={getStatusColor(jobStatus)} isCompact>
                                  {jobStatus}
                                    </Label>
                                  </FlexItem>
                                  <FlexItem>
                                <Label color="grey" isCompact>
                                  {jobInfo.pods.length} pods
                                </Label>
                              </FlexItem>
                            </Flex>
                          </FlexItem>
                        </Flex>
                        
                        {isExpanded && (
                          <Card style={{ marginLeft: '40px', marginTop: 'var(--pf-v5-global--spacer--sm)' }}>
                            <CardBody>
                              <Title headingLevel="h6" size="md" style={{ 
                                margin: '0 0 16px 0',
                                color: 'var(--pf-v5-global--Color--100)',
                                paddingBottom: '8px',
                                borderBottom: '1px solid var(--pf-v5-global--BorderColor--100)'
                              }}>
                                Job Details
                              </Title>
                              <Stack hasGutter>
                                <StackItem style={{ padding: 'var(--pf-v5-global--spacer--xs) 0' }}>
                                  <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
                                    <FlexItem style={{ minWidth: '120px', fontWeight: '600', color: 'var(--pf-v5-global--Color--200)' }}>
                                      Completions:
                                    </FlexItem>
                                    <FlexItem>
                                      {completions}
                                    </FlexItem>
                                  </Flex>
                                </StackItem>
                                <StackItem style={{ padding: 'var(--pf-v5-global--spacer--xs) 0' }}>
                                  <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
                                    <FlexItem style={{ minWidth: '120px', fontWeight: '600', color: 'var(--pf-v5-global--Color--200)' }}>
                                      Duration:
                                    </FlexItem>
                                    <FlexItem>
                                      {duration}
                                    </FlexItem>
                                  </Flex>
                                </StackItem>
                                <StackItem style={{ padding: 'var(--pf-v5-global--spacer--xs) 0' }}>
                                  <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
                                    <FlexItem style={{ minWidth: '120px', fontWeight: '600', color: 'var(--pf-v5-global--Color--200)' }}>
                                      Pod Status:
                                    </FlexItem>
                                    <FlexItem>
                                      {completedPods} / {jobInfo.pods.length} completed
                              </FlexItem>
                            </Flex>
                          </StackItem>
                                <StackItem style={{ padding: 'var(--pf-v5-global--spacer--sm) 0' }}>
                                  <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsFlexStart' }}>
                                    <FlexItem style={{ minWidth: '120px', fontWeight: '600', color: 'var(--pf-v5-global--Color--200)' }}>
                                      Job Name:
                                    </FlexItem>
                                    <FlexItem style={{ flex: 1 }}>
                            <div style={{ 
                                        fontSize: 'var(--pf-v5-global--FontSize--sm)',
                                        backgroundColor: 'var(--pf-v5-global--BackgroundColor--dark-100)',
                                        color: 'var(--pf-v5-global--Color--light-100)',
                                        padding: 'var(--pf-v5-global--spacer--sm) var(--pf-v5-global--spacer--md)',
                                        borderRadius: 'var(--pf-v5-global--BorderRadius--sm)',
                              fontFamily: 'var(--pf-v5-global--FontFamily--monospace)',
                              wordBreak: 'break-all',
                                        border: '1px solid var(--pf-v5-global--BorderColor--300)'
                            }}>
                                        {jobInfo.job.metadata.name}
                            </div>
                                    </FlexItem>
                                  </Flex>
                                </StackItem>
                                {(jobInfo.job as any).metadata?.creationTimestamp && (
                                  <StackItem style={{ padding: 'var(--pf-v5-global--spacer--xs) 0' }}>
                                    <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
                                      <FlexItem style={{ minWidth: '120px', fontWeight: '600', color: 'var(--pf-v5-global--Color--200)' }}>
                                        Created:
                                      </FlexItem>
                                      <FlexItem>
                                        {new Date((jobInfo.job as any).metadata.creationTimestamp).toLocaleString()}
                                      </FlexItem>
                                    </Flex>
                          </StackItem>
                                )}
                                
                                {/* Volume Mounts Section */}
                                {(() => {
                                  const volumeMounts = jobInfo.job.spec?.template?.spec?.containers?.[0]?.volumeMounts;
                                  const volumes = jobInfo.job.spec?.template?.spec?.volumes;
                                  const jobName = jobInfo.job.metadata.name;
                                  const isVolumeMountsExpanded = expandedVolumeMounts.has(jobName);
                                  
                                  if (!volumeMounts || volumeMounts.length === 0) return null;
                                  
                                  return (
                                    <StackItem style={{ padding: 'var(--pf-v5-global--spacer--sm) 0' }}>
                                      <ExpandableSection 
                                        toggleText={`Volume Mounts (${volumeMounts.length})`}
                                        isExpanded={isVolumeMountsExpanded}
                                        onToggle={() => toggleVolumeMountsExpanded(jobName)}
                                      >
                                        <Stack hasGutter>
                                          {volumeMounts.map((mount, index) => {
                                            const volume = volumes?.find(v => v.name === mount.name);
                                            let volumeType = 'Unknown';
                                            let volumeSource = '';
                                            
                                            if (volume?.persistentVolumeClaim) {
                                              volumeType = 'PersistentVolumeClaim';
                                              volumeSource = volume.persistentVolumeClaim.claimName;
                                            } else if (volume?.configMap) {
                                              volumeType = 'ConfigMap';
                                              volumeSource = volume.configMap.name;
                                            } else if (volume?.secret) {
                                              volumeType = 'Secret';
                                              volumeSource = volume.secret.secretName;
                                            }
                                            
                                            return (
                                              <StackItem key={index}>
                                                <div style={{
                                                  padding: 'var(--pf-v5-global--spacer--sm)',
                                                  backgroundColor: 'var(--pf-v5-global--BackgroundColor--100)',
                                                  borderRadius: 'var(--pf-v5-global--BorderRadius--sm)',
                                                  border: '1px solid var(--pf-v5-global--BorderColor--200)'
                                                }}>
                                                  <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsXs' }}>
                                                    <FlexItem>
                                                      <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
                                                        <FlexItem style={{ fontWeight: '600', color: 'var(--pf-v5-global--Color--200)', minWidth: '80px' }}>
                                                          Name:
                                                        </FlexItem>
                                                        <FlexItem style={{ fontFamily: 'var(--pf-v5-global--FontFamily--monospace)' }}>
                                                          {mount.name}
                                                        </FlexItem>
                                                      </Flex>
                                                    </FlexItem>
                                                    <FlexItem>
                                                      <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
                                                        <FlexItem style={{ fontWeight: '600', color: 'var(--pf-v5-global--Color--200)', minWidth: '80px' }}>
                                                          Path:
                                                        </FlexItem>
                                                        <FlexItem style={{ fontFamily: 'var(--pf-v5-global--FontFamily--monospace)' }}>
                                                          {mount.mountPath}
                                                          {mount.subPath && (
                                                            <span style={{ color: 'var(--pf-v5-global--Color--300)' }}>
                                                              {' → '}{mount.subPath}
                                                            </span>
                                                          )}
                                                        </FlexItem>
                                                      </Flex>
                                                    </FlexItem>
                                                    <FlexItem>
                                                      <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
                                                        <FlexItem style={{ fontWeight: '600', color: 'var(--pf-v5-global--Color--200)', minWidth: '80px' }}>
                                                          Source:
                                                        </FlexItem>
                                                        <FlexItem>
                                                          <Label color="blue" isCompact>{volumeType}</Label>
                                                          {volumeSource && (
                                                            <span style={{ marginLeft: '8px', fontFamily: 'var(--pf-v5-global--FontFamily--monospace)' }}>
                                                              {volumeSource}
                                                            </span>
                                                          )}
                                                        </FlexItem>
                                                      </Flex>
                                                    </FlexItem>
                                                    {mount.readOnly && (
                                                      <FlexItem>
                                                        <Label color="orange" isCompact>Read Only</Label>
                                                      </FlexItem>
                                                    )}
                                                  </Flex>
                                                </div>
                                              </StackItem>
                                            );
                                          })}
                                        </Stack>
                                      </ExpandableSection>
                                    </StackItem>
                                  );
                                })()}
                        </Stack>
                      </CardBody>
                    </Card>
                        )}
                      </div>
                  </StackItem>
                  );
                })}
              </Stack>
            </CardBody>
          </Card>
        </GridItem>

        <GridItem span={8}>
          <Card isFullHeight>
            <CardBody>
              {selectedJob ? (
                <Stack hasGutter>
                  {selectedJob.pods.length > 0 ? (
                    <StackItem>
                      <Card>
                        <CardTitle>
                          <Title headingLevel="h4" size="md">
                            {selectedJob.type.charAt(0).toUpperCase() + selectedJob.type.slice(1).replace('-', ' ')} : {job.metadata.name}
                          </Title>
                        </CardTitle>
                        <CardBody>
                          <Table aria-label="Pod list" variant="compact">
                            <Thead>
                              <Tr>
                                <Th>Pod Name</Th>
                                <Th style={{ textAlign: 'center' }}>Restarts</Th>
                                <Th style={{ textAlign: 'center' }}>Created At</Th>
                                <Th style={{ textAlign: 'center' }}>Status</Th>
                              </Tr>
                            </Thead>
                            <Tbody>
                              {selectedJob.pods.map((pod) => {
                                const podStatus = getPodStatus(pod);
                                const restarts = getPodRestarts(pod);
                                const isSelected = selectedPod?.metadata.name === pod.metadata.name;
                                
                                return (
                                  <Tr 
                                    key={pod.metadata.name}
                                    onClick={() => setSelectedPod(pod)}
                                    style={{ 
                                      cursor: 'pointer',
                                      backgroundColor: isSelected ? 'var(--pf-v5-global--BackgroundColor--200)' : undefined
                                    }}
                                  >
                                    <Td dataLabel="Pod Name">
                                      {pod.metadata.name}
                                    </Td>
                                    <Td dataLabel="Restarts" style={{ textAlign: 'center' }}>
                                      {restarts}
                                    </Td>
                                    <Td dataLabel="Created At" style={{ textAlign: 'center' }}>
                                      {pod.metadata.creationTimestamp 
                                        ? new Date(pod.metadata.creationTimestamp).toLocaleString()
                                        : 'Unknown'
                                      }
                                    </Td>
                                    <Td dataLabel="Status" style={{ textAlign: 'center' }}>
                                      <Label color={getStatusColor(podStatus)} isCompact>
                                        {podStatus}
                                      </Label>
                                    </Td>
                                  </Tr>
                                );
                              })}
                            </Tbody>
                          </Table>
                        </CardBody>
                      </Card>
                    </StackItem>
                  ) : (
                    <StackItem>
                      <Card>
                        <CardTitle>
                          <Title headingLevel="h4" size="md">
                            {selectedJob.type.charAt(0).toUpperCase() + selectedJob.type.slice(1).replace('-', ' ')} : {job.metadata.name}
                          </Title>
                        </CardTitle>
                        <CardBody>
                          <EmptyState>
                            <Title headingLevel="h4" size="md">
                              No pods available
                            </Title>
                            <EmptyStateBody>
                              Pods for this job are not available. They may not have been created yet or have been cleaned up.
                            </EmptyStateBody>
                          </EmptyState>
                        </CardBody>
                      </Card>
                    </StackItem>
                  )}

                  <StackItem isFilled>
                    <Card isFullHeight>
                      <CardTitle>
                        <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                          <FlexItem>
                            <Title headingLevel="h4" size="md">
                              Pod Access
                            </Title>
                          </FlexItem>
                          <FlexItem>
                            <Label color="grey" isCompact>
                              {selectedJob.type.replace('-', ' ')}
                            </Label>
                          </FlexItem>
                          {selectedPod && (
                            <FlexItem>
                              <Label color="blue" isCompact>
                                Pod: {selectedPod.metadata.name}
                              </Label>
                            </FlexItem>
                          )}
                          {selectedContainer && (
                            <FlexItem>
                              <Label color={selectedContainer.isInitContainer ? "purple" : "teal"} isCompact>
                                {selectedContainer.isInitContainer ? "Init Container" : "Container"}: {selectedContainer.name}
                              </Label>
                            </FlexItem>
                          )}
                          {podContainers.length > 0 && (
                            <FlexItem>
                              <Label color="grey" isCompact>
                                {podContainers.length} containers detected
                              </Label>
                            </FlexItem>
                          )}
                          {activeTab === 'logs' && (
                            <>
                              <FlexItem>
                                <Label color={isPaused ? 'orange' : 'green'} isCompact>
                                  {isPaused ? 'Paused' : 'Live'}
                                </Label>
                              </FlexItem>
                              <FlexItem>
                                <Tooltip content={showAllLogs ? 'Show last 10,000 lines only' : 'Show all logs (may be slow)'}>
                                  <Button
                                    variant={showAllLogs ? 'primary' : 'secondary'}
                                    size="sm"
                                    onClick={() => setShowAllLogs(!showAllLogs)}
                                  >
                                    {showAllLogs ? 'All Logs' : 'Tailed'}
                                  </Button>
                                </Tooltip>
                              </FlexItem>
                            </>
                          )}
                        </Flex>
                      </CardTitle>
                      <CardBody isFilled>
                        {/* Single bordered container for all content */}
                        <div style={{
                          margin: 'var(--pf-v5-global--spacer--md)',
                          border: '1px solid var(--pf-v5-global--BorderColor--200)',
                          borderRadius: 'var(--pf-v5-global--BorderRadius--sm)',
                          backgroundColor: 'var(--pf-v5-global--BackgroundColor--100)'
                        }}>
                          {/* Container Selection */}
                          {podContainers.length > 0 && (
                            <div style={{ 
                              padding: 'var(--pf-v5-global--spacer--sm)',
                              borderBottom: '1px solid var(--pf-v5-global--BorderColor--200)',
                              backgroundColor: 'var(--pf-v5-global--BackgroundColor--200)'
                            }}>
                              <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                                <FlexItem style={{ 
                                  fontWeight: '600', 
                                  fontSize: 'var(--pf-v5-global--FontSize--sm)',
                                  color: 'var(--pf-v5-global--Color--200)',
                                  minWidth: '80px'
                                }}>
                                  Container:
                                </FlexItem>
                                <FlexItem style={{ maxWidth: '250px' }}>
                                  <Dropdown
                                    isOpen={containerDropdownOpen}
                                    onSelect={() => setContainerDropdownOpen(false)}
                                    onOpenChange={(isOpen: boolean) => setContainerDropdownOpen(isOpen)}
                                    toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                                      <MenuToggle
                                        ref={toggleRef}
                                        onClick={() => setContainerDropdownOpen(!containerDropdownOpen)}
                                        isExpanded={containerDropdownOpen}
                                        style={{ 
                                          minWidth: '180px',
                                          maxWidth: '250px'
                                        }}
                                      >
                                        <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsXs' }}>
                                          <FlexItem flex={{ default: 'flex_1' }}>
                                            <Truncate content={selectedContainer?.name ?? 'Select container'} />
                                          </FlexItem>
                                          {selectedContainer?.isInitContainer && (
                                            <FlexItem>
                                              <Label color="purple" isCompact>Init</Label>
                                            </FlexItem>
                                          )}
                                          {selectedContainer?.name === defaultContainerName && (
                                            <FlexItem>
                                              <Label color="green" isCompact>Default</Label>
                                            </FlexItem>
                                          )}
                                        </Flex>
                                      </MenuToggle>
                                    )}
                                  >
                                    <DropdownList>
                                      {podContainers.map((container) => (
                                        <DropdownItem
                                          key={container.name}
                                          onClick={() => setSelectedContainer(container)}
                                        >
                                          <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                                            <FlexItem flex={{ default: 'flex_1' }}>
                                              <div style={{ 
                                                fontFamily: 'var(--pf-v5-global--FontFamily--monospace)',
                                                fontSize: 'var(--pf-v5-global--FontSize--sm)'
                                              }}>
                                                {container.name}
                                              </div>
                                            </FlexItem>
                                            <FlexItem>
                                              <Flex spaceItems={{ default: 'spaceItemsXs' }}>
                                                {container.isInitContainer && (
                                                  <FlexItem>
                                                    <Label color="purple" isCompact>Init</Label>
                                                  </FlexItem>
                                                )}
                                                {container.name === defaultContainerName && (
                                                  <FlexItem>
                                                    <Label color="green" isCompact>Default</Label>
                                                  </FlexItem>
                                                )}
                                              </Flex>
                                            </FlexItem>
                                          </Flex>
                                        </DropdownItem>
                                      ))}
                                    </DropdownList>
                                  </Dropdown>
                                </FlexItem>
                                {podContainers.length > 1 && (
                                  <FlexItem>
                                    <Label color="grey" isCompact>
                                      {podContainers.length} available
                                    </Label>
                                  </FlexItem>
                                )}
                              </Flex>
                            </div>
                          )}
                          
                          {/* Tabs */}
                          <Tabs
                            activeKey={activeTab}
                            onSelect={(event, tabIndex) => setActiveTab(tabIndex)}
                            isBox={false}
                            hasNoBorderBottom={false}
                          >
                            <Tab 
              eventKey="logs" 
              title={
                <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                  <FlexItem>
                    <TabTitleText>Logs</TabTitleText>
                  </FlexItem>
                  <FlexItem>
                    <Tooltip content="Expand logs to full screen">
                      <Button
                        variant="plain"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsLogsModalOpen(true);
                        }}
                        icon={<ExpandIcon />}
                        aria-label="Expand logs"
                      />
                    </Tooltip>
                  </FlexItem>
                </Flex>
              }
            >
                              <div style={{ padding: 'var(--pf-v5-global--spacer--md)' }}>
                                <DashboardLogViewer
                                hasLineNumbers
                                data={
                                  logsError 
                                    ? (logsError.message?.includes('not found') || logsError.message?.includes('404') 
                                       ? 'Pod logs are not available (pod may have been cleaned up or not yet created)'
                                       : `Error loading logs: ${logsError.message}\n\nThis is common for completed pods where container logs have been garbage collected.`)
                                    : logs || (logsLoaded ? 'No logs available for this pod' : 'Loading logs...')
                                }
                                logViewerRef={logContainerRef}
                                toolbar={false}
                                footer={false}
                                onScroll={() => {
                                  // Placeholder for future scroll handling
                                }}
                                height="400px"
                                isTextWrapped={false}
                              />
                              {logs && (
                                <div style={{ 
                                  padding: 'var(--pf-v5-global--spacer--sm)', 
                                  fontSize: 'var(--pf-v5-global--FontSize--sm)',
                                  color: 'var(--pf-v5-global--Color--200)',
                                  borderTop: '1px solid var(--pf-v5-global--BorderColor--100)',
                                  backgroundColor: 'var(--pf-v5-global--BackgroundColor--200)',
                                  borderRadius: '0 0 var(--pf-v5-global--BorderRadius--sm) var(--pf-v5-global--BorderRadius--sm)'
                                }}>
                                  Showing {logs.split('\n').length} lines {showAllLogs ? '(all logs)' : '(tailed)'}
                                </div>
                              )}
                              {logsError && (
                                <div style={{ 
                                  padding: 'var(--pf-v5-global--spacer--md)', 
                                  color: 'var(--pf-v5-global--danger-color--100)' 
                                }}>
                                  Error loading logs: {logsError.message}
                                </div>
                              )}
                              </div>
                            </Tab>
                            <Tab eventKey="terminal" title={<TabTitleText>Terminal</TabTitleText>}>
                              <SimpleTerminal
                                pod={selectedPod}
                                containerName={containerName}
                                selectedContainer={selectedContainer}
                              />
                            </Tab>
                          </Tabs>
                        </div>
                      </CardBody>
                    </Card>
                  </StackItem>
                </Stack>
              ) : (
                <EmptyState>
                  <ExclamationCircleIcon />
                  <Title headingLevel="h4" size="lg">
                    No job selected
                  </Title>
                  <EmptyStateBody>
                    Select a job from the left panel to view its logs and details.
                  </EmptyStateBody>
                </EmptyState>
              )}
            </CardBody>
          </Card>
        </GridItem>
      </Grid>

      {/* Full Screen Logs Modal */}
      <Modal
        variant={ModalVariant.large}
        title={`Training Logs - ${selectedContainer?.name || 'Container'}`}
        isOpen={isLogsModalOpen}
        onClose={() => setIsLogsModalOpen(false)}
        width="90vw"
      >
        {/* Modal content with proper structure */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          height: '70vh',
          margin: 'var(--pf-v5-global--spacer--lg)',
          border: '1px solid var(--pf-v5-global--BorderColor--200)',
          borderRadius: 'var(--pf-v5-global--BorderRadius--sm)',
          backgroundColor: 'var(--pf-v5-global--BackgroundColor--100)',
          overflow: 'hidden'
        }}>
          {/* Header section - fixed height */}
          <div style={{ 
            padding: 'var(--pf-v5-global--spacer--lg)',
            borderBottom: '1px solid var(--pf-v5-global--BorderColor--100)',
            backgroundColor: 'var(--pf-v5-global--BackgroundColor--200)',
            flexShrink: 0
          }}>
            <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
              <FlexItem>
                <strong>Container: {selectedContainer?.name}</strong>
              </FlexItem>
              {selectedContainer?.isInitContainer && (
                <FlexItem>
                  <Label color="purple" isCompact>Init Container</Label>
                </FlexItem>
              )}
              {selectedContainer?.name === defaultContainerName && (
                <FlexItem>
                  <Label color="green" isCompact>Default Container</Label>
                </FlexItem>
              )}
              <FlexItem>
                <span style={{ color: 'var(--pf-v5-global--Color--200)' }}>
                  Pod: {selectedPod?.metadata.name}
                </span>
              </FlexItem>
            </Flex>
          </div>
          
          {/* Content area - flexible height */}
          <div style={{
            flex: 1,
            padding: 'var(--pf-v5-global--spacer--lg)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <DashboardLogViewer
              hasLineNumbers
              data={
                logsError
                  ? (logsError.message?.includes('not found') || logsError.message?.includes('404')
                    ? 'Pod logs are not available (pod may have been cleaned up or not yet created)'
                    : `Error loading logs: ${logsError.message}\n\nThis is common for completed pods where container logs have been garbage collected.`)
                  : logs || (logsLoaded ? 'No logs available for this pod' : 'Loading logs...')
              }
              logViewerRef={logContainerRef}
              toolbar={false}
              footer={false}
              onScroll={() => {
                // Placeholder for future scroll handling
              }}
              height="100%"
              isTextWrapped={false}
            />
          </div>

          {/* Footer section - fixed height */}
          {logs && (
            <div style={{
              padding: 'var(--pf-v5-global--spacer--lg)',
              fontSize: 'var(--pf-v5-global--FontSize--sm)',
              color: 'var(--pf-v5-global--Color--200)',
              borderTop: '1px solid var(--pf-v5-global--BorderColor--100)',
              backgroundColor: 'var(--pf-v5-global--BackgroundColor--200)',
              flexShrink: 0
            }}>
              Showing {logs.split('\n').length} lines {showAllLogs ? '(all logs)' : '(tailed)'}
            </div>
          )}
        </div>
      </Modal>
    </PageSection>
  );
};

export default TrainJobDetailsLayout;
