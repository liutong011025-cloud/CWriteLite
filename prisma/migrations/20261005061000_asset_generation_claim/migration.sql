CREATE TABLE "AssetGeneration" (
  "id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'processing',
  "imageUrl" TEXT NOT NULL DEFAULT '',
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AssetGeneration_pkey" PRIMARY KEY ("id")
);
