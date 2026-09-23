mock_provider "aws" {}

variables {
  aws_region     = "us-east-1"
  aws_account_id = "123456789012"
}

run "state_storage_guards" {
  command = plan

  assert {
    condition     = aws_s3_bucket.terraform_state.bucket == "haetteum-terraform-state-123456789012-us-east-1" && !aws_s3_bucket.terraform_state.force_destroy
    error_message = "State bucket must be scoped to account/region and preserve objects on destroy."
  }

  assert {
    condition = (
      aws_s3_bucket_public_access_block.terraform_state.block_public_acls &&
      aws_s3_bucket_public_access_block.terraform_state.block_public_policy &&
      aws_s3_bucket_public_access_block.terraform_state.ignore_public_acls &&
      aws_s3_bucket_public_access_block.terraform_state.restrict_public_buckets
    )
    error_message = "All four public access controls must be enabled."
  }

  assert {
    condition     = aws_s3_bucket_versioning.terraform_state.versioning_configuration[0].status == "Enabled"
    error_message = "State history requires versioning."
  }

  assert {
    condition     = one(aws_s3_bucket_server_side_encryption_configuration.terraform_state.rule).apply_server_side_encryption_by_default[0].sse_algorithm == "AES256"
    error_message = "State storage must use server-side encryption."
  }

  assert {
    condition     = aws_s3_bucket_ownership_controls.terraform_state.rule[0].object_ownership == "BucketOwnerEnforced"
    error_message = "ACLs must remain disabled."
  }
}

run "reject_wrong_region" {
  command = plan
  variables {
    aws_region = "ap-northeast-2"
  }
  expect_failures = [var.aws_region]
}

run "reject_invalid_account" {
  command = plan
  variables {
    aws_account_id = "not-an-account"
  }
  expect_failures = [var.aws_account_id]
}
