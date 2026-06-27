/** True when a numeric field displays zero and should clear on focus */
export function isZeroDisplayValue(value) {
  if (value === 0 || value === "0" || value === "0.0" || value === "0.00") {
    return true;
  }
  const n = parseFloat(value);
  return !Number.isNaN(n) && n === 0;
}

export function clearZeroOnFocusHandler(value, onChange) {
  return (e) => {
    if (isZeroDisplayValue(value)) {
      onChange?.({
        ...e,
        target: {
          name: e.target.name,
          value: "",
          type: e.target.type,
        },
      });
    }
  };
}
