CREATE TABLE candle_reconciliation_log
(
    id BIGINT IDENTITY PRIMARY KEY,
    execution_date DATETIME2,
    symbol VARCHAR(20),
    timeframe VARCHAR(10),
    process_status VARCHAR(20),
    candles_checked INT,
    candles_missing INT,
    candles_recovered INT,
    errors INT,
    details NVARCHAR(MAX),
    created_at DATETIME2 DEFAULT SYSUTCDATETIME()
);
