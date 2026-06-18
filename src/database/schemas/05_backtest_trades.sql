CREATE TABLE backtest_trades
(
    id BIGINT IDENTITY PRIMARY KEY,
    backtest_run_id BIGINT NOT NULL,
    signal_id VARCHAR(100) NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    entry_time DATETIME2 NOT NULL,
    entry_price DECIMAL(18,8) NOT NULL,
    exit_time DATETIME2 NOT NULL,
    exit_price DECIMAL(18,8) NOT NULL,
    quantity DECIMAL(18,8) NOT NULL,
    position_size DECIMAL(18,8) NOT NULL,
    gross_pnl DECIMAL(18,8) NOT NULL,
    net_pnl DECIMAL(18,8) NOT NULL,
    fees_paid DECIMAL(18,8) NOT NULL,
    profit_percent DECIMAL(18,8) NOT NULL,
    equity_before DECIMAL(18,8) NOT NULL,
    equity_after DECIMAL(18,8) NOT NULL,
    result VARCHAR(10) NOT NULL,
    exit_reason VARCHAR(50) NOT NULL,
    created_at DATETIME2 DEFAULT SYSUTCDATETIME(),

    CONSTRAINT FK_backtest_trades_run
    FOREIGN KEY (backtest_run_id)
    REFERENCES backtest_runs(id)
);
