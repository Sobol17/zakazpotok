import test from "node:test";
import assert from "node:assert/strict";
import {
  seed,
  newOrder,
  withHistoricalJobs,
  balance,
  price,
  sum,
  dateKey,
  people,
  payroll,
} from "./model.js";
import { analytics } from "./analytics.js";

test("seeded receipts span the last 90 days and reconcile to real orders", () => {
  const db = seed();
  const today = dateKey();
  const quarter = analytics(db.orders, "quarter", today);
  assert.equal(db.orders.length, 26);
  assert.ok(quarter.weeks.every((w) => w.amount > 0));
  assert.equal(sum(quarter.weeks), sum(db.orders.flatMap((o) => o.payments)));
  const past = analytics(db.orders, "previous", today);
  assert.ok(
    past.created.length && past.completed.length && past.received.length,
  );
  for (const order of db.orders.filter((o) => o.id < 1039)) {
    assert.equal(order.stage, 5);
    assert.equal(balance(order), 0);
    assert.equal(order.payments.length, 2);
    assert.equal(sum(order.payments), price(order.lines));
    const dates = order.history.map((event) => event.date);
    assert.deepEqual(dates, dates.toSorted());
    assert.equal(order.payments[0].date, dates[3]);
    assert.equal(order.payments[1].date, dates.at(-1));
    assert.ok(dates[0] >= quarter.range.start && dates.at(-1) <= today);
  }
});

test("opening an existing demo adds history once while preserving edits and wages due", () => {
  const custom = newOrder({
    id: 1049,
    product: "Навес",
    client: "Свой клиент",
    address: "Объект",
  });
  const saved = {
    orders: [custom, ...seed().orders.filter((o) => o.id >= 1039)],
    payouts: [{ employee: "ivan", amount: 750, date: dateKey() }],
  };
  saved.orders[1].brief = "Сохранённая правка";
  const upgraded = withHistoricalJobs(saved);
  assert.equal(upgraded.orders.length, 27);
  assert.deepEqual(upgraded.orders.slice(0, saved.orders.length), saved.orders);
  assert.ok(upgraded.payouts.includes(saved.payouts[0]));
  for (const p of people)
    assert.equal(payroll(upgraded, p.id).due, payroll(saved, p.id).due);
  const reloaded = JSON.parse(JSON.stringify(upgraded));
  assert.equal(withHistoricalJobs(reloaded), reloaded);
});
