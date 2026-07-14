import fs from 'fs';
import path from 'path';

const filePath = path.resolve('src/pages/SaleOrder/SaleOrderForm.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Find the Left Eye table rows block starting with {fifoMatches.leftEyeMatches.map
const mapStartIndex = content.indexOf('{fifoMatches.leftEyeMatches.map');
if (mapStartIndex === -1) {
  console.error("Could not find leftEyeMatches.map in SaleOrderForm.jsx");
  process.exit(1);
}

// Let's replace the whole tr block within the map
const trStartIndex = content.indexOf('<tr', mapStartIndex);
const trEndIndex = content.indexOf('</tr>', trStartIndex) + 5;

const oldTr = content.substring(trStartIndex, trEndIndex);

const newTr = `<tr
                                                         key={item.id}
                                                         onClick={() => setSelectedFifoItems(prev => ({ ...prev, leftEyeItemId: item.id }))}
                                                         className={\`hover:bg-slate-50/50 cursor-pointer transition-colors \${selectedFifoItems.leftEyeItemId === item.id ? item.isReceipt ? "bg-purple-50/40 border-purple-200 font-medium" : "bg-blue-50/30 border-blue-200 font-medium" : item.isReceipt ? "bg-purple-50/10 hover:bg-purple-50/20" : ""}\`}
                                                     >
                                                         <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                             <input
                                                                 type="radio"
                                                                 name="leftEyeItem"
                                                                 checked={selectedFifoItems.leftEyeItemId === item.id}
                                                                 onChange={() => setSelectedFifoItems(prev => ({ ...prev, leftEyeItemId: item.id }))}
                                                                 className="h-4 w-4 text-purple-600 border-slate-300 focus:ring-purple-500"
                                                             />
                                                         </td>
                                                         <td className="p-3 text-slate-700 flex items-center gap-2">
                                                             {idx === 0 && !item.isReceipt && (
                                                                 <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border border-amber-200 text-[10px] py-0 px-1.5 uppercase font-bold">Oldest / FIFO</Badge>
                                                             )}
                                                             {item.isReceipt && (
                                                                 <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 border border-purple-200 text-[10px] py-0 px-1.5 uppercase font-bold">Inward Queue</Badge>
                                                             )}
                                                             {item.inwardDate ? new Date(item.inwardDate).toLocaleDateString("en-IN", {
                                                                 day: "2-digit",
                                                                 month: "short",
                                                                 year: "numeric"
                                                             }) : "—"}
                                                         </td>
                                                         <td className="p-3">
                                                             {item.sourceType === 'RX' ? (
                                                                 <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border border-green-200 text-[10px] py-0 px-1.5 font-bold uppercase">
                                                                     RX {item.poNumber ? \`(\${item.poNumber})\` : ''}
                                                                 </Badge>
                                                             ) : (
                                                                 <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border border-blue-200 text-[10px] py-0 px-1.5 font-bold uppercase">
                                                                     Stock
                                                                 </Badge>
                                                             )}
                                                         </td>
                                                         <td className="p-3 font-semibold text-slate-800">
                                                             {item.isReceipt ? (
                                                                 <span className="text-purple-700 bg-purple-50/70 px-2 py-0.5 rounded border border-purple-100 text-[11px] font-medium">
                                                                     Pending Inward
                                                                 </span>
                                                             ) : item.tray ? (
                                                                 \`\${item.tray.name} (Cap: \${item.tray.capacity})\`
                                                             ) : (
                                                                 "N/A"
                                                             )}
                                                         </td>
                                                         <td className="p-3 text-slate-600">
                                                             {item.isReceipt ? (
                                                                 <span className="text-purple-600 font-semibold">Inward Queue</span>
                                                             ) : item.location ? (
                                                                 item.location.name
                                                             ) : (
                                                                 "N/A"
                                                             )}
                                                         </td>`;

content = content.replace(oldTr, newTr);
fs.writeFileSync(filePath, content, 'utf8');
console.log("Successfully updated Left Eye row matches in SaleOrderForm.jsx");
