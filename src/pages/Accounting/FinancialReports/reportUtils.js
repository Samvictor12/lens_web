export const fmt = (v, sign = true) => {
  const n = parseFloat(v || 0);
  const s = `₹${Math.abs(n).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
  return n < 0 ? `-${s}` : s;
};

export const todayInputDate = () => {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
};
