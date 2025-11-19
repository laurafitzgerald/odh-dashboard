import * as React from 'react';
import { CatalogModel, CatalogModelDetailsParams } from '~/app/modelCatalogTypes';
export declare enum ModelDetailsTab {
    OVERVIEW = "overview",
    PERFORMANCE_INSIGHTS = "performance-insights"
}
export declare enum ModelDetailsTabTitle {
    OVERVIEW = "Overview",
    PERFORMANCE_INSIGHTS = "Performance insights"
}
type ModelDetailsTabsProps = {
    model: CatalogModel;
    decodedParams: CatalogModelDetailsParams;
};
declare const ModelDetailsTabs: ({ model, decodedParams }: ModelDetailsTabsProps) => React.JSX.Element;
export default ModelDetailsTabs;
