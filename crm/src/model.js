export const stages = [
  "Заявка",
  "Замер",
  "Оценка",
  "Изготовление",
  "Монтаж",
  "Сдан",
];
export const actions = [
  "Назначить замер",
  "Завершить замер",
  "Согласовать смету",
  "Завершить изготовление",
  "Сдать заказ",
];
export const products = [
  "Откатные ворота",
  "Распашные ворота",
  "Ограждение",
  "Навес",
  "Калитка",
];
export const people = [
  { id: "elena", name: "Елена Соколова", role: "Менеджер", color: "rose" },
  { id: "ivan", name: "Иван Белов", role: "Замерщик", color: "blue" },
  { id: "pavel", name: "Павел Орлов", role: "Мастер цеха", color: "sand" },
  { id: "oleg", name: "Олег Миронов", role: "Монтажник", color: "green" },
  { id: "ilya", name: "Илья Романов", role: "Монтажник", color: "purple" },
];
export const person = (id) => people.find((p) => p.id === id);
export const rates = { measure: 1000, fabrication: 6000, install: 4000 };
export const jobs = {
  measure: "Замер",
  fabrication: "Изготовление",
  install: "Монтаж",
};
const moneyFormat = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 2,
});
export const money = (n) => moneyFormat.format(n) + " ₽";
export const sum = (rows) => rows.reduce((s, r) => s + r.amount, 0);
export const price = (lines) =>
  lines.reduce((s, row) => s + Math.round(row.qty * row.rate), 0);
export const balance = (order) =>
  order.stage >= 3 ? price(order.lines) - sum(order.payments) : 0;
export const owners = (o) =>
  [[o.manager], [o.measureBy], [o.manager], [o.maker], o.crew, [o.manager]][
    o.stage
  ];
