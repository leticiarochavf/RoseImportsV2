import assert from "node:assert/strict";

import pg from "pg";

/**
 * Prova de que o limite de usos de um cupom não estoura sob concorrência.
 *
 * Duas conexões chamam create_preorder() ao mesmo tempo com o mesmo
 * cupom, que está a UM uso do limite. A linha do cupom serializa as
 * duas: uma comita, a outra é recusada com coupon_exhausted.
 *
 * Roda só contra um banco descartável, indicado por COUPONS_TEST_DB_URL.
 * Nunca aponte para produção: o script escreve e faz rollback, mas
 * qualquer engano aqui mexe em pedido de verdade.
 */

const databaseUrl = process.env.COUPONS_TEST_DB_URL;

assert(
  databaseUrl,
  "COUPONS_TEST_DB_URL não configurada. Aponte para um banco descartável.",
);

assert(
  process.env.COUPONS_TEST_CONFIRM === "sim-banco-descartavel",
  "Recusado: defina COUPONS_TEST_CONFIRM=sim-banco-descartavel para confirmar que o alvo é descartável.",
);

const client = (): pg.Client =>
  new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });

const setup = client();
const a = client();
const b = client();

const CODE = `CORRIDA${Date.now().toString().slice(-6)}`;

const items = JSON.stringify([
  {
    variantId: null,
    productId: null,
    productName: "Item de teste",
    variantLabel: "Único",
    unitPriceCents: 10000,
    quantity: 1,
  },
]);

const createPreorder = `
  select * from public.create_preorder(
    $1, 'retirada', null, 'pix', $2::jsonb, $3
  )
`;

await setup.connect();
await a.connect();
await b.connect();

let reserved = -1;
let rejections = 0;

try {
  // Cupom a um uso do limite: das duas tentativas, só uma pode passar.
  await setup.query(
    `insert into public.coupons (code, discount_percent, max_uses, uses_reserved)
     values ($1, 10, 2, 1)`,
    [CODE],
  );

  await a.query("begin");
  await b.query("begin");

  // A primeira reserva e segura a linha até comitar.
  await a.query(createPreorder, ["Cliente A", items, CODE]);

  // A segunda fica bloqueada nesta linha até o commit da primeira.
  const pendingB = b
    .query(createPreorder, ["Cliente B", items, CODE])
    .then(() => "ok" as const)
    .catch((error: Error) => error.message);

  await a.query("commit");

  const resultB = await pendingB;

  if (resultB === "ok") {
    await b.query("commit");
  } else {
    rejections += 1;
    assert(
      resultB.includes("coupon_exhausted"),
      `Recusa esperada por limite de usos, veio: ${resultB}`,
    );
    await b.query("rollback");
  }

  const { rows } = await setup.query<{ uses_reserved: number }>(
    "select uses_reserved from public.coupons where code = $1",
    [CODE],
  );

  reserved = rows[0]?.uses_reserved ?? -1;

  assert.equal(reserved, 2, "As duas confirmações juntas passaram do limite.");
  assert.equal(rejections, 1, "A segunda confirmação deveria ter sido recusada.");

  console.log(
    `ok — limite respeitado: uses_reserved = ${reserved} de 2, 1 pedido recusado.`,
  );
} finally {
  // Limpa o que este teste criou, sem tocar em mais nada.
  await setup.query(
    `delete from public.orders where coupon_code_snapshot = $1`,
    [CODE],
  );
  await setup.query(`delete from public.coupons where code = $1`, [CODE]);

  await Promise.all([setup.end(), a.end(), b.end()]);
}
