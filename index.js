import * as HyperExpress from 'hyper-express';
import postgres from 'postgres'
import NodeCache from "node-cache";
import cors from 'cors';
import { randomUUID } from 'node:crypto';
import {
  setApelidoOnCache,
  hasApelidoOnCache,
  setRequestCache,
  getRequestCache,
} from "./redis.js";

// const connection = new Client("Host=db;Username=admin;Password=123;Database=rinha");
const sql = postgres({
  host: 'db',
  user: 'root',
  password: '1234',
  database: 'rinhadb',
  max: 100,
  idle_timeout: 20,
  max_lifetime: 60 * 30
});
// pool.connect();

const cache = new NodeCache();

// App
const app = new HyperExpress.Server({ trust_proxy: true });

app.use(cors());

app.post("/pessoas", async (req, res) => {
  // try {
  const body = await req.json();
  const pessoa = body;

  if (
    !pessoa.nome ||
    !pessoa.apelido ||
    !pessoa.nascimento
  ) {
    return res.status(400).send("Melhore.");
  }

  if (pessoa.nome.length > 100 ||
    typeof pessoa.nome === 'number' ||
    pessoa.apelido.length > 32 ||
    typeof pessoa.apelido === 'number' ||
    pessoa.nome.includes("null") ||
    pessoa.apelido.includes("null")
  ) {
    return res.status(422).send("Melhore.");
  }

  const entryData = `${pessoa.nome}${pessoa.stack && pessoa.stack.length > 0 ? pessoa.stack.join("") : ""}`;
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(pessoa.nascimento);

  if (/\d/.test(entryData) || !validDate) {
    return res.status(400).send("Mal request.");
  }
  if (pessoa.stack && pessoa.stack.length > 0) {
    const stackTooLong = `${pessoa.stack && pessoa.stack.length > 0 ? pessoa.stack.join("") : ""}`.length > 32 * pessoa.stack.length;
    if (stackTooLong) {
      return res.status(400).send("Mal request.");
    }
    return;
  }

  const pessoaOnLocalCache = cache.get(pessoa.apelido);
  if (pessoaOnLocalCache) {
    return res.status(422).send("Melhore.");
  }

  if (await hasApelidoOnCache(pessoa.apelido)) {
    return res.status(422).send("Melhore.");
  }

  pessoa.id = randomUUID();

  await sql`INSERT INTO pessoas  (id, nome, apelido, nascimento, stack) values (${pessoa.id}, ${pessoa.nome}, ${pessoa.apelido}, ${pessoa.nascimento}, ${pessoa.stack}) ON CONFLICT (apelido) DO NOTHING`;

  cache.set(pessoa.id, pessoa, 300);
  cache.set(pessoa.apelido, pessoa, 300);

  await Promise.all([
    await setApelidoOnCache(pessoa.apelido),
    await setRequestCache(`pessoas:${pessoa.id}`, JSON.stringify(pessoa)),
  ]);

  return res
    .status(201)
    .header("Location", `/pessoas/${pessoa.id}`)
    .json(pessoa);

  // } catch (err) {
  //   return res
  //     .status(418)
  //     .json(err.message);
  // }
});

app.get("/pessoas/:id", async (req, res) => {
  try {
    const pathParam = req.path_parameters;
    if (!pathParam || !pathParam.id) return res.status(404).json({});

    const id = pathParam.id;

    const pessoaLocalCache = cache.get(id);
    if (pessoaLocalCache)
      return res.status(200).setHeader('cache-control', 'public, max-age=604800, immutable').json(pessoaLocalCache);

    const pessoaRedisCache = await getRequestCache(`pessoas:${id}`);
    if (pessoaRedisCache)
      return res.status(200).header('cache-control', 'public, max-age=604800, immutable').json(JSON.parse(pessoaRedisCache));

    return res.status(404).json({});
  } catch (err) {
    return res
      .status(418)
      .json(err);
  }
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
  try {
    // console.log('/pessoas?:termo', JSON.stringify(req.query_parameters));
    const queryParam = req.query_parameters;

    if (!queryParam || !queryParam.t) return res.status(400).json({});

    const termo = queryParam.t;

    const peopleMatch = cache.get(termo);
    if (peopleMatch) return res.status(200).json(peopleMatch);

    const dbRes = await sql`
    SELECT id, nome, apelido, nascimento, stack FROM pessoas where termo ILIKE ${'%' + sql(termo) + '%'} LIMIT 50`;

    cache.set(termo, dbRes, 15);
    return res.status(200).json(dbRes);
  } catch (err) {
    return res
      .status(418)
      .json(err.message);
  }
});

app.listen(8080)
  .then((socket) => console.log(`Listening on 8080`))
  .catch((e) => console.log("Exception starting server", e.message));
