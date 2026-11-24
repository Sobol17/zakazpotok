import ExcelJS from "exceljs";
import { price } from "./model.js";

export async function estimateWorkbook(order) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Смета", {
    views: [{ showGridLines: false }],
    pageSetup: { paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  sheet.columns = [{ width: 50 }, { width: 12 }, { width: 19 }, { width: 21 }];
  sheet.mergeCells("A1:D1");
  sheet.getCell("A1").value = "Смета к заказу № " + order.id;
  sheet.getCell("A1").font = {
    bold: true,
    size: 18,
    color: { argb: "FF56394A" },
  };
  sheet.getRow(1).height = 34;
  for (const [label, value] of [
    ["Клиент", order.client],
    ["Объект", order.address],
    ["Изделие", order.product],
    ["Статус сметы", order.stage < 3 ? "Предварительная" : "Согласована"],
  ]) {
    const row = sheet.addRow([label, value]);
    sheet.mergeCells(row.number, 2, row.number, 4);
    row.getCell(2).alignment = { wrapText: true, vertical: "middle" };
    row.height = Math.max(20, Math.ceil(value.length / 50) * 17);
  }
  sheet.addRow([]);
  const header = sheet.addRow([
    "Материалы и работы",
    "Кол-во",
    "Цена, ₽",
    "Сумма, ₽",
  ]);
  header.height = 23;
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF56394A" },
    };
  });
  const first = header.number + 1;
  for (const line of order.lines) {
    const row = sheet.addRow([line.name, line.qty, line.rate]);
    const n = row.number;
    row.getCell(1).alignment = { wrapText: true, vertical: "middle" };
    row.height = Math.max(21, Math.ceil(line.name.length / 40) * 17);
    row.getCell(4).value = {
      formula: "ROUND(B" + n + "*C" + n + ",0)",
      result: Math.round(line.qty * line.rate),
    };
    for (const col of [3, 4]) row.getCell(col).numFmt = "#,##0";
  }
  const last = sheet.rowCount;
  const total = sheet.addRow(["Итого, ₽"]);
  total.getCell(4).value = {
    formula: "SUM(D" + first + ":D" + last + ")",
    result: price(order.lines),
  };
  total.getCell(4).numFmt = "#,##0";
  total.font = { bold: true, color: { argb: "FF56394A" } };
  total.height = 25;
  return workbook.xlsx.writeBuffer();
}

export async function downloadWorkbook(order) {
  const bytes = await estimateWorkbook(order);
  const url = URL.createObjectURL(
    new Blob([bytes], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "Смета-" + order.id + ".xlsx";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
