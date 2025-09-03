#!/usr/bin/env bash
set -euo pipefail

# Deploy a standalone Next.js bundle to Elastic Beanstalk.
# Usage: scripts/deploy_eb.sh [environment-name]

APP_NAME=${APP_NAME:-"Reviews and Marketing"}
ENV_NAME=${1:-${ENV_NAME:-reviewsandmarketing-standalone}}
REGION=${AWS_REGION:-us-east-1}

echo "[deploy] Building bundle…"
bash "$(dirname "$0")/pack_eb_bundle.sh"

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
BUCKET="reviewsandmarketing-eb-${REGION}-${ACCOUNT_ID}"
ZIP_FILE=$(ls -t reviewsandmarketing-*.zip | head -n1)
KEY="bundles/$ZIP_FILE"

echo "[deploy] Uploading: $ZIP_FILE → s3://$BUCKET/$KEY"
aws s3 cp "$ZIP_FILE" "s3://$BUCKET/$KEY"

LABEL=${LABEL:-standalone-$(date +%Y%m%d-%H%M%S)}
echo "[deploy] Creating EB application version: $LABEL"
aws elasticbeanstalk create-application-version \
  --application-name "$APP_NAME" \
  --version-label "$LABEL" \
  --source-bundle S3Bucket="$BUCKET",S3Key="$KEY" \
  --process >/dev/null

echo "[deploy] Updating environment: $ENV_NAME → $LABEL"
aws elasticbeanstalk update-environment \
  --environment-name "$ENV_NAME" \
  --version-label "$LABEL" \
  --query 'Status' --output text

echo "[deploy] Waiting for environment to be Ready…"
for i in {1..120}; do
  read -r STATUS HEALTH VERSION < <(aws elasticbeanstalk describe-environments \
    --environment-names "$ENV_NAME" \
    --query 'Environments[0].[Status,Health,VersionLabel]' --output text)
  printf '[%s] %s status=%s health=%s version=%s\n' "$(date +%H:%M:%S)" "$ENV_NAME" "$STATUS" "$HEALTH" "$VERSION"
  [ "$STATUS" = "Ready" ] && break
  sleep 5
done

echo "[deploy] Done."

