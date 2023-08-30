CREATE TABLE pessoas (
    id UUID PRIMARY KEY,
    apelido VARCHAR(32) NOT NULL,
    nome VARCHAR(100) NOT NULL,
    nascimento DATE NOT NULL,
    stack VARCHAR(255),
    termo VARCHAR(255) GENERATED ALWAYS AS (apelido || nome || stack) STORED
);