import Redis from "ioredis";
import * as pool from "generic-pool";

export const poolRedis = pool.createPool(
  {
    async create() {
      const redis = new Redis({ enableAutoPipelining: true, host: "redis" });

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
  { max: 50, min: 5 }
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

export const setPessoaOnCache = async (personId, person) => {
  const pool = await poolRedis.acquire();
  await pool.set(personId, person);
  await poolRedis.release(pool);
};

export const hasPessoaOnCache = async (id) => {
  const pool = await poolRedis.acquire();
  const existsOnCache = await pool.exists(id);
  await poolRedis.release(pool);
  return existsOnCache;
};