export function dateKey(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}
export function shortDate(date, opts = { day: "numeric", month: "short" }) {
  return new Intl.DateTimeFormat("ru-RU", opts)
    .format(new Date(date + "T12:00:00"))
    .replace(/\.$/, "");
}
export const overdue = (o) => o.stage < 5 && o.due < dateKey();
export const newOrder = ({
  id,
  product,
  client,
  address,
  phone = "",
  brief = "",
  due = dateKey(),
}) => ({
  id,
  product,
  client,
  address,
  phone,
  brief,
  due,
  stage: 0,
  manager: "elena",
  measureBy: "ivan",
  maker: "pavel",
  crew: ["oleg", "ilya"],
  measurement: { width: null, height: null, notes: "", photos: [] },
  lines: [],
  payments: [],
  earnings: [],
  history: [{ date: dateKey(), text: "Заявка создана" }],
});
const requireValue = (ok, message) => {
  if (!ok) throw new Error(message);
};
export function advance(order, expected, payload, eventDate = dateKey()) {
  requireValue(
    order.stage === expected && expected < 5,
    "Этап уже изменился. Откройте заказ заново.",
  );
  const next = {
    ...order,
    ...payload,
    stage: expected + 1,
    earnings: [...order.earnings],
    history: [
      ...order.history,
      {
        date: eventDate,
        text: [
          "Назначен замер",
          "Замер завершён",
          "Смета согласована",
          "Изготовление завершено",
          "Заказ сдан",
        ][expected],
      },
    ],
  };
  if (expected === 1)
    requireValue(
      next.measurement.width > 0 && next.measurement.height > 0,
      "Укажите размеры объекта.",
    );
  if (expected === 2)
    requireValue(
      next.lines.length && price(next.lines) > 0,
      "Добавьте позиции в смету.",
    );
  if (expected === 3 || expected === 4)
    requireValue(next.crew.length > 0, "Выберите бригаду.");
  const credit = (employee, job, amount) =>
    next.earnings.push({ employee, job, amount, date: eventDate });
  if (expected === 1) credit(next.measureBy, "measure", rates.measure);
  if (expected === 3) credit(next.maker, "fabrication", rates.fabrication);
  if (expected === 4) {
    const part = Math.floor(rates.install / next.crew.length);
    next.crew.forEach((id, i) =>
      credit(
        id,
        "install",
        part + (i < rates.install % next.crew.length ? 1 : 0),
      ),
    );
  }
  return next;
}
export function addPayment(order, amount) {
  requireValue(
    Number.isSafeInteger(amount) && amount > 0 && amount <= balance(order),
    "Сумма должна быть в пределах остатка по заказу.",
  );
  return {
    ...order,
    payments: [...order.payments, { amount, date: dateKey() }],
  };
}
export function payroll(db, employee) {
  const earned = db.orders.flatMap((o) =>
    o.earnings
      .filter((e) => e.employee === employee)
      .map((e) => ({ ...e, order: o.id, product: o.product })),
  );
  const payments = db.payouts.filter((p) => p.employee === employee);
  return { earned, payments, due: sum(earned) - sum(payments) };
}
export function payEmployee(db, employee, amount) {
  requireValue(
    Number.isSafeInteger(amount) &&
      amount > 0 &&
      amount <= payroll(db, employee).due,
    "Проверьте сумму выплаты.",
  );
  return {
    ...db,
    payouts: [...db.payouts, { employee, amount, date: dateKey() }],
  };
}
const seeds = [
  [1048, 0, 0, "Александр Власов", "ул. Полевая, 12", 2, 146000],
  [1047, 2, 1, "Марина Ершова", "СНТ Берёзка, уч. 18", 0, 96500],
  [1046, 3, 4, "Дмитрий Левин", "пос. Молодёжный, ул. Садовая, 7", 0, 184000],
  [1045, 0, 3, "Сергей Котов", "ул. Центральная, 24", -1, 158000],
  [1044, 1, 2, "Ольга Зорина", "ул. Вишнёвая, 5", 1, 92000],
  [1043, 4, 5, "Андрей Фролов", "мкр. Солнечный, 16", -1, 46000],
  [1042, 0, 4, "Ирина Лукина", "ДНТ Полянка, уч. 32", 1, 172000],
  [1041, 3, 3, "Михаил Титов", "ул. Лесная, 9", 2, 136000],
  [1040, 2, 1, "Николай Макаров", "ул. Луговая, 41", 1, 78000],
  [1039, 1, 5, "Татьяна Павлова", "ул. Озёрная, 11", -2, 114000],
];
// Days before the demo opens. Each finished job has an advance and a final payment.
const historicalJobs = [
  // id, product, client, address, days since request, days since handover, estimate, advance
  [1038, 0, "Роман Ветров", "ул. Дачная, 8", 11, 0, 164000, 80000],
  [1037, 2, "Анна Руднева", "ул. Ягодная, 21", 15, 6, 72000, 30000],
  [1036, 3, "Виктор Лапин", "пер. Южный, 3", 22, 10, 212000, 100000],
  [1035, 4, "Софья Волкова", "ул. Сосновая, 15", 24, 18, 43000, 18000],
  [1034, 1, "Леонид Маслов", "ул. Кедровая, 42", 30, 21, 98000, 48000],
  [1033, 0, "Наталья Крылова", "ДНТ Заря, уч. 56", 36, 25, 186000, 90000],
  [1032, 2, "Вадим Серов", "ул. Малиновая, 4", 40, 32, 112000, 50000],
  [1031, 3, "Алёна Демина", "пер. Речной, 7", 48, 37, 243000, 120000],
  [1030, 4, "Пётр Логинов", "ул. Сибирская, 16", 50, 43, 52500, 20000],
  [1029, 1, "Лидия Белова", "ул. Каштановая, 10", 58, 48, 131000, 65000],
  [1028, 0, "Евгений Громов", "ул. Ключевая, 2", 64, 54, 169000, 75000],
  [1027, 2, "Дарья Русакова", "СНТ Маяк, уч. 39", 69, 61, 94000, 40000],
  [1026, 3, "Игорь Нестеров", "ул. Нагорная, 12", 78, 66, 225000, 110000],
  [1025, 1, "Вероника Быкова", "ул. Тихая, 11", 82, 73, 104000, 45000],
  [1024, 2, "Максим Климов", "ул. Береговая, 26", 87, 80, 83500, 35000],
  [1023, 4, "Екатерина Сазонова", "ул. Липовая, 19", 89, 84, 47500, 22000],
];

