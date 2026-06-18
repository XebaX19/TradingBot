CREATE TABLE positions
(
    id BIGINT IDENTITY PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    side VARCHAR(10) NOT NULL,
    quantity DECIMAL(18,8) NOT NULL,
    average_entry_price DECIMAL(18,8) NOT NULL,
    stop_loss DECIMAL(18,8) NULL,
    take_profit DECIMAL(18,8) NULL,
    status VARCHAR(20) NOT NULL,
    opened_at DATETIME2 NOT NULL,
    closed_at DATETIME2 NULL,
    created_at DATETIME2 DEFAULT SYSUTCDATETIME()
);
