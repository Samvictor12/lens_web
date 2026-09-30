/**
 * 25mm x 10mm Job Card — Left QR, Right text (TSPL).
 */
function buildJobCardTspl(orderNo, ref, dateStr) {
  const refSafe = String(ref || '-').replace(/"/g, "'");
  const noSafe = String(orderNo || '').replace(/"/g, "'");
  const dtSafe = String(dateStr || '').replace(/"/g, "'");

  return (
    'SIZE 25 mm, 10 mm\r\n' +
    'GAP 2 mm, 0\r\n' +
    'DIRECTION 1\r\n' +
    'CLS\r\n' +
    `QRCODE 15,8,L,2,A,0,"${noSafe}"\r\n` +
    `TEXT 95,6,"0",0,1,1,"${noSafe}"\r\n` +
    `TEXT 95,28,"0",0,1,1,"Ref: ${refSafe}"\r\n` +
    `TEXT 95,48,"0",0,1,1,"${dtSafe}"\r\n` +
    'PRINT 1\r\n'
  );
}

module.exports = {
  buildJobCardTspl,
};