function seedOrder(id, type, client, address, total, dates, due) {
  let order = newOrder({
    id,
    product: products[type],
    client,
    address,
    due,
    phone: "+7 (000) 555-" + String(id).slice(0, 2) + "-" + String(id).slice(2),
    brief: [
      "Обшивка профлистом, цвет графит.",
      "Две створки с подготовкой под автоматику.",
      "Ограждение вдоль границы участка.",
      "Навес для двух автомобилей.",
      "Калитка с замком и ручкой.",
    ][type],
  });
  order.history[0].date = dates[0];
  for (const date of dates.slice(1)) {
    const step = order.stage;
    const values = {};
    if (step === 1)
      values.measurement = {
        width: type === 4 ? 1100 : 4200,
        height: 2100,
        notes: "Подъезд к объекту свободный. Образец отделки согласован.",
        photos: ["./metal.webp"],
      };
    if (step === 2)
      values.lines = [
        { name: "Металл и комплектующие", qty: 1, rate: total - 36000 },
        { name: "Изготовление и монтаж", qty: 1, rate: 36000 },
      ];
    order = advance(order, step, values, date);
  }
  return order;
}

export function withHistoricalJobs(db) {
  if (db.historyVersion >= 1) return db;
  const ids = new Set(db.orders.map((order) => order.id));
  const orders = [];
  const payouts = [];
  for (const [
    id,
    type,
    client,
    address,
    start,
    finish,
    total,
    advanceAmount,
  ] of historicalJobs) {
    if (ids.has(id)) continue;
    const accepted = start === 89 ? start : start - 2;
    const dates = [
      start,
      start,
      Math.max(accepted, start - 1),
      accepted,
      finish + 1,
      finish,
    ].map((age) => dateKey(-age));
    const order = seedOrder(
      id,
      type,
      client,
      address,
      total,
      dates,
      dates.at(-1),
    );
    order.payments = [
      { date: dates[3], amount: advanceAmount },
      { date: order.due, amount: total - advanceAmount },
    ];
    orders.push(order);
    // Settle historical piecework at handover so only current jobs affect wages due.
    for (const { employee, amount } of order.earnings) {
      payouts.push({ employee, amount, date: order.due });
    }
  }
  return {
    ...db,
    historyVersion: 1,
    orders: [...db.orders, ...orders],
    payouts: [...payouts, ...db.payouts].sort((a, b) =>
      a.date.localeCompare(b.date),
    ),
  };
}

export function seed() {
  const orders = seeds.map(
    ([id, type, stage, client, address, delta, total]) => {
      const dates = [dateKey(delta - stage - 2)];
      for (let step = 0; step < stage; step++)
        dates.push(dateKey(Math.min(0, delta - stage + step)));
      const order = seedOrder(
        id,
        type,
        client,
        address,
        total,
        dates,
        dateKey(delta),
      );
      if (stage >= 3)
        order.payments.push({
          amount: stage === 5 && id === 1039 ? total : total / 2,
          date: dates[3],
        });
      return order;
    },
  );
  return withHistoricalJobs({
    orders,
    payouts: [
      { employee: "ivan", amount: 4000, date: dateKey(-1) },
      { employee: "pavel", amount: 12000, date: dateKey(-1) },
      { employee: "oleg", amount: 2000, date: dateKey(-1) },
      { employee: "ilya", amount: 2000, date: dateKey(-1) },
    ],
  });
}
