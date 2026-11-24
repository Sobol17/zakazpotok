import React, { useState } from "react";
import { Button, DatePicker, List, Select, Table, Tabs } from "antd";
import {
  CheckCircleOutlined,
  CreditCardOutlined,
  LeftOutlined,
  RightOutlined,
  WalletOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import {
  balance,
  jobs,
  money,
  owners,
  payroll,
  payEmployee,
  people,
  price,
  rates,
  shortDate,
  sum,
} from "./model";
import { Blank, Heading, OrderLink, Person, Stat, Status } from "./ui";
import { MoneyForm } from "./OrderForms";

export function CalendarPage({ orders, open }) {
  const [selected, setSelected] = useState(dayjs());
  const [mode, setMode] = useState("all");
  const day = selected.format("YYYY-MM-DD");
  const start = selected.subtract((selected.day() + 6) % 7, "day");
  const scheduled = orders.filter(
    (o) => o.stage < 5 && (mode === "all" || o.stage === mode),
  );
  const agenda = scheduled.filter((o) => o.due === day);
  return (
    <>
      <Heading title="Календарь" info="Сроки заказов, замеры и выезды бригад" />
      <section className="panel inner">
        <div className="calendar-head">
          <div className="calendar-switch">
            <Button
              aria-label="Предыдущая неделя"
              icon={<LeftOutlined />}
              onClick={() => setSelected(selected.subtract(7, "day"))}
            />
            <h2>
              {shortDate(start.format("YYYY-MM-DD"))} —{" "}
              {shortDate(start.add(6, "day").format("YYYY-MM-DD"), {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </h2>
            <Button
              aria-label="Следующая неделя"
              icon={<RightOutlined />}
              onClick={() => setSelected(selected.add(7, "day"))}
            />
          </div>
          <div className="flex-wrap">
            <Button onClick={() => setSelected(dayjs())}>Сегодня</Button>
            <DatePicker
              aria-label="Выбрать дату"
              value={selected}
              format="DD.MM.YYYY"
              allowClear={false}
              onChange={setSelected}
            />
          </div>
        </div>
        <div className="week">
          {Array.from({ length: 7 }, (_, i) => {
            const d = start.add(i, "day").format("YYYY-MM-DD"),
              n = scheduled.filter((o) => o.due === d).length;
            return (
              <button
                key={d}
                aria-pressed={d === day}
                className={d === day ? "selected" : ""}
                onClick={() => setSelected(dayjs(d))}
              >
                <small>{shortDate(d, { weekday: "short" })}</small>
                <strong>{Number(d.slice(-2))}</strong>
                <span>{n ? n + " зап." : "—"}</span>
              </button>
            );
          })}
        </div>
        <div className="panel-title inset">
          <h2 className="capitalize">
            {shortDate(day, { weekday: "long", day: "numeric", month: "long" })}
          </h2>
          <Select
            value={mode}
            aria-label="Тип работ"
            onChange={setMode}
            options={[
              { value: "all", label: "Все работы" },
              { value: 1, label: "Замеры" },
              { value: 4, label: "Монтажи" },
            ]}
          />
        </div>
        {agenda.length ? (
          <List
            dataSource={agenda}
            renderItem={(o) => (
              <List.Item>
                <div className="agenda-item">
                  <Status stage={o.stage} />
                  <div>
                    <OrderLink order={o} onOpen={open} />
                    <small className="block muted">
                      № {o.id} · {o.address}
                    </small>
                  </div>
                  <div className="flex-wrap">
                    {owners(o).map((id) => (
                      <Person key={id} id={id} />
                    ))}
                  </div>
                </div>
              </List.Item>
            )}
          />
        ) : (
          <Blank text="На этот день работ нет" />
        )}
      </section>
    </>
  );
}

export function Payments({ orders, open }) {
  const [tab, setTab] = useState("debts");
  const approved = orders.filter((o) => o.stage >= 3);
  const ledger = approved
    .flatMap((o) =>
      o.payments.map((p, i) => ({ ...p, order: o, id: o.id + "-" + i })),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  return (
    <>
      <Heading
        title="Оплаты"
        info="Поступления от клиентов и остатки по заказам"
      />
      <div className="stats three">
        <Stat
          icon={<WalletOutlined />}
          label="К получению"
          value={money(approved.reduce((s, o) => s + balance(o), 0))}
          note="По согласованным сметам"
        />
        <Stat
          icon={<CreditCardOutlined />}
          label="Получено"
          value={money(sum(ledger))}
          note="Все оплаты клиентов"
          tone="green"
        />
        <Stat
          icon={<CheckCircleOutlined />}
          label="Согласовано"
          value={money(approved.reduce((s, o) => s + price(o.lines), 0))}
          note="Общая стоимость заказов"
          tone="blue"
        />
      </div>
      <section className="panel inner">
        <Tabs
          activeKey={tab}
          onChange={setTab}
          items={[
            { key: "debts", label: "Ожидают оплаты" },
            { key: "ledger", label: "Поступления" },
          ]}
        />
        {tab === "debts" ? (
          <Table
            rowKey="id"
            dataSource={approved.filter((o) => balance(o) > 0)}
            pagination={false}
            scroll={{ x: 620 }}
            locale={{ emptyText: <Blank text="Все заказы оплачены" /> }}
            columns={[
              {
                title: "Заказ",
                render: (_, o) => (
                  <>
                    <OrderLink order={o} onOpen={open} />
                    <small className="block muted">
                      № {o.id} · {o.client}
                    </small>
                  </>
                ),
              },
              {
                title: "Согласовано",
                align: "right",
                render: (_, o) => money(price(o.lines)),
              },
              {
                title: "Получено",
                align: "right",
                render: (_, o) => money(sum(o.payments)),
              },
              {
                title: "Остаток",
                align: "right",
                render: (_, o) => <b>{money(balance(o))}</b>,
              },
            ]}
          />
        ) : (
          <Table
            rowKey="id"
            dataSource={ledger}
            pagination={false}
            scroll={{ x: 480 }}
            columns={[
              { title: "Дата", dataIndex: "date", render: (d) => shortDate(d) },
              {
                title: "Заказ",
                render: (_, p) => <OrderLink order={p.order} onOpen={open} />,
              },
              { title: "Клиент", render: (_, p) => p.order.client },
              {
                title: "Получено",
                align: "right",
                dataIndex: "amount",
                render: money,
              },
            ]}
          />
        )}
      </section>
    </>
  );
}

export function Employees({ db, selected, openEmployee, openOrder, mutate }) {
  const [pay, setPay] = useState(false);
  const list = people.map((p) => ({ ...p, ...payroll(db, p.id) }));
  const employee = list.find((p) => p.id === selected);
  if (employee) {
    const p = employee;
    return (
      <>
        <Heading
          title={p.name}
          info={p.role}
          actions={
            p.due > 0 && (
              <Button
                size="large"
                type="primary"
                icon={<WalletOutlined />}
                onClick={() => setPay(true)}
              >
                Записать выплату
              </Button>
            )
          }
        />
        <div className="stats three">
          <Stat
            icon={<CreditCardOutlined />}
            label="Начислено"
            value={money(sum(p.earned))}
            note="За выполненные работы"
          />
          <Stat
            icon={<CheckCircleOutlined />}
            label="Выплачено"
            value={money(sum(p.payments))}
            note="Все выплаты"
            tone="green"
          />
          <Stat
            icon={<WalletOutlined />}
            label="К выплате"
            value={money(p.due)}
            note="Текущий остаток"
            tone="orange"
          />
        </div>
        <section className="panel inner">
          <Tabs
            items={[
              {
                key: "earned",
                label: "Начисления",
                children: (
                  <Table
                    rowKey={(e) => e.order + "-" + e.job}
                    dataSource={[...p.earned].sort((a, b) =>
                      b.date.localeCompare(a.date),
                    )}
                    pagination={false}
                    scroll={{ x: 480 }}
                    locale={{ emptyText: <Blank text="Начислений пока нет" /> }}
                    columns={[
                      {
                        title: "Дата",
                        dataIndex: "date",
                        render: (d) => shortDate(d),
                      },
                      {
                        title: "Работа",
                        dataIndex: "job",
                        render: (j) => jobs[j],
                      },
                      {
                        title: "Заказ",
                        render: (_, e) => (
                          <Button
                            className="order-link"
                            type="link"
                            onClick={() => openOrder(e.order)}
                          >
                            № {e.order} · {e.product}
                          </Button>
                        ),
                      },
                      {
                        title: "Начислено",
                        dataIndex: "amount",
                        align: "right",
                        render: money,
                      },
                    ]}
                  />
                ),
              },
              {
                key: "paid",
                label: "Выплаты",
                children: (
                  <List
                    dataSource={[...p.payments].reverse()}
                    locale={{ emptyText: <Blank text="Выплат пока нет" /> }}
                    renderItem={(v) => (
                      <List.Item>
                        <span>{shortDate(v.date)}</span>
                        <b>{money(v.amount)}</b>
                      </List.Item>
                    )}
                  />
                ),
              },
            ]}
          />
        </section>
        {pay && (
          <MoneyForm
            title="Записать выплату"
            context={p.name}
            limit={p.due}
            close={() => setPay(false)}
            save={(v) => {
              if (mutate((d) => payEmployee(d, p.id, v), "Выплата записана"))
                setPay(false);
            }}
          />
        )}
      </>
    );
  }
  return (
    <>
      <Heading
        title="Сотрудники"
        info="Команда, сдельные начисления и выплаты"
      />
      <div className="stats three">
        <Stat
          icon={<TeamOutlined />}
          label="В команде"
          value={list.length}
          note="Менеджер и исполнители"
        />
        <Stat
          icon={<CreditCardOutlined />}
          label="Начислено"
          value={money(list.reduce((s, p) => s + sum(p.earned), 0))}
          note="За выполненные работы"
          tone="blue"
        />
        <Stat
          icon={<WalletOutlined />}
          label="К выплате"
          value={money(list.reduce((s, p) => s + p.due, 0))}
          note="Остаток по всей команде"
          tone="green"
        />
      </div>
      <section className="panel inner">
        <h2>Команда</h2>
        <Table
          rowKey="id"
          pagination={false}
          scroll={{ x: 650 }}
          dataSource={list}
          columns={[
            {
              title: "Сотрудник",
              render: (_, p) => (
                <button
                  className="plain-link"
                  onClick={() => openEmployee(p.id)}
                >
                  <Person id={p.id} />
                </button>
              ),
            },
            { title: "Роль", dataIndex: "role" },
            {
              title: "Начислено",
              align: "right",
              render: (_, p) => money(sum(p.earned)),
            },
            {
              title: "Выплачено",
              align: "right",
              render: (_, p) => money(sum(p.payments)),
            },
            {
              title: "К выплате",
              align: "right",
              render: (_, p) => <b>{money(p.due)}</b>,
            },
          ]}
        />
      </section>
      <section className="panel inner rates">
        <h2>Сдельные ставки</h2>
        <div>
          {Object.entries(rates).map(([k, v]) => (
            <div key={k}>
              <span>{jobs[k]}</span>
              <b>{money(v)}</b>
              <small>{k === "install" ? "на бригаду" : "за заказ"}</small>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
