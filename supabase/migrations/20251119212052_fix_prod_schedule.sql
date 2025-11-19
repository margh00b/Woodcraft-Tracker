

-- 3. Add a nullable foreign key in jobs to reference production_schedule
ALTER TABLE jobs
ADD COLUMN prod_id BIGINT REFERENCES production_schedule(prod_id) ON DELETE SET NULL;

-- 5. Drop old job_id from production_schedule if no longer needed
ALTER TABLE production_schedule
DROP COLUMN IF EXISTS job_id;
