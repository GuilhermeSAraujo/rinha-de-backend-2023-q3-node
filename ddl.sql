-- CREATE TABLE pessoas (
--     id UUID PRIMARY KEY,
--     apelido VARCHAR(32) NOT NULL,
--     nome VARCHAR(100) NOT NULL,
--     nascimento DATE NOT NULL,
--     stack VARCHAR(255),
--     termo VARCHAR(255) GENERATED ALWAYS AS (apelido || nome || stack) STORED
-- );

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER SCHEMA PUBLIC OWNER TO root;

SET default_tablespace = '';

SET default_table_access_method = heap;

DROP TABLE IF EXISTS pessoas;

CREATE TABLE IF NOT EXISTS pessoas(
    id UUID PRIMARY KEY,
    apelido VARCHAR(32) NOT NULL,
    nome VARCHAR(100) NOT NULL,
    nascimento DATE NOT NULL,
    stack VARCHAR(255),
    termo VARCHAR(255) GENERATED ALWAYS AS (apelido || nome || stack) STORED
);

CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA pg_catalog;

CREATE INDEX idx_pessoas_apelido_trgm ON pessoas USING gin("apelido" gin_trgm_ops);
CREATE INDEX idx_pessoas_nome_trgm ON pessoas USING gin("nome" gin_trgm_ops);
