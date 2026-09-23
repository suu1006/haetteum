resource "aws_instance" "app" {
  ami                         = "ami-0f8a61b66d1accaee"
  instance_type               = "t3.small"
  subnet_id                   = data.aws_subnet.existing.id
  private_ip                  = "172.31.25.250"
  associate_public_ip_address = true
  key_name                    = "hatteum"
  vpc_security_group_ids      = [aws_security_group.app.id]
  iam_instance_profile        = "HaetteumBedrockRole"
  monitoring                  = false
  ebs_optimized               = true
  source_dest_check           = true

  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 2
    http_protocol_ipv6          = "disabled"
    instance_metadata_tags      = "disabled"
  }

  credit_specification {
    cpu_credits = "unlimited"
  }

  root_block_device {
    volume_type           = "gp3"
    volume_size           = 20
    iops                  = 3000
    throughput            = 125
    encrypted             = false
    delete_on_termination = true
  }

  tags = {
    Name = "hatteum"
  }

  lifecycle {
    prevent_destroy = true
  }
}
