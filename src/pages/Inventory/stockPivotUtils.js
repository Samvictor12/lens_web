const MAX_PIVOT_COLUMNS = 50;

export function buildAttributeLabel(item) {
  const sph = item.rightSpherical || item.leftSpherical || "0";
  const cyl = item.rightCylindrical || item.leftCylindrical || "0";
  const add = item.rightAdd || item.leftAdd || "0";
  const parts = [
    item.lensProduct?.lens_name || `Lens #${item.lens_id}`,
    item.lensType?.name && `Type=${item.lensType.name}`,
    `Sph=${sph}`,
    `Cyl=${cyl}`,
    `Add=${add}`,
    item.coating?.name && `Coating=${item.coating.name}`,
  ].filter(Boolean);
  return parts.join(" · ");
}

/**
 * Reshape flat inventory items into pivot rows × tray columns (under location headers).
 */
export function buildPivotFromItems(items, maxColumns = MAX_PIVOT_COLUMNS) {
  const rowMap = {};
  const colMap = new Map();

  items.forEach((item) => {
    const sph = item.rightSpherical || item.leftSpherical || "0";
    const cyl = item.rightCylindrical || item.leftCylindrical || "0";
    const add = item.rightAdd || item.leftAdd || "0";
    const rowKey = `${item.lens_id}|${item.category_id ?? ""}|${item.Type_id ?? ""}|${item.coating_id ?? ""}|${sph}|${cyl}|${add}`;
    const colKey = `${item.location_id ?? "x"}|${item.tray_id ?? "x"}`;
    const qty = item.quantity || 0;

    if (!rowMap[rowKey]) {
      rowMap[rowKey] = {
        rowKey,
        label: buildAttributeLabel(item),
        cells: {},
        total: 0,
      };
    }
    rowMap[rowKey].cells[colKey] = (rowMap[rowKey].cells[colKey] || 0) + qty;
    rowMap[rowKey].total += qty;

    if (!colMap.has(colKey)) {
      colMap.set(colKey, {
        colKey,
        location_id: item.location_id,
        locationName: item.location?.name || "Unknown",
        tray_id: item.tray_id,
        trayName: item.tray?.name || item.tray?.tray_name || "No Tray",
      });
    }
  });

  let columns = Array.from(colMap.values()).sort((a, b) => {
    const loc = a.locationName.localeCompare(b.locationName);
    if (loc !== 0) return loc;
    return a.trayName.localeCompare(b.trayName);
  });

  const truncated = columns.length > maxColumns;
  if (truncated) {
    columns = columns.slice(0, maxColumns);
  }

  const locationGroups = [];
  columns.forEach((col) => {
    const last = locationGroups[locationGroups.length - 1];
    if (last && last.location_id === col.location_id) {
      last.columns.push(col);
    } else {
      locationGroups.push({
        location_id: col.location_id,
        locationName: col.locationName,
        columns: [col],
      });
    }
  });

  const rows = Object.values(rowMap).sort((a, b) =>
    a.label.localeCompare(b.label)
  );

  return { rows, columns, locationGroups, truncated };
}

export function pivotToExportRows(pivot) {
  const columns = ["Product & Attributes", ...pivot.columns.map((c) => `${c.locationName} / ${c.trayName}`), "Total"];
  const rows = pivot.rows.map((row) => [
    row.label,
    ...pivot.columns.map((col) => row.cells[col.colKey] || 0),
    row.total,
  ]);
  return { columns, rows };
}
