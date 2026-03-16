#!/usr/bin/env bash
# Deploy API image. IMAGE_URI is set by CI (e.g. ghcr.io/owner/repo/api:SHA).
# Customize this script for your provider:
#   Railway: railway up --image "$IMAGE_URI"
#   Fly.io:  fly deploy --image "$IMAGE_URI" --app your-api-app
#   Kubernetes: kubectl set image deployment/api api="$IMAGE_URI" -n production
set -e
echo "Deploying API: $IMAGE_URI"
# Uncomment and configure for your provider:
# railway up --image "$IMAGE_URI"
# fly deploy --image "$IMAGE_URI" --app missu-api
# kubectl set image deployment/missu-api api="$IMAGE_URI" -n production
