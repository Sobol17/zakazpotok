import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  App as AntApp,
  Avatar,
  Breadcrumb,
  Button,
  ConfigProvider,
  Drawer,
  Modal,
} from "antd";
import ru from "antd/locale/ru_RU";
import dayjs from "dayjs";
import "dayjs/locale/ru";
import {
  BarChartOutlined,
  CalendarOutlined,
  CreditCardOutlined,
  FolderOpenOutlined,
  MenuOutlined,
  ReloadOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { newOrder, person, seed, withHistoricalJobs } from "./model";
import { Mark } from "./visuals";
import Analytics from "./AnalyticsPage";
import Orders from "./Orders";
import OrderDetail from "./OrderDetail";
import { NewOrderForm } from "./OrderForms";
import { CalendarPage, Employees, Payments } from "./Workspace";
import "antd/dist/reset.css";
import "./style.css";

dayjs.locale("ru");
const key = "zakazpotok.crm.demo.v1";
const menu = [
  { id: "orders", label: "Заказы", icon: <FolderOpenOutlined /> },
  { id: "calendar", label: "Календарь", icon: <CalendarOutlined /> },
  { id: "payments", label: "Оплаты", icon: <CreditCardOutlined /> },
  { id: "employees", label: "Сотрудники", icon: <TeamOutlined /> },
  { id: "analytics", label: "Аналитика", icon: <BarChartOutlined /> },
];
const route = () => window.location.hash.slice(1).split("/").filter(Boolean);
const navigate = (path) => {
  window.location.hash = "/" + path;
};
function readDb() {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  const saved = JSON.parse(raw);
  const upgraded = withHistoricalJobs(saved);
  if (upgraded !== saved) {
    try {
      localStorage.setItem(key, JSON.stringify(upgraded));
    } catch {
      // Keep saved orders available if the additional demo data exceeds local storage.
    }
  }
  return upgraded;
}
function loadDb() {
  try {
    return readDb() || seed();
  } catch {
    return seed();
  }
}
function Workspace() {
  const { message } = AntApp.useApp();
  const [db, setDb] = useState(loadDb),
    [path, setPath] = useState(route),
    [mobile, setMobile] = useState(false),
    [resetting, setResetting] = useState(false),
    [creating, setCreating] = useState(false);
  useEffect(() => {
    function hash() {
      setPath(route());
      setMobile(false);
      setCreating(false);
      window.scrollTo(0, 0);
    }
    function sync(e) {
      if (e.key === key) setDb(loadDb());
    }
    window.addEventListener("hashchange", hash);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("hashchange", hash);
      window.removeEventListener("storage", sync);
    };
  }, []);
  const page = menu.find((m) => m.id === path[0]) || menu[0];
  const order =
    page.id === "orders" && db.orders.find((o) => String(o.id) === path[1]);
  const openOrder = (id) => navigate("orders/" + id);
  const openEmployee = (id) => navigate("employees" + (id ? "/" + id : ""));
  function mutate(fn, notice) {
    try {
      const next = fn(readDb() || db);
      localStorage.setItem(key, JSON.stringify(next));
      setDb(next);
      message.success(notice);
      return true;
    } catch (err) {
      message.error(
        err.name === "QuotaExceededError"
          ? "Память браузера заполнена. Уменьшите количество фотографий."
          : err.message || "Не удалось сохранить данные.",
      );
      return false;
    }
  }
  function update(id, fn, notice) {
    return mutate(
      (current) => ({
        ...current,
        orders: current.orders.map((o) => (o.id === id ? fn(o) : o)),
      }),
      notice,
    );
  }
  function create(v) {
    let id;
    const ok = mutate((current) => {
      id = Math.max(1000, ...current.orders.map((o) => o.id)) + 1;
      return {
        ...current,
        orders: [newOrder({ ...v, id }), ...current.orders],
      };
    }, "Заявка создана");
    if (ok) {
      setCreating(false);
      openOrder(id);
    }
  }
  const detailTitle = order
    ? "Заказ № " + order.id
    : page.id === "employees" && person(path[1])?.name;
  const crumbs = [
    { title: "Рабочее пространство" },
    { title: page.label, ...(detailTitle && { href: "#/" + page.id }) },
  ];
  if (detailTitle) crumbs.push({ title: detailTitle });
  const sidebar = (
    <>
      <div className="brand">
        <span>
          <Mark />
        </span>
        ЗаказПоток
      </div>
      <nav className="sidebar-nav" aria-label="Разделы CRM">
        {menu.map((m) => (
          <a
            href={"#/" + m.id}
            key={m.id}
            aria-current={page === m ? "page" : undefined}
            className={page === m ? "active" : ""}
            onClick={() => setMobile(false)}
          >
            {m.icon}
            <span>{m.label}</span>
            {m.id === "orders" && <small>{db.orders.length}</small>}
          </a>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="demo-indicator">
          <i />
          Демо-пространство
        </div>
        <button
          onClick={() => {
            setMobile(false);
            setResetting(true);
          }}
        >
          <ReloadOutlined /> Сбросить демо
        </button>
        <div className="profile">
          <Avatar className="profile-avatar">АС</Avatar>
          <div>
            <b>Анна Смирнова</b>
            <small>Руководитель</small>
          </div>
        </div>
      </div>
    </>
  );
  return (
    <div className="shell">
      <aside className="sidebar">{sidebar}</aside>
      <Drawer
        open={mobile}
        placement="left"
        width={232}
        onClose={() => setMobile(false)}
        closable={false}
        styles={{ body: { padding: 0 } }}
      >
        <aside className="mobile-sidebar">{sidebar}</aside>
      </Drawer>
      <div className="workspace">
        <main>
          <div className="page-path">
            <Button
              className="mobile-menu"
              type="text"
              aria-label="Открыть меню"
              icon={<MenuOutlined />}
              onClick={() => setMobile(true)}
            />
            <Breadcrumb aria-label="Путь страницы" items={crumbs} />
          </div>
          {page.id === "orders" &&
            (order ? (
              <OrderDetail
                key={order.id}
                order={order}
                update={update}
                openEmployee={openEmployee}
              />
            ) : (
              <Orders
                orders={db.orders}
                open={openOrder}
                create={() => setCreating(true)}
                navigate={navigate}
              />
            ))}
          {page.id === "calendar" && (
            <CalendarPage orders={db.orders} open={openOrder} />
          )}
          {page.id === "payments" && (
            <Payments orders={db.orders} open={openOrder} />
          )}
          {page.id === "analytics" && <Analytics orders={db.orders} />}
          {page.id === "employees" && (
            <Employees
              key={path[1] || "all"}
              db={db}
              selected={path[1]}
              openEmployee={openEmployee}
              openOrder={openOrder}
              mutate={mutate}
            />
          )}
        </main>
      </div>
      {creating && (
        <NewOrderForm close={() => setCreating(false)} save={create} />
      )}
      <Modal
        open={resetting}
        title="Восстановить демоданные?"
        okText="Сбросить демо"
        okButtonProps={{ danger: true }}
        onCancel={() => setResetting(false)}
        onOk={() => {
          if (mutate(() => seed(), "Демоданные восстановлены")) {
            setResetting(false);
            navigate("orders");
          }
        }}
      >
        <p>
          Созданные в этом браузере заявки, оплаты и выплаты будут заменены
          исходными примерами.
        </p>
      </Modal>
    </div>
  );
}
const theme = {
  token: {
    colorPrimary: "#674457",
    colorInfo: "#674457",
    colorLink: "#674457",
    colorText: "#28232a",
    colorTextSecondary: "#716a75",
    colorBorder: "#ddd9df",
    colorBgLayout: "#f7f6f8",
    borderRadius: 8,
    fontFamily:
      'Onest, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    controlHeight: 38,
    fontSize: 14,
  },
  components: {
    Button: { primaryShadow: "none", defaultShadow: "none", fontWeight: 600 },
    Table: {
      headerBg: "#f8f7f9",
      headerColor: "#746f79",
      headerSplitColor: "transparent",
      cellPaddingBlock: 13,
      borderColor: "#eeecf0",
    },
    Tabs: { inkBarColor: "#674457" },
    Segmented: { trackBg: "#f1eff3" },
  },
};
createRoot(document.getElementById("root")).render(
  <ConfigProvider locale={ru} theme={theme}>
    <AntApp>
      <Workspace />
    </AntApp>
  </ConfigProvider>,
);
