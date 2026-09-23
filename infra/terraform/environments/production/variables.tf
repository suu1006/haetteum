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

variable "existing_admin_ipv4_cidr" {
  description = "Existing /32 ingress source for ports 3000/4000; preserve the current rule."
  type        = string
  nullable    = false

  validation {
    condition     = can(cidrnetmask(var.existing_admin_ipv4_cidr)) && endswith(var.existing_admin_ipv4_cidr, "/32")
    error_message = "Use the existing single IPv4 /32 source."
  }
}
