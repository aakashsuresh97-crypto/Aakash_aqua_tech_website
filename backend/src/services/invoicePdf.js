// Tax invoice PDF (pdfkit, built-in Helvetica font, so the rupee sign is written as "Rs.").
const PDFDocument = require('pdfkit');

const company = () => ({
  name: process.env.COMPANY_NAME || 'Aakash Pure Aqua Tech Pvt Ltd',
  address: process.env.COMPANY_ADDRESS || '10/62C, Brindavan Road, 1st Cross (Behind Dr. Sudamani Hospital), Fairlands, Salem, Tamil Nadu 636016',
  gstin: process.env.COMPANY_GSTIN || '',
  state: process.env.COMPANY_STATE || 'Tamil Nadu',
  phone: process.env.COMPANY_PHONE || '96555 77666',
  email: process.env.COMPANY_EMAIL || 'ceo@aakashaquatech.in',
});
const rs = (n) => `Rs. ${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });

/** order: DB row of orders; items: DB rows of order_items. Resolves with a Buffer. */
function buildInvoicePdf(order, items) {
  const co = company();
  const sameState = String(order.ship_state).trim().toLowerCase() === co.state.toLowerCase();
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40, info: { Title: `Invoice ${order.invoice_number}`, Author: co.name } });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const L = 40; const R = 555;
    doc.font('Helvetica-Bold').fontSize(16).text(co.name, L, 40);
    doc.font('Helvetica').fontSize(9).fillColor('#444').text(co.address, L, 60, { width: 300 });
    doc.text(`Phone: ${co.phone}   Email: ${co.email}`, L, doc.y + 2, { width: 300 });
    if (co.gstin) doc.text(`GSTIN: ${co.gstin}`, L, doc.y + 2);
    doc.fillColor('#000').font('Helvetica-Bold').fontSize(18).text('TAX INVOICE', 380, 40, { width: 175, align: 'right' });
    doc.font('Helvetica').fontSize(9).text(`Invoice no: ${order.invoice_number}`, 380, 64, { width: 175, align: 'right' });
    doc.text(`Date: ${fmtDate(order.invoice_date || order.placed_at)}`, 380, 77, { width: 175, align: 'right' });
    doc.text(`Order no: ${order.order_number}`, 380, 90, { width: 175, align: 'right' });

    let y = 125;
    doc.moveTo(L, y).lineTo(R, y).strokeColor('#bbb').stroke();
    y += 10;
    doc.font('Helvetica-Bold').fontSize(9).text('Bill to / Ship to', L, y);
    doc.font('Helvetica').text(`${order.ship_name}\n${order.ship_line1}${order.ship_line2 ? `, ${order.ship_line2}` : ''}\n${order.ship_city}, ${order.ship_state} - ${order.ship_pin}\nMobile: ${order.ship_mobile}`, L, y + 13, { width: 260 });
    doc.font('Helvetica-Bold').text('Payment', 330, y);
    const pay = order.payment_method === 'cod' ? 'Cash on Delivery' : 'Online (Razorpay)';
    doc.font('Helvetica').text(`${pay}\nStatus: ${order.payment_status.replace('_', ' ')}${order.razorpay_payment_id ? `\nRef: ${order.razorpay_payment_id}` : ''}`, 330, y + 13, { width: 225 });

    y = 215;
    const cols = [[L, 'Item', 190, 'left'], [230, 'Qty', 30, 'right'], [262, 'Rate', 62, 'right'], [326, 'Taxable', 66, 'right'], [394, 'GST %', 38, 'right'], [434, 'GST', 56, 'right'], [492, 'Amount', 63, 'right']];
    doc.rect(L, y, R - L, 18).fill('#eef3f4').fillColor('#000');
    doc.font('Helvetica-Bold').fontSize(8.5);
    cols.forEach(([x, t, w, a]) => doc.text(t, x + 2, y + 5, { width: w - 4, align: a }));
    y += 22;
    doc.font('Helvetica').fontSize(8.5);
    for (const it of items) {
      const name = `${it.product_name}${it.sku ? ` (SKU ${it.sku})` : ''}`;
      const h = Math.max(14, doc.heightOfString(name, { width: 186 }) + 4);
      if (y + h > 760) { doc.addPage(); y = 40; }
      const rate = Number(it.taxable_value) / it.quantity;
      const row = [name, String(it.quantity), rs(rate), rs(it.taxable_value), `${Number(it.gst_percent)}`, rs(it.gst_amount), rs(it.line_total)];
      cols.forEach(([x, , w, a], i) => doc.text(row[i], x + 2, y, { width: w - 4, align: a }));
      y += h;
      doc.moveTo(L, y - 2).lineTo(R, y - 2).strokeColor('#e3e3e3').stroke();
    }

    const taxable = items.reduce((s, i) => s + Number(i.taxable_value), 0);
    const gst = items.reduce((s, i) => s + Number(i.gst_amount), 0);
    if (y > 650) { doc.addPage(); y = 40; }
    y += 8;
    const line = (label, value, bold) => {
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 10 : 9).text(label, 330, y, { width: 130 }).text(value, 460, y, { width: 95, align: 'right' });
      y += bold ? 16 : 13;
    };
    line('Taxable value', rs(taxable));
    if (sameState) { line('CGST', rs(gst / 2)); line('SGST', rs(gst / 2)); } else line('IGST', rs(gst));
    if (Number(order.shipping_total) > 0) line('Shipping', rs(order.shipping_total));
    line('Invoice total (incl. GST)', rs(order.total), true);
    if (Number(order.refund_amount) > 0) line('Refunded', `- ${rs(order.refund_amount)}`);

    doc.font('Helvetica').fontSize(8).fillColor('#555').text('Prices are inclusive of GST. This is a computer-generated invoice. Free installation and 24-hour service by Aakash Pure Aqua Tech.', L, 780, { width: R - L, align: 'center' });
    doc.end();
  });
}

module.exports = { buildInvoicePdf };
