mock_provider "aws" {}

variables {
  aws_region     = "us-east-1"
  aws_account_id = "637551067348"
}

run "separate_state_permissions" {
  command = plan

  assert {
    condition = (
      jsondecode(aws_iam_role_policy.terraform["plan"].policy).Statement[3].Action == ["s3:GetObject"] &&
      contains(jsondecode(aws_iam_role_policy.terraform["apply"].policy).Statement[3].Action, "s3:PutObject")
    )
    error_message = "Only the apply role may write production state."
  }

  assert {
    condition = alltrue([
      for role in values(aws_iam_role_policy.terraform) :
      jsondecode(role.policy).Statement[0].Action == "ec2:Describe*" &&
      jsondecode(role.policy).Statement[0].Condition.StringEquals["aws:RequestedRegion"] == "us-east-1"
    ])
    error_message = "Initial import roles must have only regional EC2 read permissions."
  }

  assert {
    condition = alltrue([
      for role in values(aws_iam_role_policy.terraform) :
      endswith(jsondecode(role.policy).Statement[4].Resource, "production/terraform.tfstate.tflock")
    ])
    error_message = "Lock delete permissions must be scoped to the production lock."
  }
}
