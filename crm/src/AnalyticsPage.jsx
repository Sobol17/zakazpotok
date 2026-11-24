import React, { useState } from "react";
import { Segmented } from "antd";
import {
  CheckCircleOutlined,
  CreditCardOutlined,
  FileAddOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { analytics } from "./analytics";
import { dateKey, money, shortDate, stages, sum } from "./model";
import { Heading, Stat } from "./ui";
import { WeeklyChart, PaymentShare } from "./MetricChart";
import "./analytics.css";

const periods = [
  { value: "month", label: "Этот месяц" },
  { value: "previous", label: "Прошлый месяц" },
  { value: "quarter", label: "90 дней" },
];

export default function Analytics({ orders }) {
  const [period, setPeriod] = useState("month");
  const data = analytics(orders, period, dateKey());
  const { start, end } = data.range;
  const periodLabel =
    start === end
      ? shortDate(start)
      : shortDate(start) + " — " + shortDate(end);
  const debt = sum(data.debt);
  const active = data.stageRows.reduce((n, rows) => n + rows.length, 0);
  const largestStage = Math.max(
    1,
    ...data.stageRows.map((rows) => rows.length),
  );
  return (
    <div className="analytics-page">
      <Heading
        title="Аналитика"
        info={periodLabel}
        actions={
          <Segmented
            aria-label="Период аналитики"
            value={period}
            onChange={setPeriod}
            options={periods}
          />
        }
      />
      <div className="stats">
        <Stat
          label="Новые заявки"
          value={data.created.length}
          icon={<FileAddOutlined />}
          tone="blue"
        />
        <Stat
          label="Сданные заказы"
          value={data.completed.length}
          icon={<CheckCircleOutlined />}
        />
        <Stat
          label="Получено от клиентов"
          value={money(sum(data.received))}
          icon={<CreditCardOutlined />}
          tone="green"
        />
        <Stat
          label="К получению сегодня"
          value={money(debt)}
          icon={<WalletOutlined />}
          tone="orange"
        />
      </div>
      <div className="analytics-charts">
        <WeeklyChart weeks={data.weeks} kind="orders" />
        <WeeklyChart weeks={data.weeks} kind="receipts" />
        <section className="panel analytics-chart">
          <div className="chart-head">
            <h2>Заказы по этапам</h2>
            <small>На сегодня</small>
          </div>
          <dl className="stage-list">
            {data.stageRows.map((rows, i) => (
              <div
                key={stages[i]}
                title={stages[i] + " · " + rows.length + " из " + active}
              >
                <dt>{stages[i]}</dt>
                <dd>
                  <span className="stage-track" aria-hidden="true">
                    <i
                      style={{
                        width: (100 * rows.length) / largestStage + "%",
                      }}
                    />
                  </span>
                  {rows.length}
                </dd>
              </div>
            ))}
          </dl>
        </section>
        <section className="panel analytics-chart">
          <div className="chart-head">
            <h2>Оплата смет</h2>
            <small>На сегодня</small>
          </div>
          <PaymentShare debt={debt} agreed={data.agreedTotal} />
        </section>
      </div>
    </div>
  );
}
