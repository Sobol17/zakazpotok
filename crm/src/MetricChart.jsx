import React from "react";
import { money, shortDate } from "./model";

const compact = new Intl.NumberFormat("ru-RU", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const percent = new Intl.NumberFormat("ru-RU", {
  style: "percent",
  maximumFractionDigits: 1,
});

function chartCeiling(peak) {
  const half = Math.max(1, peak / 2);
  const unit = 10 ** Math.floor(Math.log10(half));
  return 2 * unit * [1, 2, 2.5, 5, 10].find((n) => n * unit >= half);
}

export function WeeklyChart({ weeks, kind }) {
  const receipts = kind === "receipts";
  const title = receipts ? "Поступления по неделям" : "Заказы по неделям";
  const peak = Math.max(
    ...weeks.map((w) =>
      receipts ? w.amount : Math.max(w.created, w.completed),
    ),
  );
  const ceiling = receipts
    ? chartCeiling(peak)
    : Math.max(2, 2 * Math.ceil(peak / 2));
  const height = 118,
    width = 500;
  const pointX = (i) => ((i + 0.5) * width) / weeks.length;
  const pointY = (w) => height - 4 - (w.amount / ceiling) * (height - 8);
  const coords = weeks.map((w, i) => pointX(i) + "," + pointY(w)).join(" ");
  return (
    <section className="panel analytics-chart">
      <div className="chart-head">
        <h2>{title}</h2>
      </div>
      {receipts ? (
        <div className="chart-key">
          <span>
            <i className="cash-color" />
            Оплаты клиентов
          </span>
        </div>
      ) : (
        <div className="chart-key">
          <span>
            <i className="new-color" />
            Новые
          </span>
          <span>
            <i className="done-color" />
            Сданные
          </span>
        </div>
      )}
      {peak === 0 ? (
        <div className="chart-empty">
          {receipts
            ? "За этот период поступлений нет"
            : "За этот период заявок и сдач нет"}
        </div>
      ) : (
        <div className="weekly-chart">
          <div className="chart-axis" aria-hidden="true">
            {[ceiling, ceiling / 2, 0].map((tick) => (
              <span key={tick}>
                {receipts ? compact.format(tick) + " ₽" : tick}
              </span>
            ))}
          </div>
          <div className="chart-plot">
            <div className="chart-grid" aria-hidden="true">
              <i />
              <i />
              <i />
            </div>
            {receipts && (
              <svg
                className="receipts-line"
                viewBox={"0 0 " + width + " " + height}
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <polygon
                  points={
                    pointX(0) +
                    "," +
                    (height - 4) +
                    " " +
                    coords +
                    " " +
                    pointX(weeks.length - 1) +
                    "," +
                    (height - 4)
                  }
                  fill="#e8f1ec"
                />
                <polyline
                  points={coords}
                  fill="none"
                  stroke="#52826d"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />
                {weeks.map((w, i) => (
                  <circle
                    key={w.start}
                    cx={pointX(i)}
                    cy={pointY(w)}
                    r="2.8"
                    fill="#52826d"
                  />
                ))}
              </svg>
            )}
            <div className="chart-slots">
              {weeks.map((w) => {
                const dates =
                  shortDate(w.start) +
                  (w.start === w.end ? "" : " — " + shortDate(w.end));
                const detail = receipts
                  ? money(w.amount)
                  : "Новые: " + w.created + " · сданные: " + w.completed;
                return (
                  <React.Fragment key={w.start}>
                    <span
                      className="week-slot"
                      tabIndex={0}
                      role="img"
                      aria-label={dates + " · " + detail}
                    >
                      {!receipts && (
                        <span className="paired-bars" aria-hidden="true">
                          <i
                            className="new-color"
                            style={{
                              height: (w.created / ceiling) * 100 + "%",
                            }}
                          />
                          <i
                            className="done-color"
                            style={{
                              height: (w.completed / ceiling) * 100 + "%",
                            }}
                          />
                        </span>
                      )}
                    </span>
                    <span role="tooltip" className="week-hint">{dates} · {detail}</span>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
          <div className="chart-dates">
            <span>{shortDate(weeks[0].start)}</span>
            {weeks.length > 3 && (
              <span>
                {shortDate(weeks[Math.floor(weeks.length / 2)].start)}
              </span>
            )}
            {weeks.at(-1).end !== weeks[0].start && (
              <span>{shortDate(weeks.at(-1).end)}</span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export function PaymentShare({ debt, agreed }) {
  if (!agreed)
    return <p className="chart-empty">Согласованных смет пока нет</p>;
  const paid = agreed - debt;
  return (
    <div className="payments-summary">
      <div className="share-track" aria-hidden="true">
        <i style={{ width: (100 * paid) / agreed + "%" }} />
      </div>
      <dl className="payment-values">
        {[
          ["Оплачено", paid],
          ["К получению", debt],
        ].map(([label, value]) => (
          <div key={label}>
            <dt>
              <i />
              {label}
            </dt>
            <dd>
              <b>{money(value)}</b>
              <small>{percent.format(value / agreed)}</small>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
