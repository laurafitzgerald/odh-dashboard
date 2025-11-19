import * as React from 'react';
import { Tab, Tabs, TabTitleText, TabContentBody } from '@patternfly/react-core';
import TrainingJobLogsTab from './TrainingJobLogsTab';
import { TrainingJob } from '../trainingJobList/utils';

enum TrainingJobDetailsTab {
  LOGS = 'Logs',
  DETAILS = 'Details',
}

type TrainingJobDetailsTabsProps = {
  job: TrainingJob;
};

const TrainingJobDetailsTabs: React.FC<TrainingJobDetailsTabsProps> = ({ job }) => {
  const [activeTabKey, setActiveTabKey] = React.useState<string | number>(
    TrainingJobDetailsTab.LOGS,
  );

  return (
    <Tabs
      activeKey={activeTabKey}
      aria-label="Job details page"
      role="region"
      data-testid="training-job-details-page"
      onSelect={(e, tabIndex) => {
        setActiveTabKey(tabIndex);
      }}
    >
      <Tab
        eventKey={TrainingJobDetailsTab.LOGS}
        title={<TabTitleText>{TrainingJobDetailsTab.LOGS}</TabTitleText>}
        aria-label="Job logs tab"
        data-testid="job-logs-tab"
      >
        <TabContentBody hasPadding>
          <TrainingJobLogsTab job={job} />
        </TabContentBody>
      </Tab>
      {/* TODO: Hide details tab for now */}
      {/* <Tab
        eventKey={TrainingJobDetailsTab.DETAILS}
        title={<TabTitleText>{TrainingJobDetailsTab.DETAILS}</TabTitleText>}
        aria-label="Job details tab"
        data-testid="job-details-tab"
      >
        <TabContentBody>
          <div>Job details will be implemented here.</div>
        </TabContentBody>
      </Tab> */}
    </Tabs>
  );
};

export default TrainingJobDetailsTabs;
