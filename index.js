import express from "express";
import pg from "pg";
import NodeCache from "node-cache";
import {
  setApelidoOnCache,
  hasApelidoOnCache,
  setRequestCache,
  setPessoaOnCache,
  hasPessoaOnCache,
} from "./redis.js";
import { randomUUID } from "crypto";

const { Pool } = pg;
// const connection = new Client("Host=db;Username=admin;Password=123;Database=rinha");
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || "5432"),
  max: 100,
});

const cache = new NodeCache();

// Constants
const PORT = 8080;
const HOST = "0.0.0.0";

// App
const app = express();

app.use(express.json());

function timeout(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

app.post("/pessoas", async (req, res) => {
  await timeout(500);
  const pessoa = req.body;

  if (
    !pessoa.nome ||
    !pessoa.apelido ||
    !pessoa.nascimento /* || josé já existe */
  ) {
    return res.status(422).send("Melhore.");
  }

  const entryData = `${pessoa.nome}${pessoa.apelido}${
    pessoa.stack && pessoa.stack.length > 0 ? pessoa.stack.join(",") : ""
  }`;

  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(pessoa.nascimento);

  if (/\d/.test(entryData) || !validDate) {
    return res.status(400).send("Mal request.");
  }

  pessoa.id = randomUUID();

  const pessoaOnLocalCache = cache.get(pessoa.apelido);
  if (pessoaOnLocalCache) return res.status(422).send("Melhore.");

  if (await hasApelidoOnCache(pessoa.apelido))
    return res.status(422).send("Melhore.");

  await pool.query(
    "INSERT INTO pessoas (id, nome, apelido, nascimento, stack) VALUES ($1, $2, $3, $4, $5)",
    [
      pessoa.id,
      pessoa.nome,
      pessoa.apelido,
      pessoa.nascimento,
      `${
        pessoa.stack && pessoa.stack.length > 0 ? pessoa.stack.join(",") : null
      }`,
    ]
  );

  await Promise.all([
    await setApelidoOnCache(pessoa.apelido),
    await setPessoaOnCache(pessoa.id, pessoa),
  ]);

  cache.set(pessoa.id, pessoa, 300);
  cache.set(pessoa.apelido, pessoa, 300);

  return res
    .status(201)
    .setHeader("Location", `/pessoas/${pessoa.id}`)
    .json(pessoa);
});

app.get("/pessoas/:id", async (req, res) => {
  await timeout(500);

  const id = req.params.id;
  if (!id) return res.status(404).json({});

  const pessoa = cache.get(id);

  if (pessoa) return res.status(200).json(pessoa);

  if (await hasPessoaOnCache(id)) return res.status(200).json(pessoa);

  const dbRes = await pool.query(
    "SELECT id, nome, apelido, nascimento, stack FROM pessoas where id = $1",
    [id]
  );

  if (dbRes.rows.length === 0) return res.status(404).json({});

  return res.status(200).json(dbRes.rows[0]);
});

app.get("/pessoas", async (req, res) => {
  await timeout(500);

  const termo = req.query.t;
  if (!termo) return res.status(400).json({});

  const peopleMatch = cache.get(termo);
  if (peopleMatch) return res.status(200).json(peopleMatch);

  const dbRes = await pool.query(
    "SELECT id, nome, apelido, nascimento, stack FROM pessoas where termo LIKE $1",
    ["%" + termo + "%"]
  );

  cache.set(termo, dbRes.rows, 15);

  return res.status(200).json(dbRes.rows);
});

app.get("/contagem-pessoas", async (req, res) => {
  const numCadastro = await pool.query("select count(1) from pessoas");

  res.status = 200;
  res.json({ count: numCadastro.rows[0] });
});

app.listen(PORT, HOST, () => {
  console.log(`Running on http://${HOST}:${PORT}`);
});
