DROP INDEX "tourism_districts_provider_code_key";

CREATE UNIQUE INDEX "tourism_districts_region_id_provider_code_key"
ON "tourism_districts"("region_id", "provider_code");
