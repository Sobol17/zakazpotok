import React, { useState } from "react";
import {
  App,
  Button,
  Descriptions,
  Image,
  Steps,
  Table,
  Tabs,
  Timeline,
} from "antd";
import {
  FileExcelOutlined,
  ArrowRightOutlined,
  CreditCardOutlined,
  EnvironmentOutlined,
} from "@ant-design/icons";
import {
  actions,
  advance,
  addPayment,
  balance,
  money,
  owners,
  person,
  price,
  shortDate,
  stages,
  sum,
  jobs,
} from "./model";
import { Blank, Due } from "./ui";
import { StepForm, MoneyForm, EstimateForm } from "./OrderForms";
export default function OrderDetail({ order: o, update, openEmployee }) {
  const [modal, setModal] = useState(null);
  const [tab, setTab] = useState("overview");
  function save(transform, notice) {
    if (update(o.id, transform, notice)) setModal(null);
  }
  const earned = sum(o.earnings);
  const { message } = App.useApp();
  const [exporting, setExporting] = useState(false);
  async function downloadEstimate() {
    setExporting(true);
    try {
      const { downloadWorkbook } = await import("./estimateExport.js");
      await downloadWorkbook(o);
    } catch {
      message.error("Не удалось выгрузить смету. Попробуйте ещё раз.");
    } finally {
      setExporting(false);
    }
  }
  return (
    <>
      <div className="heading">
        <div>
          <h1>{o.product}</h1>
          <p>
            <EnvironmentOutlined /> {o.address}
          </p>
        </div>
        {o.stage < 5 && (
          <Button size="large" type="primary" onClick={() => setModal("step")}>
            {actions[o.stage]} <ArrowRightOutlined />
          </Button>
        )}
      </div>
      <div className="panel progress-panel">
        <Steps
          responsive={false}
          size="small"
          current={o.stage}
          status={o.stage === 5 ? "finish" : "process"}
          items={stages.map((title) => ({ title }))}
        />
      </div>
      <div className="detail-grid">
        <section className="panel detail-body">
          <Tabs
            activeKey={tab}
            onChange={setTab}
            items={[
              {
                key: "overview",
                label: "Карточка",
                children: (
                  <>
                    <h2>Данные заказа</h2>
                    <Descriptions
                      column={1}
                      colon={false}
                      items={[
                        { key: "client", label: "Клиент", children: o.client },
                        {
                          key: "phone",
                          label: "Телефон",
                          children: o.phone || "—",
                        },
                        {
                          key: "brief",
                          label: "Требования",
                          children: o.brief || "—",
                        },
                        {
                          key: "due",
                          label: o.stage === 5 ? "Дата сдачи" : "Срок этапа",
                          children: <Due order={o} />,
                        },
                        {
                          key: "owners",
                          label: "Ответственный",
                          children: owners(o)
                            .map((id) => person(id)?.name)
                            .filter(Boolean)
                            .join(", "),
                        },
                      ]}
                    />
                    <div className="subsection">
                      <h2>Замер объекта</h2>
                      {o.measurement.width ? (
                        <>
                          <p>
                            <strong>
                              {o.measurement.width} × {o.measurement.height} мм
                            </strong>
                          </p>
                          <p>{o.measurement.notes}</p>
                          <div className="photo-strip">
                            {o.measurement.photos.map((src, i) => (
                              <Image
                                key={i}
                                width={110}
                                height={72}
                                src={src}
                                alt={"Фото объекта " + (i + 1)}
                              />
                            ))}
                          </div>
                        </>
                      ) : (
                        <p className="muted">
                          Размеры и фотографии появятся после замера.
                        </p>
                      )}
                    </div>
                  </>
                ),
              },
              {
                key: "estimate",
                label: "Смета",
                children: (
                  <>
                    <h2>Материалы и работы</h2>
                    <div className="estimate-actions">
                      {o.stage < 3 && (
                        <Button
                          type="primary"
                          onClick={() => setModal("estimate")}
                        >
                          {o.lines.length
                            ? "Редактировать смету"
                            : "Заполнить смету"}
                        </Button>
                      )}
                      <Button
                        icon={<FileExcelOutlined />}
                        loading={exporting}
                        disabled={!o.lines.length}
                        onClick={downloadEstimate}
                      >
                        Выгрузить в Excel
                      </Button>
                    </div>
                    {o.lines.length ? (
                      <>
                        <Table
                          rowKey={(_, i) => i}
                          pagination={false}
                          dataSource={o.lines}
                          columns={[
                            { title: "Позиция", dataIndex: "name" },
                            { title: "Кол-во", dataIndex: "qty" },
                            { title: "Цена", dataIndex: "rate", render: money },
                            {
                              title: "Сумма",
                              align: "right",
                              render: (_, r) => money(r.qty * r.rate),
                            },
                          ]}
                          scroll={{ x: 400 }}
                        />
                        <div className="total-line">
                          {o.stage < 3 ? "Итого по черновику" : "Согласовано"}
                          <strong>{money(price(o.lines))}</strong>
                        </div>
                      </>
                    ) : (
                      <Blank text="В смете пока нет материалов и работ" />
                    )}
                  </>
                ),
              },
              {
                key: "timeline",
                label: "История",
                children: (
                  <>
                    <h2>История заказа</h2>
                    <Timeline
                      items={o.history
                        .map((r, i) => ({
                          key: i,
                          children: (
                            <>
                              <strong>{r.text}</strong>
                              <small className="block muted">
                                {shortDate(r.date)}
                              </small>
                            </>
                          ),
                        }))
                        .reverse()}
                    />
                  </>
                ),
              },
            ]}
          />
        </section>
        <aside className="detail-aside">
          <section className="panel inner">
            <h2>Оплата заказа</h2>
            <div className="info-line">
              <span>Согласовано</span>
              <b>{o.stage < 3 ? "—" : money(price(o.lines))}</b>
            </div>
            <div className="info-line">
              <span>Получено</span>
              <b>{money(sum(o.payments))}</b>
            </div>
            <div className="total-line">
              <span>К получению</span>
              <strong>{o.stage < 3 ? "—" : money(balance(o))}</strong>
            </div>
            {balance(o) > 0 && (
              <Button
                block
                icon={<CreditCardOutlined />}
                onClick={() => setModal("payment")}
              >
                Принять оплату
              </Button>
            )}
            {o.payments.map((p, i) => (
              <div className="info-line small" key={i}>
                <span>{shortDate(p.date)} · Оплата</span>
                <b>{money(p.amount)}</b>
              </div>
            ))}
          </section>
          {earned > 0 && (
            <section className="panel inner">
              <h2>Выплаты работникам</h2>
              {o.earnings.map((e) => (
                <div className="earning-line" key={e.job + e.employee}>
                  <button
                    className="plain-link"
                    title={person(e.employee).name}
                    onClick={() => openEmployee(e.employee)}
                  >
                    {person(e.employee).name}
                  </button>
                  <small>{jobs[e.job]}</small>
                  <b>{money(e.amount)}</b>
                </div>
              ))}
              <div className="total-line">
                Начислено<strong>{money(earned)}</strong>
              </div>
            </section>
          )}
        </aside>
      </div>
      {modal === "estimate" && o.stage < 3 && (
        <EstimateForm
          order={o}
          close={() => setModal(null)}
          save={(lines) =>
            save((current) => {
              if (current.stage >= 3) throw new Error("Смета уже согласована.");
              return { ...current, lines };
            }, "Черновик сметы сохранён")
          }
        />
      )}
      {modal === "step" && o.stage < 5 && (
        <StepForm
          order={o}
          close={() => setModal(null)}
          save={(p) =>
            save((current) => advance(current, o.stage, p), "Этап обновлён")
          }
        />
      )}
      {modal === "payment" && (
        <MoneyForm
          title="Принять оплату"
          context={"Заказ № " + o.id + " · " + o.client}
          limit={balance(o)}
          close={() => setModal(null)}
          save={(v) =>
            save((current) => addPayment(current, v), "Оплата записана")
          }
        />
      )}
    </>
  );
}
