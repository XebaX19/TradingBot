CREATE TABLE strategy_signals
(
    id BIGINT IDENTITY PRIMARY KEY,
    signal_id VARCHAR(100) NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    strategy VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    side VARCHAR(10) NOT NULL,
    entry_price DECIMAL(18,8) NOT NULL,
    stop_loss DECIMAL(18,8) NOT NULL,
    take_profit DECIMAL(18,8) NOT NULL,
    stop_loss_percent DECIMAL(10,4),
    take_profit_percent DECIMAL(10,4),
    risk_reward DECIMAL(10,4),
    rsi DECIMAL(10,4),
    ema200 DECIMAL(18,8),
    drop_percent DECIMAL(10,4),
    volume_ratio DECIMAL(10,4),
    reasons NVARCHAR(MAX),
    signal_timestamp DATETIME2 NOT NULL,
    notified BIT DEFAULT 0,
    created_at DATETIME2 DEFAULT GETDATE(),

    CONSTRAINT UQ_strategy_signal_id
    UNIQUE(signal_id)
);
