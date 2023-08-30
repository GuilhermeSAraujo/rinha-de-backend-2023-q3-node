import express from 'express';
import pg from 'pg';
import { randomUUID } from 'crypto';

const { Pool } = pg;
// const connection = new Client("Host=db;Username=admin;Password=123;Database=rinha");
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || "5432"),
  max: 20,

});

// const connectToDB = async () => {
//   try {
//     await pool.connect();
//     console.log('connected o/')
//   } catch (err) {
//     console.log(err);
//   }
// };

// connectToDB();

// Constants
const PORT = 8080;
const HOST = '0.0.0.0';

// App
const app = express();

app.use(express.json());

app.post('/pessoas', async (req, res) => {
  const pessoa = req.body;

  if (!pessoa.nome || !pessoa.apelido || !pessoa.nascimento /* || josé já existe */) {
    return res.status(422).send("Melhore.");
  }

  const entryData =
    `${pessoa.nome}${pessoa.apelido}${pessoa.stack && pessoa.stack.length > 0 ? pessoa.stack.join(",") : ""}`;

  if (/\d/.test(entryData)) {
    return res.status(400).send("Mal request.");
  }

  pessoa.id = randomUUID();
  console.log('pool.idleCount', pool.idleCount);

  await pool.query(
    "INSERT INTO pessoas (id, nome, apelido, nascimento, stack) VALUES ($1, $2, $3, $4, $5)",
    [pessoa.id, pessoa.nome, pessoa.apelido, pessoa.nascimento, `${pessoa.stack && pessoa.stack.length > 0 ? pessoa.stack.join(',') : null}`]);

  console.log('pool.idleCount', pool.idleCount);

  return res.status(200).json(pessoa);
});

app.get('/pessoas/:id', async (req, res) => {
  const id = req.params.id;
  if (!id)
    return res.status(404).json({});
  console.log(id)
  const dbRes = await pool.query(
    'SELECT id, nome, apelido, nascimento, stack FROM pessoas where id = $1', [id]);

  if (dbRes.rows.length === 0)
    return res.status(404).json({});

  return res.status(200).json(dbRes.rows[0]);
});

app.get('/pessoas', async (req, res) => {
  const termo = req.query.t;
  if (!termo)
    return res.status(400).json({});

  const dbRes = await pool.query(
    'SELECT id, nome, apelido, nascimento, stack FROM pessoas where termo LIKE $1', ['%' + termo + '%']);

  return res.status(200).json(dbRes.rows);
});

app.get('/contagem-pessoas', async (req, res) => {
  console.log('pool.idleCount', pool.idleCount);

  const numCadastro = await pool.query("select count(1) from pessoas");
  console.log({ numCadastro });
  res.status = 200;
  res.json(numCadastro.rows[0].name);
});

app.listen(PORT, HOST, () => {
  console.log(`Running on http://${HOST}:${PORT}`);
});