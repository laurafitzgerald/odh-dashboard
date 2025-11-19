import React from 'react';
import { Tooltip } from '@patternfly/react-core';
import { TrainingJob, getTrainingProgress } from '../utils';

type TrainingProgressIconProps = {
  job: TrainingJob;
};

// Add CSS animations for the progress indicator (subtle, theme-appropriate)
const progressAnimationStyles = `
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }
  
  @keyframes pulseGlow {
    0%, 100% { 
      opacity: 0.4; 
      transform: scale(1);
    }
    50% { 
      opacity: 0.7; 
      transform: scale(1.02);
    }
  }
`;

const TrainingProgressIcon: React.FC<TrainingProgressIconProps> = ({ job }) => {
  // Use the utility function to get progress percentage
  const percentageNum = getTrainingProgress(job);
  
  // Don't show if no progress available
  if (percentageNum <= 0) {
    return null;
  }

  // Get progression status for detailed tooltip information
  let progressionStatus: any;
  if (job.kind === 'TrainJob' && (job as any).status?.progressionStatus) {
    progressionStatus = (job as any).status.progressionStatus;
  } else if (job.kind === 'PyTorchJob') {
    // Create a mock progressionStatus for PyTorchJob
    progressionStatus = {
      percentageComplete: String(percentageNum),
      message: 'PyTorch training progress'
    };
  } else {
    // Fallback for completed jobs
    progressionStatus = {
      percentageComplete: String(percentageNum),
      message: percentageNum >= 100 ? 'Training completed successfully' : 'Training in progress'
    };
  }
  
  // Check if job is suspended
  const isSuspended = React.useMemo(() => {
    if (job.kind === 'TrainJob') {
      // For TrainJob, check if it's suspended via conditions
      return (job as any).status?.conditions?.some((c: any) => 
        c.type === 'Suspended' && c.status === 'True'
      );
    }
    if (job.kind === 'PyTorchJob') {
      // For PyTorchJob, check runPolicy.suspend
      return (job as any).spec?.runPolicy?.suspend === true;
    }
    return false;
  }, [job]);
  
  // Check if training is actively running (has recent updates and not suspended)
  const isActivelyTraining = React.useMemo(() => {
    // Don't show active animation if suspended
    if (isSuspended) return false;
    
    if (!progressionStatus.lastUpdateTime) return false;
    const lastUpdate = new Date(progressionStatus.lastUpdateTime);
    const now = new Date();
    const timeDiff = now.getTime() - lastUpdate.getTime();
    // Consider active if updated within last 5 minutes
    return timeDiff < 5 * 60 * 1000;
  }, [progressionStatus.lastUpdateTime, isSuspended]);
  
  // Build detailed tooltip content with dark theme
  const tooltipContent: React.ReactNode = (
    <div style={{ 
      maxWidth: '320px', 
      lineHeight: '1.4', 
      backgroundColor: '#1a1a1a', 
      color: '#ffffff', 
      padding: '12px', 
      borderRadius: '6px'
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '12px', fontSize: '14px', color: '#ffffff' }}>
        Training Progress Details
      </div>
      
      {/* Progress Overview */}
      <div style={{ marginBottom: '12px', padding: '8px', backgroundColor: '#2a2a2a', borderRadius: '4px', color: '#ffffff' }}>
        <div style={{ marginBottom: '4px', color: '#ffffff' }}>
          <strong style={{ color: '#e0e0e0' }}>Progress:</strong> {Math.round(percentageNum)}%
          {isSuspended && <span style={{ color: '#ffa500', marginLeft: '8px' }}>(Suspended)</span>}
        </div>
        
        {/* Steps and Epochs in same section */}
        {(progressionStatus.currentStep !== undefined && progressionStatus.currentStep !== null) || 
         (progressionStatus.totalSteps !== undefined && progressionStatus.totalSteps !== null) ? (
          <div style={{ marginBottom: '4px', fontSize: '13px', color: '#ffffff' }}>
            <strong style={{ color: '#e0e0e0' }}>Steps:</strong> {progressionStatus.currentStep || 0} / {progressionStatus.totalSteps || 'N/A'}
          </div>
        ) : null}
        
        {(progressionStatus.currentEpoch !== undefined && progressionStatus.currentEpoch !== null) || 
         (progressionStatus.totalEpochs !== undefined && progressionStatus.totalEpochs !== null) ? (
          <div style={{ marginBottom: '4px', fontSize: '13px', color: '#ffffff' }}>
            <strong style={{ color: '#e0e0e0' }}>Epochs:</strong> {progressionStatus.currentEpoch || 0} / {progressionStatus.totalEpochs || 'N/A'}
          </div>
        ) : null}
        
        {progressionStatus.estimatedTimeRemaining && (
          <div style={{ fontSize: '13px', color: '#ffffff' }}>
            <strong style={{ color: '#e0e0e0' }}>Est. Time Remaining:</strong> {Math.round(progressionStatus.estimatedTimeRemaining / 60)} min
          </div>
        )}
      </div>
      
      {/* Training Metrics - Better organized */}
      {progressionStatus.trainingMetrics && Object.keys(progressionStatus.trainingMetrics).some(key => 
        progressionStatus.trainingMetrics[key] !== undefined && 
        progressionStatus.trainingMetrics[key] !== null &&
        progressionStatus.trainingMetrics[key] !== ''
      ) && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '6px', fontSize: '13px', color: '#e0e0e0' }}>Training Metrics:</div>
          <div style={{ paddingLeft: '8px' }}>
            {progressionStatus.trainingMetrics.loss && (
              <div style={{ marginBottom: '3px', fontSize: '12px', color: '#ffffff' }}>
                <strong style={{ color: '#e0e0e0' }}>Loss:</strong> {parseFloat(progressionStatus.trainingMetrics.loss).toFixed(4)}
              </div>
            )}
            
            {progressionStatus.trainingMetrics.accuracy && (
              <div style={{ marginBottom: '3px', fontSize: '12px', color: '#ffffff' }}>
                <strong style={{ color: '#e0e0e0' }}>Accuracy:</strong> {progressionStatus.trainingMetrics.accuracy}
              </div>
            )}
            
            {progressionStatus.trainingMetrics.learningRate !== undefined && (
              <div style={{ marginBottom: '3px', fontSize: '12px', color: '#ffffff' }}>
                <strong style={{ color: '#e0e0e0' }}>Learning Rate:</strong> {parseFloat(progressionStatus.trainingMetrics.learningRate).toExponential(2)}
              </div>
            )}
            
            {progressionStatus.trainingMetrics.checkpointsStored && (
              <div style={{ marginBottom: '3px', fontSize: '12px', color: '#ffffff' }}>
                <strong style={{ color: '#e0e0e0' }}>Checkpoints:</strong> {progressionStatus.trainingMetrics.checkpointsStored}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Additional Metrics - Filter out duplicates and format better */}
      {progressionStatus.metrics && Object.keys(progressionStatus.metrics).length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '6px', fontSize: '13px', color: '#e0e0e0' }}>Additional Metrics:</div>
          <div style={{ paddingLeft: '8px' }}>
            {Object.entries(progressionStatus.metrics)
              .filter(([key, value]) => 
                value !== undefined && 
                value !== null && 
                value !== '' &&
                String(value).trim() !== '' &&
                // Filter out metrics already shown above
                !['loss', 'accuracy', 'learningRate', 'checkpointsStored'].includes(key)
              )
              .map(([key, value]) => (
                <div key={key} style={{ marginBottom: '3px', fontSize: '12px', color: '#ffffff' }}>
                  <strong style={{ color: '#e0e0e0' }}>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</strong> {String(value)}
                </div>
              ))}
          </div>
        </div>
      )}
      
      {/* Message and Last Update */}
      <div style={{ borderTop: '1px solid #444', paddingTop: '8px' }}>
        {progressionStatus.message && (
          <div style={{ marginBottom: '6px', fontSize: '12px', fontStyle: 'italic', color: '#cccccc' }}>
            {progressionStatus.message}
          </div>
        )}
        
        {progressionStatus.lastUpdateTime && (
          <div style={{ fontSize: '11px', color: '#aaaaaa' }}>
            Last updated: {new Date(progressionStatus.lastUpdateTime).toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );

  // Use solid colors for better visibility
  const getProgressColor = (percent: number, suspended: boolean = false) => {
    // If suspended, always show grey to indicate inactivity
    if (suspended) return '#8a8d90'; // Grey for suspended/inactive state
    
    // Normal color progression based on percentage
    if (percent >= 80) return '#3e8635'; // Success green
    if (percent >= 50) return '#f0ab00'; // Warning orange
    if (percent >= 20) return '#ec7a08'; // Warning orange darker
    return '#c9190b'; // Danger red
  };

  const progressColor = getProgressColor(percentageNum, isSuspended);
  const size = 28; // Even larger size for better visibility
  const strokeWidth = 6; // Very thick stroke for maximum visibility
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentageNum / 100) * circumference;

  // Create the circular progress SVG - shows partial completion based on percentage
  const CircularProgress = () => {
    console.log(`Progress Debug: ${percentageNum}% - dasharray: ${strokeDasharray}, dashoffset: ${strokeDashoffset}`);
    
    return (
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{
          transform: 'rotate(-90deg)', // Start from top (12 o'clock)
          transition: 'all 0.3s ease-in-out'
        }}
      >
        {/* Background circle - shows full path */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#cccccc"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle - fills based on percentage */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={progressColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${strokeDasharray} ${strokeDasharray}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dashoffset 0.5s ease-in-out, stroke 0.3s ease',
            animation: isActivelyTraining ? 'pulse 2s ease-in-out infinite' : 'none'
          }}
        />
      </svg>
    );
  };

  return (
    <>
      {/* Inject CSS animations */}
      <style>{progressAnimationStyles}</style>
      
      <Tooltip content={tooltipContent} position="top" maxWidth="350px">
        <div 
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center',
            gap: '6px',
            padding: '2px 6px 2px 2px',
            borderRadius: '10px',
            transition: 'all 0.2s ease',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--pf-v5-global--BackgroundColor--200)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <CircularProgress />
          <span 
            style={{ 
              fontSize: '12px', 
              fontWeight: '700', 
              color: progressColor,
              lineHeight: '1',
              minWidth: '30px',
              textAlign: 'left'
            }}
          >
            {Math.round(percentageNum)}%
          </span>
        </div>
      </Tooltip>
    </>
  );
};

export default TrainingProgressIcon;
