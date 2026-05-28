#!/bin/bash
set -e

PROJECT_ID="s4d-athena-hosting"
SERVICE="global-conflicts-athena-service"
REGION="us-central1"
IMAGE="gcr.io/${PROJECT_ID}/${SERVICE}"

echo "🔨 Building Docker image..."
docker build -t "${IMAGE}:latest" .

echo "📤 Pushing to Container Registry..."
docker push "${IMAGE}:latest"

echo "🚀 Deploying to Cloud Run..."
gcloud run deploy "${SERVICE}" \
  --image="${IMAGE}:latest" \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --allow-unauthenticated \
  --memory=1Gi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=5 \
  --set-secrets="GCAS_ACLED_KEY=gcas_acled_key:latest,GCAS_ACLED_EMAIL=gcas_acled_email:latest,GCAS_ANTHROPIC_KEY=gcas_anthropic_key:latest,GCAS_OPENAI_KEY=gcas_openai_key:latest,GCAS_GEMINI_KEY=gcas_gemini_key:latest,GCAS_ATHENA_KEY=gcas_athena_key:latest" \
  --quiet

echo "✅ Deployment complete."
gcloud run services describe "${SERVICE}" --project="${PROJECT_ID}" --region="${REGION}" --format="value(status.url)"
