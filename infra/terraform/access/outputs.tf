output "role_arns" {
  value = { for name, role in aws_iam_role.terraform : name => role.arn }
}
