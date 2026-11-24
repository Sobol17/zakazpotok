import React, { useState } from "react";
import {
  App,
  Button,
  DatePicker,
  Form,
  Image,
  Input,
  InputNumber,
  Modal,
  Select,
  Upload,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  CameraOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import {
  actions,
  dateKey,
  people,
  products,
  price,
  money,
  rates,
} from "./model";
const required = [{ required: true, message: "Заполните поле" }];
const requiredText = [
  { required: true, whitespace: true, message: "Заполните поле" },
];
const numProps = {
  min: 1,
  precision: 0,
  max: 99999999,
  style: { width: "100%" },
};
const employeeOptions = (role) =>
  people
    .filter((p) => p.role === role)
    .map((p) => ({ value: p.id, label: p.name }));
function DateField({ label = "Срок следующего этапа" }) {
  return (
    <Form.Item name="due" label={label} rules={required}>
      <DatePicker
        allowClear={false}
        format="DD.MM.YYYY"
        style={{ width: "100%" }}
      />
    </Form.Item>
  );
}
export function NewOrderForm({ close, save }) {
  const [form] = Form.useForm();
  return (
    <Modal
      open
      title="Новая заявка"
      okText="Создать заявку"
      onCancel={close}
      onOk={() => form.submit()}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ product: products[0], due: dayjs() }}
        onFinish={(v) => save({ ...v, due: v.due.format("YYYY-MM-DD") })}
      >
        <Form.Item name="product" label="Изделие" rules={required}>
          <Select options={products.map((value) => ({ value }))} />
        </Form.Item>
        <div className="form-grid">
          <Form.Item label="Клиент" name="client" rules={requiredText}>
            <Input autoFocus maxLength={80} placeholder="Имя и фамилия" />
          </Form.Item>
          <Form.Item label="Телефон" name="phone">
            <Input type="tel" maxLength={30} placeholder="+7" />
          </Form.Item>
        </div>
        <Form.Item label="Адрес объекта" name="address" rules={requiredText}>
          <Input maxLength={160} placeholder="Посёлок, улица, дом" />
        </Form.Item>
        <Form.Item label="Требования к изделию" name="brief">
          <Input.TextArea
            maxLength={700}
            rows={2}
            placeholder="Размер, материал, пожелания клиента"
          />
        </Form.Item>
        <DateField label="Связаться с клиентом до" />
      </Form>
    </Modal>
  );
}
async function thumbnail(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = new window.Image();
    img.src = url;
    await img.decode();
    const ratio = Math.min(1, 800 / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.width * ratio));
    canvas.height = Math.max(1, Math.round(img.height * ratio));
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.72);
  } finally {
    URL.revokeObjectURL(url);
  }
}
const sampleLines = [{ name: "", qty: 1, rate: null }];
function EstimateFields({ form }) {
  const lines = Form.useWatch("lines", form) || [];
  return (
    <>
      {" "}
      <Form.List
        name="lines"
        rules={[
          {
            validator: (_, v) =>
              v?.length
                ? Promise.resolve()
                : Promise.reject(new Error("Добавьте хотя бы одну позицию")),
          },
        ]}
      >
        {(fields, { add, remove }, { errors }) => (
          <div className="estimate-lines">
            {fields.map((field, i) => (
              <div className="estimate-row" key={field.key}>
                <Form.Item
                  name={[field.name, "name"]}
                  rules={requiredText}
                  label="Материал или работа"
                >
                  <Input maxLength={100} placeholder="Например, профлист" />
                </Form.Item>
                <Form.Item
                  name={[field.name, "qty"]}
                  rules={required}
                  label="Кол-во"
                >
                  <InputNumber {...numProps} max={9999} />
                </Form.Item>
                <Form.Item
                  name={[field.name, "rate"]}
                  rules={required}
                  label="Цена, ₽"
                >
                  <InputNumber {...numProps} />
                </Form.Item>
                <Button
                  aria-label={"Удалить позицию " + (i + 1)}
                  icon={<DeleteOutlined />}
                  onClick={() => remove(field.name)}
                />
              </div>
            ))}
            <Button
              icon={<PlusOutlined />}
              onClick={() => add({ name: "", qty: 1, rate: null })}
            >
              Позиция
            </Button>
            <Form.ErrorList errors={errors} />
          </div>
        )}
      </Form.List>
      <div className="total-line">
        <span>Итого по смете</span>
        <strong>{money(price(lines.filter(Boolean)))}</strong>
      </div>
    </>
  );
}
export function EstimateForm({ order, close, save }) {
  const [form] = Form.useForm();
  return (
    <Modal
      open
      width={680}
      title="Смета заказа"
      okText="Сохранить черновик"
      onCancel={close}
      onOk={() => form.submit()}
    >
      <Form
        layout="vertical"
        form={form}
        initialValues={{
          lines: order.lines.length ? order.lines : sampleLines,
        }}
        onFinish={(values) =>
          save(
            values.lines.map((line) => ({ ...line, name: line.name.trim() })),
          )
        }
      >
        <EstimateFields form={form} />
      </Form>
    </Modal>
  );
}
export function StepForm({ order, close, save }) {
  const s = order.stage;
  const [form] = Form.useForm();
  const [photos, setPhotos] = useState(order.measurement.photos);
  const [loading, setLoading] = useState(false);
  const { message } = App.useApp();
  async function loadPhoto(file) {
    setLoading(true);
    try {
      const src = await thumbnail(file);
      setPhotos((v) => [...v, src].slice(0, 3));
    } catch {
      message.error(
        "Не удалось открыть изображение. Выберите файл JPEG, PNG или WebP.",
      );
    } finally {
      setLoading(false);
    }
    return Upload.LIST_IGNORE;
  }
  const finish = (v) => {
    const payload = {};
    if (s < 4) payload.due = v.due.format("YYYY-MM-DD");
    else payload.due = dateKey();
    if (s === 0) payload.measureBy = v.measureBy;
    if (s === 1)
      payload.measurement = {
        width: v.width,
        height: v.height,
        notes: v.notes || "",
        photos,
      };
    if (s === 2) {
      payload.lines = v.lines.map((row) => ({ ...row, name: row.name.trim() }));
      payload.maker = v.maker;
    }
    if (s === 3) payload.crew = v.crew;
    save(payload);
  };
  return (
    <Modal
      open
      width={s === 2 ? 680 : 520}
      title={actions[s]}
      onCancel={close}
      onOk={() => form.submit()}
      okText={s === 4 ? "Подтвердить сдачу" : "Сохранить"}
      okButtonProps={{ disabled: loading }}
    >
      <p className="modal-context">
        Заказ № {order.id} · {order.product}
      </p>
      <Form
        layout="vertical"
        form={form}
        onFinish={finish}
        initialValues={{
          due: dayjs().add(1, "day"),
          measureBy: order.measureBy,
          maker: order.maker,
          crew: order.crew,
          ...order.measurement,
          lines: order.lines.length ? order.lines : sampleLines,
        }}
      >
        {s === 0 && (
          <Form.Item name="measureBy" label="Замерщик" rules={required}>
            <Select options={employeeOptions("Замерщик")} />
          </Form.Item>
        )}
        {s === 1 && (
          <>
            <div className="form-grid">
              {[
                ["width", "Ширина, мм"],
                ["height", "Высота, мм"],
              ].map(([name, label]) => (
                <Form.Item
                  key={name}
                  name={name}
                  label={label}
                  rules={required}
                >
                  <InputNumber {...numProps} />
                </Form.Item>
              ))}
            </div>
            <Form.Item name="notes" label="Особенности объекта">
              <Input.TextArea rows={2} maxLength={700} />
            </Form.Item>
            <Form.Item label="Фотографии объекта">
              <div className="photo-strip">
                {photos.map((src, i) => (
                  <div key={i}>
                    <Image
                      width={74}
                      height={54}
                      src={src}
                      alt="Фотография объекта"
                    />
                    <Button
                      aria-label="Удалить фото"
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() =>
                        setPhotos(photos.filter((_, j) => i !== j))
                      }
                    />
                  </div>
                ))}
                {photos.length < 3 && (
                  <Upload
                    accept="image/jpeg,image/png,image/webp"
                    showUploadList={false}
                    beforeUpload={loadPhoto}
                    disabled={loading}
                  >
                    <Button icon={<CameraOutlined />} loading={loading}>
                      Добавить фото
                    </Button>
                  </Upload>
                )}
              </div>
            </Form.Item>
          </>
        )}
        {s === 2 && (
          <>
            <EstimateFields form={form} />
            <Form.Item
              name="maker"
              label="Ответственный за изготовление"
              rules={required}
            >
              <Select options={employeeOptions("Мастер цеха")} />
            </Form.Item>
          </>
        )}
        {s === 3 && (
          <Form.Item name="crew" label="Монтажная бригада" rules={required}>
            <Select mode="multiple" options={employeeOptions("Монтажник")} />
          </Form.Item>
        )}
        {s < 4 && (
          <DateField
            label={
              [
                "Дата замера",
                "Согласовать смету до",
                "Изготовить до",
                "Дата монтажа",
              ][s]
            }
          />
        )}
        {[1, 3, 4].includes(s) && (
          <div className="form-note">
            {s === 1
              ? "Замерщику будет начислено " + money(rates.measure)
              : s === 3
                ? "Мастеру цеха будет начислено " + money(rates.fabrication)
                : "За монтаж будет начислено " +
                  money(rates.install) +
                  " на бригаду. Сумма делится поровну между исполнителями."}
          </div>
        )}
      </Form>
    </Modal>
  );
}
export function MoneyForm({ title, limit, context, close, save }) {
  const [form] = Form.useForm();
  return (
    <Modal
      open
      title={title}
      onOk={() => form.submit()}
      okText="Подтвердить"
      onCancel={close}
    >
      <p className="modal-context">{context}</p>
      <Form
        layout="vertical"
        form={form}
        initialValues={{ amount: limit }}
        onFinish={({ amount }) => save(amount)}
      >
        <Form.Item
          label="Сумма, ₽"
          name="amount"
          rules={[
            ...required,
            {
              type: "number",
              min: 1,
              max: limit,
              message: "Допустимая сумма — от 1 до " + money(limit),
            },
          ]}
        >
          <InputNumber autoFocus {...numProps} max={limit} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
