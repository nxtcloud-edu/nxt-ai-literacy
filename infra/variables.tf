variable "region" {
  description = "AWS 리전"
  type        = string
  default     = "ap-northeast-2"
}

variable "profile" {
  description = "AWS CLI 표준 자격 증명 프로필 이름"
  type        = string
  default     = "default"
}

variable "bucket_name" {
  description = "게임 배포 S3 버킷 이름"
  type        = string
  default     = "nxt-ai-literacy-games"

  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$", var.bucket_name))
    error_message = "bucket_name은 소문자·숫자·점·하이픈으로 된 3~63자여야 합니다."
  }
}

variable "instance_type" {
  description = "업로드 앱 EC2 인스턴스 타입"
  type        = string
  default     = "t3.micro"
}

variable "repository_url" {
  description = "EC2 user_data가 clone할 공개 GitHub 저장소"
  type        = string
  default     = "https://github.com/nxtcloud-edu/nxt-ai-literacy.git"

  validation {
    condition     = can(regex("^https://github\\.com/", var.repository_url))
    error_message = "repository_url은 HTTPS GitHub URL이어야 합니다."
  }
}
