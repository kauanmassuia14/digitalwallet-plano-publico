variable "aws_region" {
  type        = string
  description = "AWS Target Region"
  default     = "eu-west-1" # Ireland, close to Spain/Portugal pilots
}

variable "environment" {
  type        = string
  description = "Target deployment environment (dev/stage/prod)"
  default     = "dev"
}

variable "db_password" {
  type        = string
  description = "Database master password"
  sensitive   = true
}

variable "container_image" {
  type        = string
  description = "Docker image repository URI for NestJS API"
  default     = "digitalwallet/api"
}
