output "s3_website_endpoint" {
  description = "S3 정적 웹사이트 엔드포인트"
  value       = "http://${aws_s3_bucket_website_configuration.games.website_endpoint}"
}

output "ec2_public_ip" {
  description = "업로드 앱 EC2 퍼블릭 IP"
  value       = aws_instance.uploader.public_ip
}

output "upload_app_url" {
  description = "EC2 업로드 앱 URL"
  value       = "http://${aws_instance.uploader.public_ip}"
}
