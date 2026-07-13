
output "upload_app_url" {
  description = "Lambda Function URL 기반 업로드 앱 URL"
  value       = aws_lambda_function_url.uploader.function_url
}

output "service_url" {
  description = "CloudFront 커스텀 도메인 기반 서비스 URL"
  value       = "https://showcase.nxtcloud.kr"
}
