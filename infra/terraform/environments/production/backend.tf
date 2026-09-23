terraform {
  backend "s3" {
    bucket              = "haetteum-terraform-state-637551067348-us-east-1"
    key                 = "production/terraform.tfstate"
    region              = "us-east-1"
    encrypt             = true
    use_lockfile        = true
    allowed_account_ids = ["637551067348"]
  }
}
