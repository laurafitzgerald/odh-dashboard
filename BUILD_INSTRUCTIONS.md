# Building ODH Dashboard for OpenShift with Multi-Architecture Support

This guide explains how to build the ODH Dashboard with Kueue admin features for OpenShift clusters with multi-architecture support.

## Quick Start

### 1. Local Single-Architecture Build

```bash
# Build for your current architecture
./build-multiarch.sh local

# Or with custom image name
IMAGE_REPOSITORY=quay.io/myusername/odh-dashboard ./build-multiarch.sh local
```

### 2. Multi-Architecture Build

```bash
# Build for multiple architectures (amd64, arm64)
./build-multiarch.sh multi

# Build for specific platforms
PLATFORMS=linux/amd64,linux/arm64,linux/ppc64le,linux/s390x ./build-multiarch.sh multi
```

## Detailed Instructions

### Prerequisites

1. **Container Tool**: Either `podman` (recommended) or `docker`
2. **Registry Access**: Credentials for your container registry (e.g., quay.io)
3. **OpenShift Cluster**: Access to deploy the dashboard

### Step-by-Step Build Process

#### Option A: Using Podman (Recommended for RHEL/Fedora)

```bash
# 1. Login to your registry
podman login quay.io

# 2. Set your image repository
export IMAGE_REPOSITORY=quay.io/YOUR_USERNAME/odh-dashboard
export IMAGE_TAG=kueue-admin-$(git rev-parse --short HEAD)

# 3. Build for local architecture (faster for testing)
./build-multiarch.sh local

# 4. Push the image
podman push $IMAGE_REPOSITORY:$IMAGE_TAG

# 5. (Optional) Build multi-arch for production
./build-multiarch.sh multi
```

#### Option B: Using Docker with Buildx

```bash
# 1. Login to your registry
docker login quay.io

# 2. Set environment
export CONTAINER_BUILDER=docker
export IMAGE_REPOSITORY=quay.io/YOUR_USERNAME/odh-dashboard
export IMAGE_TAG=kueue-admin-$(git rev-parse --short HEAD)

# 3. Build and push multi-arch (buildx automatically pushes)
./build-multiarch.sh multi
```

### Manual Build (if script doesn't work)

```bash
# Using Podman
podman build \
  -f Dockerfile.multiarch \
  -t quay.io/YOUR_USERNAME/odh-dashboard:dev \
  .

podman push quay.io/YOUR_USERNAME/odh-dashboard:dev

# Using Docker
docker build \
  -f Dockerfile.multiarch \
  -t quay.io/YOUR_USERNAME/odh-dashboard:dev \
  .

docker push quay.io/YOUR_USERNAME/odh-dashboard:dev
```

## Deploying to OpenShift

### Method 1: Using Existing Manifests

```bash
# 1. Update the image in your .env.local
cat >> .env.local << EOF
IMAGE_REPOSITORY=quay.io/YOUR_USERNAME/odh-dashboard:dev
EOF

# 2. Deploy using the provided script
make deploy
# or
npm run make:deploy
```

### Method 2: Manual Patch

```bash
# Patch the existing dashboard deployment
oc set image deployment/rhods-dashboard \
  rhods-dashboard=quay.io/YOUR_USERNAME/odh-dashboard:dev \
  -n redhat-ods-applications

# Watch the rollout
oc rollout status deployment/rhods-dashboard -n redhat-ods-applications
```

### Method 3: Edit Deployment Directly

```bash
# Edit the deployment
oc edit deployment rhods-dashboard -n redhat-ods-applications

# Find the image line and replace it with your image:
#   image: quay.io/YOUR_USERNAME/odh-dashboard:dev
```

## Verifying the Deployment

```bash
# Check pod status
oc get pods -n redhat-ods-applications -l app=rhods-dashboard

# View logs
oc logs -f deployment/rhods-dashboard -n redhat-ods-applications

# Check the route
oc get route rhods-dashboard -n redhat-ods-applications

# Test the dashboard
DASHBOARD_URL=$(oc get route rhods-dashboard -n redhat-ods-applications -o jsonpath='{.spec.host}')
echo "Dashboard: https://$DASHBOARD_URL"
```

## Troubleshooting

### Architecture Mismatch Errors

If you see errors like `exec format error` or `platform mismatch`:

```bash
# Check your cluster's architecture
oc debug node/NODE_NAME -- chroot /host arch

# Build specifically for that architecture
PLATFORMS=linux/amd64 ./build-multiarch.sh multi
```

### Build Failures

If npm install fails:

```bash
# Clean and rebuild
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
./build-multiarch.sh local
```

### Image Pull Errors

```bash
# Make sure your image is public or create image pull secret
oc create secret docker-registry quay-secret \
  --docker-server=quay.io \
  --docker-username=YOUR_USERNAME \
  --docker-password=YOUR_PASSWORD \
  -n redhat-ods-applications

# Link the secret to the service account
oc secrets link rhods-dashboard quay-secret --for=pull -n redhat-ods-applications
```

## Features Enabled in This Build

- ✅ Hardware Profiles (Kueue admin interface)
- ✅ Distributed Workloads monitoring
- ✅ Multi-architecture support (amd64, arm64, ppc64le, s390x)
- ✅ Kueue cluster queue and local queue management
- ✅ Model training with Kueue integration

## Environment Variables

The build includes these default settings (can be overridden):

```dockerfile
ODH_LOGO=../images/rhoai-logo.svg
ODH_LOGO_DARK=../images/rhoai-logo-dark-theme.svg
ODH_PRODUCT_NAME="Red Hat OpenShift AI"
ODH_FAVICON="rhoai-favicon.svg"
```

To customize for upstream ODH, rebuild with:

```bash
# Edit Dockerfile.multiarch and change the ENV variables, or
# Override during build (advanced)
```

## Performance Tips

1. **Use local builds for development**: Multi-arch builds take longer
2. **Layer caching**: Don't clean node_modules between builds unless necessary
3. **Parallel builds**: Use `--jobs` flag with podman for faster multi-arch builds

## Additional Resources

- [ODH Dashboard Documentation](docs/README.md)
- [Development Setup](docs/dev-setup.md)
- [OpenShift Container Platform](https://docs.openshift.com/)

