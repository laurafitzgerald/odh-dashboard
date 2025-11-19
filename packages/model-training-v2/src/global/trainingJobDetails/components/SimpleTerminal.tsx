import * as React from 'react';
import { 
  Card, 
  CardBody, 
  EmptyState, 
  EmptyStateBody, 
  Title
} from '@patternfly/react-core';
import { TerminalIcon } from '@patternfly/react-icons';
import { PodKind } from '@odh-dashboard/internal/k8sTypes';
import { PodContainer } from '../useTrainJobPodContainerLogState';

type SimpleTerminalProps = {
  pod: PodKind | null;
  containerName: string;
  selectedContainer?: PodContainer | null;
};

const SimpleTerminal: React.FC<SimpleTerminalProps> = ({ 
  pod, 
  containerName,
  selectedContainer
}) => {
  if (!pod || !containerName) {
    return (
      <Card isFullHeight>
        <CardBody>
          <EmptyState>
            <TerminalIcon style={{ fontSize: '48px' }} />
            <Title headingLevel="h4" size="md">
              No Container Selected
            </Title>
            <EmptyStateBody>
              Select a container to view terminal.
            </EmptyStateBody>
          </EmptyState>
        </CardBody>
      </Card>
    );
  }

  return (
    <div style={{ 
      margin: 'var(--pf-v5-global--spacer--md)',
      border: '1px solid var(--pf-v5-global--BorderColor--200)',
      borderRadius: 'var(--pf-v5-global--BorderRadius--sm)',
      backgroundColor: '#000000',
      color: '#ffffff',
      fontFamily: 'Monaco, Menlo, Consolas, "Liberation Mono", "Courier New", monospace',
      fontSize: '14px',
      height: '400px',
      overflow: 'hidden'
    }}>
      {/* Terminal Content Container */}
      <div style={{
        padding: 'var(--pf-v5-global--spacer--md)',
        height: '100%',
        overflow: 'auto',
        lineHeight: '1.5'
      }}>
        <div style={{ color: '#ffffff', marginBottom: '8px' }}>
          sh-4.4$ ls /workspace
        </div>
        <div style={{ color: '#cccccc', marginBottom: '12px' }}>
          checkpoints/  trl-training.py  cache/  logs/  dataset/
        </div>
        <div style={{ color: '#ffffff', marginBottom: '8px' }}>
          sh-4.4$ ps aux | grep python
        </div>
        <div style={{ color: '#cccccc', marginBottom: '12px' }}>
          root  1234  0.5  2.1  1234567  12345 ?  Sl  10:30  0:05 /usr/bin/python /workspace/trl-training.py
        </div>
        <div style={{ color: '#ffffff', marginBottom: '8px' }}>
          sh-4.4$ cat /tmp/training_progression.json
        </div>
        <div style={{ color: '#cccccc', marginBottom: '12px' }}>
          {`{`}
          <br />
          &nbsp;&nbsp;"current_step": 150,
          <br />
          &nbsp;&nbsp;"total_steps": 500,
          <br />
          &nbsp;&nbsp;"percentage_complete": "30.00"
          <br />
          {`}`}
        </div>
        <div style={{ color: '#ffffff', marginBottom: '8px' }}>
          sh-4.4$ tail -f /workspace/logs/training.log
        </div>
        <div style={{ color: '#cccccc', marginBottom: '12px' }}>
          [2024-01-15 10:35:22] Training step 150/500 - Loss: 2.1234
          <br />
          [2024-01-15 10:35:23] Learning rate: 5e-05
        </div>
        <div style={{ 
          color: '#ffffff',
          display: 'inline-block'
        }}>
          sh-4.4$ 
          <span style={{ 
            animation: 'blink 1s infinite',
            backgroundColor: '#ffffff',
            color: '#000000',
            width: '8px',
            height: '16px',
            display: 'inline-block',
            marginLeft: '2px'
          }}>
            &nbsp;
          </span>
        </div>
      </div>

      {/* CSS for blinking cursor */}
      <style>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default SimpleTerminal;
