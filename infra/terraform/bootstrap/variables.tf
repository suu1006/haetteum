variable "aws_region" {
  description = "Region verified against the infrastructure inventory."
  type        = string
  nullable    = false

  validation {
    condition     = var.aws_region == "us-east-1"
    error_message = "This production root currently supports only the verified Northern Virginia region."
  }
}

variable "aws_account_id" {
  description = "Expected AWS account ID, verified before any plan or import."
  type        = string
  nullable    = false

  validation {
    condition     = can(regex("^[0-9]{12}$", var.aws_account_id))
    error_message = "Use the verified 12-digit AWS account ID."
  }
}
