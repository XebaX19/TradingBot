CREATE TABLE optimization_runs
(
    id BIGINT IDENTITY PRIMARY KEY,
    strategy VARCHAR(100) NOT NULL,
    training_from DATETIME2 NOT NULL,
    training_to DATETIME2 NOT NULL,
    validation_from DATETIME2 NOT NULL,
    validation_to DATETIME2 NOT NULL,
    split_ratio DECIMAL(10,4) NOT NULL,
    candidate_count INT NOT NULL,
    created_at DATETIME2 DEFAULT SYSUTCDATETIME()
);
