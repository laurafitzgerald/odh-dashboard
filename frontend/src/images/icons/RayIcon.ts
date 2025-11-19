import { createIcon } from '@patternfly/react-icons/dist/esm/createIcon';

// Official Ray framework logo - balanced for readability
// Adapted from: https://github.com/ray-project/ray
const RayIcon = createIcon({
  name: 'RayIcon',
  width: 36,
  height: 36,
  svgPath:
    // Ray arrows with medium thickness (diagonal down, horizontal, diagonal up)
    'M29,19.5L16.5,32L15,30.5L27.5,18L29,19.5Z ' +
    'M27.5,17L7.5,17L7.5,19L27.5,19L27.5,17Z ' +
    'M15,5.5L27.5,18L29,16.5L16.5,4L15,5.5Z ' +
    // Left block (medium size)
    'M5,15.5H10V20.5H5V15.5Z ' +
    // Center block (medium size)
    'M13,15.5H18V20.5H13V15.5Z ' +
    // Right block (medium size)
    'M21,15.5H26V20.5H21V15.5Z ' +
    // Top block (medium size)
    'M13,7.5H18V12.5H13V7.5Z ' +
    // Bottom block (medium size)
    'M13,23.5H18V28.5H13V23.5Z',
  xOffset: 0,
  yOffset: 0,
});

export default RayIcon;
