import express from "express";
import postgres from 'postgres'
import NodeCache from "node-cache";
import cors from 'cors';
import {
  setApelidoOnCache,
  hasApelidoOnCache,
  setRequestCache,
  setPessoaOnCache,
  hasPessoaOnCache,
  getPessoaFromCache,
  getRequestCache
} from "./redis.js";
import { randomUUID } from "crypto";

// const connection = new Client("Host=db;Username=admin;Password=123;Database=rinha");
const sql = postgres({
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  max: 100,
});
// pool.connect();

const cache = new NodeCache();

// Constants
const PORT = 8080;
const HOST = "0.0.0.0";

// App
const app = express();

app.use(express.json());
app.use(cors());

function timeout(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

app.post("/pessoas", async (req, res) => {
  const pessoa = req.body;

  if (
    !pessoa.nome ||
    !pessoa.apelido ||
    !pessoa.nascimento ||
    pessoa.nome.includes("null") ||
    pessoa.apelido.includes("null")
  ) {
    return res.status(422).send("Melhore.");
  }

  const entryData = `${pessoa.nome}${pessoa.apelido}${pessoa.stack && pessoa.stack.length > 0 ? pessoa.stack.join(",") : ""
    }`;

  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(pessoa.nascimento);

  if (/\d/.test(entryData) || !validDate) {
    return res.status(400).send("Mal request.");
  }

  const pessoaOnLocalCache = cache.get(pessoa.apelido);
  if (pessoaOnLocalCache) {
    console.log("Pessoa já existe no cache local.");
    return res.status(422).send("Melhore.");
  }

  if (await hasApelidoOnCache(pessoa.apelido)) {
    console.log("Pessoa já existe no cache redis.");
    return res.status(422).send("Melhore.");
  }

  pessoa.id = randomUUID();
  await sql`
    INSERT INTO pessoas (id, nome, apelido, nascimento, stack)
    VALUES
    (${pessoa.id}, ${pessoa.nome}, ${pessoa.apelido}, ${pessoa.nascimento}, ${pessoa.stack && pessoa.stack.length > 0 ? pessoa.stack.join(",") : null}) ON CONFLICT (apelido) DO NOTHING`;
  console.log(`Pessoa criada! ${pessoa.apelido}`);

  await Promise.all([
    await setApelidoOnCache(pessoa.apelido),
    await setRequestCache(`pessoas:${pessoa.id}`, JSON.stringify(pessoa)),
  ]);

  cache.set(pessoa.id, pessoa, 300);
  cache.set(pessoa.apelido, pessoa, 300);
  return res
    .status(201)
    .setHeader("Location", `/pessoas/${pessoa.id}`)
    .json(pessoa);
});

app.get("/pessoas/:id", async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(404).json({});

  const pessoaLocalCache = cache.get(id);
  if (pessoaLocalCache) {
    console.log("Pessoa consultada já no cache local");
    return res.status(200).setHeader('cache-control', 'public, max-age=604800, immutable').json(pessoaLocalCache);
  }

  const pessoaRedisCache = await getRequestCache(`pessoas:${id}`);
  if (pessoaRedisCache) {
    console.log("Pessoa consultada já no cache redis");
    return res.status(200).setHeader('cache-control', 'public, max-age=604800, immutable').json(JSON.parse(pessoaRedisCache));
  }

  return res.status(404).json({});
  // const dbRes = await pool.query(
  //   "SELECT id, nome, apelido, nascimento, stack FROM pessoas where id = $1",
  //   [id]
  // );
  // console.log("Consultou o BANCO para rota /id");
  // if (dbRes.rows.length === 0) 

  // cache.set(id, dbRes.rows[0]);

  // return res.status(200).header('cache-control', 'public, max-age=604800, immutable').json(dbRes.rows[0]);
});

app.get("/pessoas", async (req, res) => {

  const termo = req.query.t;
  if (!termo) return res.status(400).json({});

  const peopleMatch = cache.get(termo);
  if (peopleMatch) return res.status(200).json(peopleMatch);

  const dbRes = await sql`
    SELECT id, nome, apelido, nascimento, stack FROM pessoas where termo ILIKE ${'%' + sql(termo) + '%'}`;

  cache.set(termo, dbRes.rows, 15);

  return res.status(200).json(dbRes.rows);
});

app.get("/contagem-pessoas", async (req, res) => {
  const numCadastro = await sql`SELECT count(*) from public.people`

  console.log({ count: numCadastro });

  res.status = 200;
  res.json({ count: numCadastro });
});

app.listen(PORT, HOST, () => {
  console.log(`Running on http://${HOST}:${PORT}`);
});
