import React, { useState } from "react";
import { Button, Input, Select, Table, Segmented } from "antd";
import {
  AppstoreOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  CreditCardOutlined,
  FilterOutlined,
  PlusOutlined,
  SearchOutlined,
  RightOutlined,
} from "@ant-design/icons";
import {
  stages,
  owners,
  dateKey,
  balance,
  overdue,
  money,
  person,
} from "./model";
import { Heading, Stat, Due, Status, Person, OrderLink, Blank } from "./ui";

export default function Orders({ orders, open, create, navigate }) {
  const [scope, setScope] = useState("Все");
  const [stage, setStage] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [dueFilter, setDueFilter] = useState(null);
  const active = orders.filter((o) => o.stage < 5);
  const todayJobs = active.filter(
    (o) => [1, 4].includes(o.stage) && o.due === dateKey(),
  );
  const late = active.filter(overdue);
  const debts = orders.filter((o) => balance(o) > 0);
  const filtered = orders.filter(
    (o) =>
      (scope === "Все" ||
        (scope === "В работе" ? o.stage < 5 : o.stage === 5)) &&
      (stage == null || stage === o.stage) &&
      (dueFilter !== "late" || overdue(o)) &&
      [
        o.id,
        o.product,
        o.client,
        o.address,
        ...owners(o).map((id) => person(id).name),
      ]
        .join(" ")
        .toLocaleLowerCase("ru")
        .includes(search.trim().toLocaleLowerCase("ru")),
  );
  const changeScope = (v) => {
    setScope(v);
    setDueFilter(null);
    setPage(1);
  };
  const cols = [
    {
      title: "Заказ / клиент",
      key: "order",
      render: (_, o) => (
        <div className="order-cell">
          <OrderLink order={o} onOpen={open} />
          <small>
            № {o.id}
            <b>·</b>
            {o.client}
          </small>
        </div>
      ),
    },
    {
      title: "Этап",
      key: "stage",
      render: (_, o) => <Status stage={o.stage} />,
    },
    {
      title: "Ответственный",
      key: "owner",
      render: (_, o) => (
        <span className="owner-line">
          <Person id={owners(o)[0]} compact />
          {owners(o).length > 1 && (
            <span
              className="extra"
              title={owners(o)
                .slice(1)
                .map((id) => person(id).name)
                .join(", ")}
            >
              +{owners(o).length - 1}
            </span>
          )}
        </span>
      ),
    },
    { title: "Срок этапа", key: "due", render: (_, o) => <Due order={o} /> },
    {
      title: "К оплате",
      key: "debt",
      align: "right",
      render: (_, o) => (
        <span className={"amount " + (o.stage < 3 ? "muted" : "")}>
          {o.stage < 3 ? "—" : money(balance(o))}
        </span>
      ),
    },
    {
      title: "",
      key: "open",
      width: 32,
      render: () => <RightOutlined className="chev" />,
    },
  ];
  return (
    <>
      <Heading
        title="Заказы"
        info="От первого обращения до сдачи объекта"
        actions={
          <Button
            type="primary"
            size="large"
            icon={<PlusOutlined />}
            onClick={create}
          >
            Новая заявка
          </Button>
        }
      />
      <div className="stats">
        <Stat
          label="В работе"
          value={active.length}
          note="Незавершённые заказы"
          icon={<AppstoreOutlined />}
          onClick={() => {
            changeScope("В работе");
            setSearch("");
            setStage(null);
          }}
        />
        <Stat
          label="Выезды сегодня"
          value={todayJobs.length}
          note={
            "Замеры: " +
            todayJobs.filter((o) => o.stage === 1).length +
            " · монтажи: " +
            todayJobs.filter((o) => o.stage === 4).length
          }
          tone="blue"
          icon={<CalendarOutlined />}
          onClick={() => navigate("calendar")}
        />
        <Stat
          label="Просрочено"
          value={late.length}
          note="Срок этапа прошёл"
          tone="orange"
          icon={<ClockCircleOutlined />}
          onClick={() => {
            changeScope("В работе");
            setSearch("");
            setStage(null);
            setDueFilter("late");
          }}
        />
        <Stat
          label="К получению"
          value={money(debts.reduce((s, o) => s + balance(o), 0))}
          note="Остаток по согласованным сметам"
          tone="green"
          icon={<CreditCardOutlined />}
          onClick={() => navigate("payments")}
        />
      </div>
      <section className="panel register">
        <div className="panel-title">
          <h2>
            Реестр заказов <span className="count">{orders.length}</span>
          </h2>
          <Segmented
            aria-label="Состояние заказа"
            value={scope}
            options={["Все", "В работе", "Сданные"]}
            onChange={changeScope}
          />
        </div>
        <div className="filters">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Номер, клиент или изделие"
            aria-label="Поиск заказов"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <Select
            allowClear
            prefix={<FilterOutlined />}
            placeholder="Все этапы"
            aria-label="Фильтр по этапу"
            value={stage}
            onChange={(v) => {
              setStage(v);
              setPage(1);
            }}
            options={stages.map((s, i) => ({ value: i, label: s }))}
          />
          {dueFilter && (
            <Button onClick={() => setDueFilter(null)}>Просроченные ×</Button>
          )}
        </div>
        <Table
          className="orders-table"
          rowKey="id"
          columns={cols}
          dataSource={filtered}
          scroll={{ x: 810 }}
          onRow={(o) => ({ onClick: () => open(o.id), className: "click-row" })}
          pagination={{
            current: page,
            onChange: setPage,
            pageSize: 8,
            showSizeChanger: false,
            hideOnSinglePage: false,
            showTotal: (n, r) =>
              n ? r[0] + "–" + r[1] + " из " + n : "0 заказов",
          }}
          locale={{ emptyText: <Blank text="Подходящих заказов нет" /> }}
        />
      </section>
    </>
  );
}
