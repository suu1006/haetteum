-- AlterTable
ALTER TABLE "users" ADD COLUMN     "travel_styles" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "interested_regions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
