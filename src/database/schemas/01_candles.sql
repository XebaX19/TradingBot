CREATE TABLE candles
(
    id BIGINT IDENTITY PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    timeframe VARCHAR(10) NOT NULL,
    open_time DATETIME2 NOT NULL,
    [open] DECIMAL(18,8),
    [high] DECIMAL(18,8),
    [low] DECIMAL(18,8),
    [close] DECIMAL(18,8),
    volume DECIMAL(18,8),
    created_at DATETIME2 DEFAULT SYSUTCDATETIME(),

    CONSTRAINT UQ_CANDLE UNIQUE
    (
        symbol,
        timeframe,
        open_time
    )
);
