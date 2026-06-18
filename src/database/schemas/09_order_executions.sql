CREATE TABLE order_executions
(
    id BIGINT IDENTITY PRIMARY KEY,
    order_id BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL,
    exchange_order_id VARCHAR(120) NULL,
    executed_price DECIMAL(18,8) NULL,
    executed_quantity DECIMAL(18,8) NULL,
    detail NVARCHAR(MAX) NULL,
    raw_response NVARCHAR(MAX) NULL,
    created_at DATETIME2 DEFAULT SYSUTCDATETIME(),

    CONSTRAINT FK_order_executions_order
    FOREIGN KEY (order_id)
    REFERENCES orders(id)
);
