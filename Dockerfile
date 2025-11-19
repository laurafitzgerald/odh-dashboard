# Build arguments
ARG SOURCE_CODE=.
ARG BASE_IMAGE="registry.access.redhat.com/ubi9/nodejs-20:latest"
ARG TARGETPLATFORM
ARG BUILDPLATFORM

FROM --platform=${TARGETPLATFORM} ${BASE_IMAGE} as builder

# Log build platform info
RUN echo "Building on: $BUILDPLATFORM" && \
    echo "Building for: $TARGETPLATFORM" && \
    uname -m

WORKDIR /usr/src/app
COPY --chown=default:root ${SOURCE_CODE} /usr/src/app
USER default

# Environment setup
ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV TURBO_TELEMETRY_DISABLED=1
ENV NPM_CONFIG_FUND=false
ENV NPM_CONFIG_AUDIT=false

# Install dependencies
RUN npm cache clean --force && \
    npm ci --omit=optional --ignore-scripts --no-fund --no-audit

# Set branding for RHOAI
ENV ODH_LOGO=../images/rhoai-logo.svg
ENV ODH_LOGO_DARK=../images/rhoai-logo-dark-theme.svg
ENV ODH_PRODUCT_NAME="Red Hat OpenShift AI"
ENV ODH_FAVICON="rhoai-favicon.svg"
ENV DOC_LINK="https://docs.redhat.com/en/documentation/red_hat_openshift_ai/"
ENV SUPPORT_LINK="https://access.redhat.com/support/cases/#/case/new/open-case?caseCreate=true"
ENV COMMUNITY_LINK=""

# Build both frontend and backend
RUN npm run build

# Verify builds
RUN echo "=== Verifying Frontend Build ===" && \
    ls -la frontend/public/ && \
    ls -la frontend/public/index.html && \
    find frontend/public/ -name "*.js" | head -3 && \
    echo "Frontend assets verified" && \
    echo "=== Verifying Backend Build ===" && \
    ls -la backend/dist/server.js && \
    echo "Backend build verified"

# Remove dev dependencies to reduce image size
RUN npm prune --omit=dev

FROM --platform=${TARGETPLATFORM} ${BASE_IMAGE} as runtime

WORKDIR /usr/src/app
RUN mkdir /usr/src/app/logs && chmod 775 /usr/src/app/logs
USER 1001:0

# Copy built artifacts from builder
COPY --chown=1001:0 --from=builder /usr/src/app/frontend/public /usr/src/app/frontend/public
COPY --chown=1001:0 --from=builder /usr/src/app/backend/package.json /usr/src/app/backend/package.json
COPY --chown=1001:0 --from=builder /usr/src/app/backend/node_modules /usr/src/app/backend/node_modules
COPY --chown=1001:0 --from=builder /usr/src/app/backend/dist /usr/src/app/backend/dist
COPY --chown=1001:0 --from=builder /usr/src/app/package.json /usr/src/app/package.json
COPY --chown=1001:0 --from=builder /usr/src/app/package-lock.json /usr/src/app/package-lock.json
COPY --chown=1001:0 --from=builder /usr/src/app/node_modules /usr/src/app/node_modules
COPY --chown=1001:0 --from=builder /usr/src/app/data /usr/src/app/data

WORKDIR /usr/src/app/backend
CMD ["npm", "run", "start"]

LABEL io.opendatahub.component="odh-dashboard" \
      io.k8s.display-name="odh-dashboard" \
      name="open-data-hub/odh-dashboard-ubi9" \
      summary="odh-dashboard" \
      description="Open Data Hub Dashboard"
