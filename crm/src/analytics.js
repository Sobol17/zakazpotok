import dayjs from "dayjs";
import { balance, price, stages, sum } from "./model.js";

const iso = (day) => day.format("YYYY-MM-DD");

export function periodRange(period, today) {
  const end = dayjs(today);
  if (period === "previous") {
    const previous = end.subtract(1, "month");
    return {
      start: iso(previous.startOf("month")),
      end: iso(previous.endOf("month")),
    };
  }
  const start =
    period === "quarter" ? end.subtract(89, "day") : end.startOf("month");
  return { start: iso(start), end: today };
}

function inRange(date, range) {
  return date >= range.start && date <= range.end;
}

function paymentRows(orders, range) {
  return orders
    .flatMap((order) => {
      const payments = order.payments.filter((p) => inRange(p.date, range));
      return payments.length ? [{ order, amount: sum(payments) }] : [];
    })
    .sort((a, b) => b.amount - a.amount);
}

function eventRows(orders, text, range) {
  return orders
    .flatMap((order) => {
      const event = order.history.find((entry) => entry.text === text);
      return event && inRange(event.date, range)
        ? [{ order, date: event.date }]
        : [];
    })
    .sort((a, b) => b.date.localeCompare(a.date) || b.order.id - a.order.id);
}

export function analytics(orders, period, today) {
  const range = periodRange(period, today);
  const created = eventRows(orders, "Заявка создана", range);
  const completed = eventRows(orders, "Заказ сдан", range);
  const daily = new Map();
  for (
    let day = dayjs(range.start);
    iso(day) <= range.end;
    day = day.add(1, "day")
  ) {
    const date = iso(day);
    daily.set(date, { date, created: 0, received: 0 });
  }
  for (const row of created) daily.get(row.date).created++;
  for (const order of orders) {
    for (const payment of order.payments) {
      const day = daily.get(payment.date);
      if (day) day.received += payment.amount;
    }
  }
  let cumulative = 0;
  const days = Array.from(daily.values(), (day) => {
    cumulative += day.received;
    return { ...day, cumulative };
  });
  const weeks = [];
  let start = dayjs(range.start);
  while (iso(start) <= range.end) {
    const sunday = start.add((7 - start.day()) % 7, "day");
    const week = {
      start: iso(start),
      end: iso(sunday) < range.end ? iso(sunday) : range.end,
    };
    const rows = paymentRows(orders, week);
    weeks.push({
      ...week,
      rows,
      amount: sum(rows),
      created: created.filter((row) => inRange(row.date, week)).length,
      completed: completed.filter((row) => inRange(row.date, week)).length,
    });
    start = sunday.add(1, "day");
  }
  const stageRows = stages
    .slice(0, -1)
    .map((_, i) =>
      orders.filter((order) => order.stage === i).map((order) => ({ order })),
    );
  return {
    range,
    weeks,
    stageRows,
    created,
    completed,
    days,
    agreedTotal: orders.reduce(
      (total, order) => total + (order.stage >= 3 ? price(order.lines) : 0),
      0,
    ),
    received: paymentRows(orders, range),
    debt: orders
      .map((order) => ({ order, amount: balance(order) }))
      .filter((row) => row.amount > 0)
      .sort((a, b) => b.amount - a.amount),
  };
}
