#!/usr/bin/env bash
set -euo pipefail

BUCKET="${1:?사용법: $0 <bucket-name> <region>}"
REGION="${2:?사용법: $0 <bucket-name> <region>}"

aws s3api create-bucket \
  --bucket "$BUCKET" \
  --region "$REGION" \
  --create-bucket-configuration "LocationConstraint=$REGION"
aws s3 website "s3://$BUCKET" --index-document index.html --error-document error.html
aws s3api put-public-access-block \
  --bucket "$BUCKET" \
  --public-access-block-configuration \
    BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false
aws s3api put-bucket-policy --bucket "$BUCKET" --policy "$(cat <<JSON
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicReadGetObject",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::$BUCKET/*"
  }]
}
JSON
)"

echo "S3 정적 웹사이트 버킷을 준비했습니다: $BUCKET ($REGION)"
