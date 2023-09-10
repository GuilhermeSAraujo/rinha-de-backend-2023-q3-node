import * as HyperExpress from "hyper-express";
import postgres from "postgres";
import NodeCache from "node-cache";
import cors from "cors";
import { randomUUID } from "node:crypto";
import {
	setApelidoOnCache,
	hasApelidoOnCache,
	setRequestCache,
	getRequestCache,
} from "./redis.js";
import validations from "./validations.js";

const sql = postgres({
	host: "db",
	user: "root",
	password: "1234",
	database: "rinhadb",
	max: 100,
	idle_timeout: 20,
	max_lifetime: 60 * 30,
});

// creating local cache
const cache = new NodeCache();

// creating server
const app = new HyperExpress.Server({ trust_proxy: true });

app.use(cors());

const peopleToInsert = [];

app.get("/contagem-pessoas", async (req, res) => {
	const dbRes = await sql`SELECT COUNT(*) FROM pessoas`;
	return res.status(200).json(dbRes[0].count);
});

app.post("/pessoas", async (req, res) => {
	const body = await req.json();
	const person = body;
	if (validations.hasInvalidBody(person))
		return res.status(422).send("Melhore.");

	const personOnLocalCache = cache.get(person.apelido);
	if (personOnLocalCache) {
		return res.status(422).send("Melhore.");
	}

	if (await hasApelidoOnCache(person.apelido)) {
		return res.status(422).send("Melhore.");
	}

	person.id = randomUUID();

	peopleToInsert.push(person);

	if (peopleToInsert.length === 100) {
		peopleToInsert.forEach(async (person) => {
			await sql`INSERT INTO pessoas  (id, nome, apelido, nascimento, stack) values (${
				person.id
			}, ${person.nome}, ${person.apelido}, ${person.nascimento}, ${
				person.stack && Array.isArray(person.stack)
					? person.stack.toString()
					: ""
			}) ON CONFLICT (apelido) DO NOTHING`;
		});

		peopleToInsert.splice(0, peopleToInsert.length);
	}

	cache.set(person.id, person, 5000);
	cache.set(person.apelido, person, 5000);

	await Promise.all([
		await setApelidoOnCache(person.apelido),
		await setRequestCache(`persons:${person.id}`, JSON.stringify(person)),
	]);

	return res
		.status(201)
		.header("Location", `/pessoas/${person.id}`)
		.json(person);
});

app.get("/pessoas/:id", async (req, res) => {
	try {
		const pathParam = req.path_parameters;
		if (!pathParam || !pathParam.id) return res.status(404).json({});

		const id = pathParam.id;

		const personOnLocalCache = cache.get(id);
		if (personOnLocalCache)
			return res
				.status(200)
				.setHeader("cache-control", "public, max-age=604800, immutable")
				.json(personOnLocalCache);

		const personOnRedisCache = await getRequestCache(`persons:${id}`);
		if (personOnRedisCache)
			return res
				.status(200)
				.header("cache-control", "public, max-age=604800, immutable")
				.json(JSON.parse(personOnRedisCache));

		return res.status(404).json({});
	} catch (err) {
		return res.status(500).json(err);
	}
});

app.get("/pessoas", async (req, res) => {
	try {
		const queryParam = req.query_parameters;

		if (!queryParam || !queryParam.t) return res.status(400).json({});

		const term = queryParam.t;

		const peopleMatch = cache.get(term);
		if (peopleMatch) return res.status(200).json(peopleMatch);

		const dbRes = await sql`
    	SELECT id, nome, apelido, nascimento, stack FROM pessoas where termo LIKE ${
				"%" + sql(term) + "%"
			} LIMIT 50`;

		return res.status(200).json(dbRes);
	} catch (err) {
		return res.status(500).json(err.message);
	}
});

app
	.listen(8080)
	.then((socket) => console.log(`Listening on 8080`))
	.catch((e) => console.log("Exception starting server", e.message));
