import test from "node:test";
import assert from "node:assert/strict";
import { analytics, periodRange } from "./analytics.js";
import { sum } from "./model.js";

test("calendar periods include both boundary dates and span the new year", () => {
  assert.deepEqual(periodRange("previous", "2026-01-07"), {
    start: "2025-12-01",
    end: "2025-12-31",
  });
  assert.deepEqual(periodRange("quarter", "2024-03-01"), {
    start: "2023-12-03",
    end: "2024-03-01",
  });
  assert.deepEqual(periodRange("month", "2026-01-01"), {
    start: "2026-01-01",
    end: "2026-01-01",
  });
});
test("receipts reconcile to weeks and orders; backlog and balances span periods", () => {
  const order = {
    id: 1,
    stage: 5,
    due: "2026-03-12",
    history: [
      { text: "Заявка создана", date: "2026-01-31" },
      { text: "Заказ сдан", date: "2026-02-02" },
    ],
    lines: [{ qty: 1, rate: 200 }],
    payments: [
      { date: "2026-01-31", amount: 10 },
      { date: "2026-02-01", amount: 20 },
      { date: "2026-02-02", amount: 30 },
      { date: "2026-02-03", amount: 40 },
    ],
  };
  const active = {
    ...order,
    id: 2,
    stage: 2,
    history: [{ text: "Заявка создана", date: "2026-02-03" }],
    payments: [],
  };
  const current = analytics([order, active], "month", "2026-02-03");
  const previous = analytics([order, active], "previous", "2026-02-03");
  assert.deepEqual(
    current.weeks.map((w) => [w.start, w.end, w.amount]),
    [
      ["2026-02-01", "2026-02-01", 20],
      ["2026-02-02", "2026-02-03", 70],
    ],
  );
  assert.equal(sum(current.weeks), sum(current.received));
  assert.equal(current.received.length, 1);
  assert.equal(sum(previous.received), 10);
  assert.deepEqual(
    current.weeks.map((w) => w.created),
    [0, 1],
  );
  assert.equal(current.created[0].order.id, 2);
  assert.equal(previous.created[0].order.id, 1);
  assert.deepEqual(
    current.completed.map((row) => row.date),
    ["2026-02-02"],
  );
  assert.equal(previous.completed.length, 0);
  assert.equal(sum(current.debt), 100);
  assert.deepEqual(current.debt, previous.debt);
  assert.deepEqual(
    current.stageRows.map((rows) => rows.length),
    [0, 0, 1, 0, 0],
  );
  assert.deepEqual(current.stageRows, previous.stageRows);
});

test("card charts use event dates, accumulate receipts and exclude draft estimates from the debt share", () => {
  const order = {
    stage: 5,
    history: [
      { text: "Заявка создана", date: "2026-03-01" },
      { text: "Заказ сдан", date: "2026-03-02" },
    ],
    payments: [
      { date: "2026-02-28", amount: 5 },
      { date: "2026-03-01", amount: 10 },
      { date: "2026-03-03", amount: 30 },
    ],
    lines: [{ qty: 1, rate: 100 }],
  };
  const draft = {
    stage: 2,
    history: [{ text: "Заявка создана", date: "2026-03-01" }],
    payments: [],
    lines: [{ qty: 1, rate: 500 }],
  };
  const data = analytics([order, draft], "month", "2026-03-03");
  assert.deepEqual(
    data.days.map((d) => [d.created, d.cumulative]),
    [
      [2, 10],
      [0, 10],
      [0, 40],
    ],
  );
  assert.deepEqual(
    data.weeks.map((w) => w.completed),
    [0, 1],
  );
  assert.equal(sum(data.received), data.days.at(-1).cumulative);
  assert.equal(data.agreedTotal, 100);
  assert.equal(sum(data.debt), 55);
  const empty = analytics([], "month", "2026-03-01");
  assert.equal(empty.days.length, 1);
  assert.equal(empty.days[0].cumulative, 0);
  assert.equal(empty.agreedTotal, 0);
});
