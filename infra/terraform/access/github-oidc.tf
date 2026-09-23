locals {
  state_bucket_arn = "arn:aws:s3:::haetteum-terraform-state-${var.aws_account_id}-${var.aws_region}"
  state_key        = "production/terraform.tfstate"
  github_subject   = "repo:suu1006@83828512/haetteum@1335645577"
  environments = {
    plan  = "terraform-plan"
    apply = "terraform-production"
  }
}

resource "aws_iam_openid_connect_provider" "github" {
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_iam_role" "terraform" {
  for_each = local.environments

  name                 = "HaetteumTerraformProduction${title(each.key)}"
  max_session_duration = 3600
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = "sts:AssumeRoleWithWebIdentity"
      Principal = {
        Federated = aws_iam_openid_connect_provider.github.arn
      }
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          "token.actions.githubusercontent.com:sub" = "${local.github_subject}:environment:${each.value}"
        }
      }
    }]
  })

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_iam_role_policy" "terraform" {
  for_each = local.environments

  name = "ProductionStateAndInventory"
  role = aws_iam_role.terraform[each.key].id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "ReadProductionInventory"
        Effect   = "Allow"
        Action   = "ec2:Describe*"
        Resource = "*"
        Condition = {
          StringEquals = { "aws:RequestedRegion" = var.aws_region }
        }
      },
      {
        Sid      = "ReadExistingInstanceProfile"
        Effect   = "Allow"
        Action   = "iam:GetInstanceProfile"
        Resource = "arn:aws:iam::${var.aws_account_id}:instance-profile/HaetteumBedrockRole"
      },
      {
        Sid      = "ListStateBucket"
        Effect   = "Allow"
        Action   = ["s3:ListBucket", "s3:GetBucketLocation"]
        Resource = local.state_bucket_arn
      },
      {
        Sid      = "ProductionState"
        Effect   = "Allow"
        Action   = each.key == "apply" ? ["s3:GetObject", "s3:PutObject"] : ["s3:GetObject"]
        Resource = "${local.state_bucket_arn}/${local.state_key}"
      },
      {
        Sid      = "ProductionLock"
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
        Resource = "${local.state_bucket_arn}/${local.state_key}.tflock"
      }
    ]
  })
}
