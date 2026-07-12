data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-kernel-6.1-x86_64"]
  }

  filter {
    name   = "state"
    values = ["available"]
  }
}

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

resource "aws_s3_bucket" "games" {
  bucket = var.bucket_name
}

resource "aws_s3_bucket_website_configuration" "games" {
  bucket = aws_s3_bucket.games.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "error.html"
  }
}

resource "aws_s3_bucket_public_access_block" "games" {
  bucket = aws_s3_bucket.games.id

  block_public_acls       = false
  ignore_public_acls      = false
  block_public_policy     = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "games" {
  bucket = aws_s3_bucket.games.id

  depends_on = [aws_s3_bucket_public_access_block.games]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "PublicReadGetObject"
      Effect    = "Allow"
      Principal = "*"
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.games.arn}/*"
    }]
  })
}

resource "aws_security_group" "uploader" {
  name        = "nxt-ai-literacy-uploader"
  description = "HTTP-only access for html-delivery uploader"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "Public HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Outbound access for package install and S3"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_iam_role" "uploader" {
  name = "nxt-ai-literacy-uploader"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ssm" {
  role       = aws_iam_role.uploader.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy" "s3_upload" {
  name = "nxt-ai-literacy-s3-upload"
  role = aws_iam_role.uploader.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:PutObject"]
      Resource = "${aws_s3_bucket.games.arn}/games/*"
    }]
  })
}

resource "aws_iam_instance_profile" "uploader" {
  name = "nxt-ai-literacy-uploader"
  role = aws_iam_role.uploader.name
}

resource "aws_instance" "uploader" {
  ami                         = data.aws_ami.al2023.id
  instance_type               = var.instance_type
  subnet_id                   = data.aws_subnets.default.ids[0]
  vpc_security_group_ids      = [aws_security_group.uploader.id]
  iam_instance_profile        = aws_iam_instance_profile.uploader.name
  associate_public_ip_address = true

  user_data = <<-USERDATA
    #!/bin/bash
    set -euxo pipefail

    dnf install -y nodejs20 git
    id -u html-delivery >/dev/null 2>&1 || useradd --system --home-dir /opt/html-delivery --shell /sbin/nologin html-delivery
    rm -rf /opt/html-delivery
    git clone ${var.repository_url} /opt/html-delivery
    chown -R html-delivery:html-delivery /opt/html-delivery

    cd /opt/html-delivery/html-delivery
    npm install --omit=dev

    cat > /etc/html-delivery.env <<'ENV'
    PORT=80
    S3_BUCKET=${aws_s3_bucket.games.id}
    S3_REGION=${var.region}
    BASE_URL=http://${aws_s3_bucket_website_configuration.games.website_endpoint}
    ENV
    chmod 600 /etc/html-delivery.env

    cat > /etc/systemd/system/html-delivery.service <<'UNIT'
    [Unit]
    Description=HTML game upload service
    After=network-online.target
    Wants=network-online.target

    [Service]
    Type=simple
    User=html-delivery
    Group=html-delivery
    WorkingDirectory=/opt/html-delivery/html-delivery
    EnvironmentFile=/etc/html-delivery.env
    ExecStart=/usr/bin/node server.js
    AmbientCapabilities=CAP_NET_BIND_SERVICE
    CapabilityBoundingSet=CAP_NET_BIND_SERVICE
    NoNewPrivileges=true
    Restart=always
    RestartSec=5

    [Install]
    WantedBy=multi-user.target
    UNIT

    systemctl daemon-reload
    systemctl enable --now html-delivery.service
  USERDATA
}
