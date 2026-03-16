#!/usr/bin/env bash
# Deploy Web image. IMAGE_URI is set by CI (e.g. ghcr.io/owner/repo/web:SHA).
# Customize this script for your provider:
#   Railway: railway up --image "$IMAGE_URI"
#   Fly.io:  fly deploy --image "$IMAGE_URI" --app your-web-app
#   Kubernetes: kubectl set image deployment/web web="$IMAGE_URI" -n production
set -e
echo "Deploying Web: $IMAGE_URI"
# Uncomment and configure for your provider:
# railway up --image "$IMAGE_URI"
# fly deploy --image "$IMAGE_URI" --app missu-web
# kubectl set image deployment/missu-web web="$IMAGE_URI" -n production
