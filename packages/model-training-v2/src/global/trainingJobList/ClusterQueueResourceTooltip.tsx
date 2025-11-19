import React from 'react';
import { ClusterQueueKind } from '@odh-dashboard/internal/k8sTypes';

type ClusterQueueResourceTooltipProps = {
  clusterQueue: ClusterQueueKind;
};

const ClusterQueueResourceTooltip: React.FC<ClusterQueueResourceTooltipProps> = ({
  clusterQueue,
}) => {
  const resourceGroups = clusterQueue.spec.resourceGroups || [];

  if (resourceGroups.length === 0) {
    return (
      <div style={{ 
        maxWidth: '320px', 
        lineHeight: '1.4', 
        backgroundColor: '#1a1a1a', 
        color: '#ffffff', 
        padding: '12px', 
        borderRadius: '6px'
      }}>
        <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#ffffff' }}>
          Queue Resources
        </div>
        <div style={{ marginTop: '8px', fontSize: '12px', color: '#cccccc' }}>
          No resource information available
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      maxWidth: '380px', 
      lineHeight: '1.4', 
      backgroundColor: '#1a1a1a', 
      color: '#ffffff', 
      padding: '12px', 
      borderRadius: '6px'
    }}>
      {/* Header */}
      <div style={{ fontWeight: 'bold', marginBottom: '12px', fontSize: '14px', color: '#ffffff' }}>
        Queue Resources
      </div>
      
      {/* Queue Status Overview */}
      <div style={{ marginBottom: '12px', padding: '8px', backgroundColor: '#2a2a2a', borderRadius: '4px', color: '#ffffff' }}>
        <div style={{ marginBottom: '4px', color: '#ffffff' }}>
          <strong style={{ color: '#e0e0e0' }}>Queue:</strong> {clusterQueue.metadata?.name || 'Unknown'}
        </div>
        <div style={{ fontSize: '13px', color: '#ffffff' }}>
          <div style={{ marginBottom: '2px' }}>
            <strong style={{ color: '#e0e0e0' }}>Pending:</strong> <span style={{ color: '#ffa500' }}>
              {clusterQueue.status?.pendingWorkloads ?? 0}
            </span>
          </div>
          <div>
            <strong style={{ color: '#e0e0e0' }}>Admitted:</strong> <span style={{ color: '#92d400' }}>
              {clusterQueue.status?.admittedWorkloads ?? 0}
            </span>
          </div>
        </div>
      </div>
      
      {/* Resource Groups */}
      {resourceGroups.length > 0 && (
        <div>
          <div style={{ fontWeight: 'bold', marginBottom: '6px', fontSize: '13px', color: '#e0e0e0' }}>
            Resource Groups:
          </div>
          
          {resourceGroups.map((group, groupIndex) => (
            <div key={groupIndex} style={{ marginBottom: '8px' }}>
              {/* Resource Types */}
              <div style={{ 
                fontWeight: 'bold', 
                marginBottom: '4px', 
                fontSize: '12px', 
                color: '#4a9eff'
              }}>
                {group.coveredResources.join(', ')}
              </div>
              
              {/* Flavors */}
              {group.flavors.map((flavor, flavorIndex) => (
                <div key={flavorIndex} style={{ 
                  marginBottom: '6px', 
                  padding: '6px 8px',
                  backgroundColor: '#222222',
                  borderRadius: '3px',
                  borderLeft: '2px solid #404040'
                }}>
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#4a9eff', 
                    fontWeight: '500',
                    marginBottom: '3px'
                  }}>
                    {flavor.name}
                  </div>
                  <div style={{ 
                    fontSize: '11px', 
                    color: '#ffffff',
                    paddingLeft: '4px'
                  }}>
                    {flavor.resources.map(r => (
                      <div key={r.name} style={{ marginBottom: '1px' }}>
                        <span style={{ color: '#e0e0e0' }}>{r.name}:</span>{' '}
                        <strong style={{ color: '#ffffff' }}>{r.nominalQuota}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClusterQueueResourceTooltip;
