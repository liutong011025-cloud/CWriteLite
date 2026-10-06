-- Keep research times as absolute instants regardless of the database/session timezone.
ALTER TABLE "ProcessRecording"
  ALTER COLUMN "startedAt" TYPE TIMESTAMPTZ(3) USING "startedAt" AT TIME ZONE current_setting('TimeZone'),
  ALTER COLUMN "stoppedAt" TYPE TIMESTAMPTZ(3) USING "stoppedAt" AT TIME ZONE current_setting('TimeZone');
ALTER TABLE "ProcessEvent"
  ALTER COLUMN "clientTs" TYPE TIMESTAMPTZ(3) USING "clientTs" AT TIME ZONE 'UTC',
  ALTER COLUMN "clientEndTs" TYPE TIMESTAMPTZ(3) USING "clientEndTs" AT TIME ZONE 'UTC',
  ALTER COLUMN "serverTs" TYPE TIMESTAMPTZ(3) USING "serverTs" AT TIME ZONE current_setting('TimeZone');
