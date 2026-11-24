import test from "node:test";
import assert from "node:assert/strict";
import {
  newOrder,
  advance,
  addPayment,
  balance,
  payroll,
  payEmployee,
  seed,
} from "./model.js";

test("one order credits completed work once and keeps the client balance separate from wages", () => {
  let o = newOrder({
    id: 1049,
    product: "Откатные ворота",
    client: "Демо",
    address: "Объект",
  });
  o = advance(o, 0, {});
  assert.throws(() => advance(o, 1, {}));
  o = advance(o, 1, {
    measurement: { width: 4100, height: 2100, notes: "", photos: [] },
  });
  assert.throws(() => advance(o, 1, {}));
  assert.throws(() => advance(o, 2, { lines: [] }));
  o = advance(o, 2, { lines: [{ name: "Материалы", qty: 2, rate: 60000 }] });
  o = addPayment(o, 45000);
  assert.equal(balance(o), 75000);
  assert.throws(() => addPayment(o, 75001));
  o = advance(o, 3, { crew: ["oleg", "ilya"] });
  o = advance(o, 4, {});
  assert.deepEqual(
    o.earnings.map((e) => [e.employee, e.amount]),
    [
      ["ivan", 1000],
      ["pavel", 6000],
      ["oleg", 2000],
      ["ilya", 2000],
    ],
  );
  let db = { orders: [o], payouts: [] };
  db = payEmployee(db, "oleg", 1000);
  assert.equal(payroll(db, "oleg").due, 1000);
  assert.throws(() => payEmployee(db, "oleg", 1001));
  assert.equal(balance(db.orders[0]), 75000);
  assert.equal(balance(addPayment(o, 75000)), 0);
});

test("one installer receives the full crew rate", () => {
  const o = seed().orders.find((o) => o.stage === 3);
  const done = advance(advance(o, 3, { crew: ["ilya"] }), 4, {});
  assert.deepEqual(
    done.earnings.filter((e) => e.job === "install").map((e) => e.amount),
    [4000],
  );
});
