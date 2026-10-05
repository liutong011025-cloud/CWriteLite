ALTER TABLE "Character" ADD COLUMN "spriteUrl" TEXT NOT NULL DEFAULT '';

CREATE TABLE "VideoJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "revisionHash" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "plan" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'planning',
    "errorCode" TEXT NOT NULL DEFAULT '',
    "errorMessage" TEXT NOT NULL DEFAULT '',
    "outputUrl" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "VideoJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VideoClip" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "providerTaskId" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'planned',
    "sourceUrl" TEXT NOT NULL DEFAULT '',
    "storedUrl" TEXT NOT NULL DEFAULT '',
    "error" TEXT NOT NULL DEFAULT '',
    "subtitle" JSONB NOT NULL DEFAULT '{}',
    CONSTRAINT "VideoClip_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VideoJob_storyId_revisionHash_key" ON "VideoJob"("storyId", "revisionHash");
CREATE INDEX "VideoJob_userId_idx" ON "VideoJob"("userId");
CREATE UNIQUE INDEX "VideoClip_jobId_sequence_key" ON "VideoClip"("jobId", "sequence");

ALTER TABLE "VideoJob" ADD CONSTRAINT "VideoJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VideoJob" ADD CONSTRAINT "VideoJob_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VideoClip" ADD CONSTRAINT "VideoClip_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "VideoJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
