import Redis from "ioredis";
import * as pool from "generic-pool";

export const poolRedis = pool.createPool(
  {
    async create() {
      const redis = new Redis({
        enableAutoPipelining: true,
        host: "redis",
        tcpKeepAlive: true,
      });

      redis.on("error", () => {
        throw new Error("redis closed connection");
      });

      redis.on("close", () => {
        throw new Error("redis closed connection");
      });

      return redis;
    },

    async destroy(client) {
      await client.quit();
    },
  },
  { max: 100, min: 10 }
);

export const hasApelidoOnCache = async (apelido) => {
  const pool = await poolRedis.acquire();

  const hasApelido = await pool.exists(`apelido:${apelido}`);

  await poolRedis.release(pool);

  return hasApelido;
};

export const setApelidoOnCache = async (apelido) => {
  const pool = await poolRedis.acquire();

  await pool.set(`apelido:${apelido}`, 1);

  await poolRedis.release(pool);
};

export const setRequestCache = async (request, body) => {
  const pool = await poolRedis.acquire();
  await pool.set(request, body);
  await poolRedis.release(pool);
};

export const getRequestCache = async (request) => {
  const pool = await poolRedis.acquire();
  const reqCache = await pool.get(request);
  await poolRedis.release(pool);

  return reqCache;
}

export const setPessoaOnCache = async (personId, person) => {
  const pool = await poolRedis.acquire();
  await pool.set(personId, JSON.stringify(person));
  await poolRedis.release(pool);
};

export const hasPessoaOnCache = async (id) => {
  const pool = await poolRedis.acquire();
  const existsOnCache = await pool.exists(id);
  await poolRedis.release(pool);
  return existsOnCache;
};

export const getPessoaFromCache = async (id) => {
  const pool = await poolRedis.acquire();
  const person = await pool.get(id);
  await poolRedis.release(pool);
  return person;
};

export const getTotalKeys = async () => {
  const keys = await poolRedis.keys('*')
  console.log('keys', keys);
}