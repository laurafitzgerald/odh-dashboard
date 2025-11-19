#!/bin/bash
set -e

# Build script for multi-architecture ODH Dashboard
# Supports local builds and multi-arch builds for OpenShift

# Configuration
CONTAINER_TOOL="${CONTAINER_BUILDER:-podman}"
IMAGE_NAME="${IMAGE_REPOSITORY:-quay.io/$(whoami)/odh-dashboard}"
IMAGE_TAG="${IMAGE_TAG:-dev-$(git rev-parse --short HEAD)}"
DOCKERFILE="${DOCKERFILE:-Dockerfile.multiarch}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Building ODH Dashboard${NC}"
echo "Container tool: $CONTAINER_TOOL"
echo "Image: $IMAGE_NAME:$IMAGE_TAG"
echo "Dockerfile: $DOCKERFILE"
echo ""

# Check if we're doing multi-arch build
BUILD_TYPE="${1:-local}"

case "$BUILD_TYPE" in
  local)
    echo -e "${YELLOW}Building for local architecture only...${NC}"
    $CONTAINER_TOOL build \
      -f "$DOCKERFILE" \
      -t "$IMAGE_NAME:$IMAGE_TAG" \
      -t "$IMAGE_NAME:latest" \
      .
    
    echo -e "${GREEN}✓ Build complete!${NC}"
    echo ""
    echo "Image: $IMAGE_NAME:$IMAGE_TAG"
    echo ""
    echo "To push:"
    echo "  $CONTAINER_TOOL push $IMAGE_NAME:$IMAGE_TAG"
    ;;
    
  multi)
    echo -e "${YELLOW}Building for multiple architectures...${NC}"
    PLATFORMS="${PLATFORMS:-linux/amd64,linux/arm64}"
    
    if [ "$CONTAINER_TOOL" = "podman" ]; then
      # Podman multi-arch build
      echo "Creating manifest..."
      $CONTAINER_TOOL manifest create "$IMAGE_NAME:$IMAGE_TAG"
      
      for platform in ${PLATFORMS//,/ }; do
        echo -e "${YELLOW}Building for $platform...${NC}"
        $CONTAINER_TOOL build \
          --platform="$platform" \
          -f "$DOCKERFILE" \
          -t "$IMAGE_NAME:$IMAGE_TAG-${platform//\//-}" \
          .
        
        $CONTAINER_TOOL manifest add "$IMAGE_NAME:$IMAGE_TAG" \
          "$IMAGE_NAME:$IMAGE_TAG-${platform//\//-}"
      done
      
      echo -e "${GREEN}✓ Multi-arch build complete!${NC}"
      echo ""
      echo "To push manifest:"
      echo "  $CONTAINER_TOOL manifest push --all $IMAGE_NAME:$IMAGE_TAG docker://$IMAGE_NAME:$IMAGE_TAG"
      
    elif [ "$CONTAINER_TOOL" = "docker" ]; then
      # Docker buildx multi-arch build
      echo "Using docker buildx..."
      
      # Create builder if it doesn't exist
      docker buildx create --name odh-builder --use 2>/dev/null || docker buildx use odh-builder
      
      docker buildx build \
        --platform="$PLATFORMS" \
        -f "$DOCKERFILE" \
        -t "$IMAGE_NAME:$IMAGE_TAG" \
        --push \
        .
      
      echo -e "${GREEN}✓ Multi-arch build and push complete!${NC}"
      
      # Cleanup builder
      docker buildx rm odh-builder || true
    else
      echo -e "${RED}Unknown container tool: $CONTAINER_TOOL${NC}"
      exit 1
    fi
    ;;
    
  *)
    echo -e "${RED}Unknown build type: $BUILD_TYPE${NC}"
    echo ""
    echo "Usage: $0 [local|multi]"
    echo ""
    echo "  local - Build for current architecture only (default)"
    echo "  multi - Build for multiple architectures"
    echo ""
    echo "Environment variables:"
    echo "  IMAGE_REPOSITORY - Image name (default: quay.io/\$USER/odh-dashboard)"
    echo "  IMAGE_TAG        - Image tag (default: dev-<git-hash>)"
    echo "  CONTAINER_BUILDER - podman or docker (default: podman)"
    echo "  PLATFORMS        - Comma-separated platforms for multi build"
    echo "                     (default: linux/amd64,linux/arm64)"
    echo ""
    echo "Examples:"
    echo "  # Local build"
    echo "  ./build-multiarch.sh local"
    echo ""
    echo "  # Multi-arch build with custom image"
    echo "  IMAGE_REPOSITORY=quay.io/myorg/dashboard ./build-multiarch.sh multi"
    echo ""
    echo "  # Build for specific platforms"
    echo "  PLATFORMS=linux/amd64,linux/arm64,linux/ppc64le ./build-multiarch.sh multi"
    exit 1
    ;;
esac

echo ""
echo -e "${GREEN}Done!${NC}"

