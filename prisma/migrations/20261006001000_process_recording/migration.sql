-- Additive research tables. Existing writing, approval, character and user tables are unchanged.
CREATE TABLE "ProcessRecording" (
  "id" TEXT PRIMARY KEY,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "stoppedAt" TIMESTAMP(3),
  "createdBy" TEXT NOT NULL,
  "codingVersion" TEXT NOT NULL,
  "parameters" JSONB NOT NULL,
  "quality" JSONB NOT NULL DEFAULT '{}'
);
CREATE UNIQUE INDEX "ProcessRecording_one_active" ON "ProcessRecording" ((1)) WHERE "stoppedAt" IS NULL;
CREATE TABLE "ProcessEvent" (
  "eventUid" TEXT PRIMARY KEY,
  "recordingId" TEXT NOT NULL REFERENCES "ProcessRecording"("id"),
  "userId" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "eventId" TEXT NOT NULL,
  "functionalCode" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "subcategory" TEXT NOT NULL,
  "stage" TEXT NOT NULL,
  "workId" TEXT,
  "workType" TEXT NOT NULL,
  "origin" TEXT NOT NULL,
  "clientTs" TIMESTAMP(3) NOT NULL,
  "clientEndTs" TIMESTAMP(3),
  "durationMs" INTEGER,
  "activeDurationMs" INTEGER,
  "payload" JSONB NOT NULL,
  "serverTs" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "ProcessEvent_recording_time" ON "ProcessEvent" ("recordingId", "clientTs", "eventUid");
CREATE INDEX "ProcessEvent_user_time" ON "ProcessEvent" ("userId", "clientTs");
CREATE INDEX "ProcessEvent_session_sequence" ON "ProcessEvent" ("sessionId", "sequence");
