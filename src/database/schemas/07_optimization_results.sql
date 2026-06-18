CREATE TABLE optimization_results
(
    id BIGINT IDENTITY PRIMARY KEY,
    optimization_run_id BIGINT NOT NULL,
    rank_position INT NOT NULL,
    parameters_json NVARCHAR(MAX) NOT NULL,
    training_return_percent DECIMAL(18,8) NOT NULL,
    validation_return_percent DECIMAL(18,8) NOT NULL,
    training_drawdown DECIMAL(18,8) NOT NULL,
    validation_drawdown DECIMAL(18,8) NOT NULL,
    training_trades INT NOT NULL,
    validation_trades INT NOT NULL,
    return_degradation_percent DECIMAL(18,8) NOT NULL,
    parameter_stability_score DECIMAL(18,8) NOT NULL,
    robustness_score DECIMAL(18,8) NOT NULL,
    overfitting_detected BIT NOT NULL,
    is_robust BIT NOT NULL,
    created_at DATETIME2 DEFAULT SYSUTCDATETIME(),

    CONSTRAINT FK_optimization_results_run
    FOREIGN KEY (optimization_run_id)
    REFERENCES optimization_runs(id)
);
