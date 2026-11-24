import React from "react";
import { Avatar, Button, Empty } from "antd";
import { ArrowUpOutlined } from "@ant-design/icons";
import { person, stages, dateKey, shortDate, overdue } from "./model";

export function Person({ id, compact = false }) {
  const p = person(id);
  if (!p) return null;
  const [first, last] = p.name.split(" ");
  return (
    <span className="person">
      <Avatar size={26} className={"avatar " + p.color}>
        {first[0]}
        {last[0]}
      </Avatar>
      {compact ? first + " " + last[0] + "." : p.name}
    </span>
  );
}
export function Status({ stage }) {
  return (
    <span className={"status s" + stage}>
      <i />
      {stages[stage]}
    </span>
  );
}
export function Due({ order }) {
  const d = order.due;
  const label =
    d === dateKey() ? "Сегодня" : d === dateKey(1) ? "Завтра" : shortDate(d);
  return (
    <span
      className={
        overdue(order)
          ? "late"
          : d === dateKey() && order.stage < 5
            ? "today"
            : ""
      }
    >
      {overdue(order) && <i className="late-dot" />}
      {label}
    </span>
  );
}
export function Stat({
  label,
  value,
  note,
  icon,
  tone = "plum",
  selected,
  onClick,
}) {
  const Box = onClick ? "button" : "div";
  return (
    <Box className={"stat " + tone} aria-pressed={selected} onClick={onClick}>
      <div className="stat-top">
        <span className="stat-icon">{icon}</span>
        <span>{label}</span>
        {onClick && <ArrowUpOutlined rotate={45} className="stat-link" />}
      </div>
      <strong>{value}</strong>
      {note && <small>{note}</small>}
    </Box>
  );
}
export function Blank({ text }) {
  return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={text} />;
}
export function Heading({ title, info, actions }) {
  return (
    <div className="heading">
      <div>
        <h1>{title}</h1>
        {info && <p>{info}</p>}
      </div>
      {actions}
    </div>
  );
}
export function OrderLink({ order, onOpen }) {
  return (
    <Button
      type="link"
      className="order-link"
      onClick={(e) => {
        e.stopPropagation();
        onOpen(order.id);
      }}
    >
      {order.product}
    </Button>
  );
}
