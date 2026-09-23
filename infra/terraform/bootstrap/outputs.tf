output "state_bucket_name" {
  description = "Bucket for separate bootstrap and production state keys."
  value       = aws_s3_bucket.terraform_state.id
}
