const crypto = require('crypto');
const { pool } = require('../config/db');
const razorpay = require('../services/razorpay');
const orders = require('../services/orderService');

// POST /api/webhooks/razorpay - configure in the Razorpay Dashboard (events: payment.captured, payment.failed, order.paid, refund.processed).
// The signature is checked against the RAW request body; a repeated delivery of the same event id is ignored.
exports.razorpayWebhook = async (req, res, next) => {
  try {
    const raw = req.rawBody;
    const signature = req.get('x-razorpay-signature');
    if (!raw || !signature || !razorpay.verifyWebhookSignature(raw, signature)) return res.status(400).json({ success: false, message: 'Invalid signature' });

    const event = req.body || {};
    const eventId = req.get('x-razorpay-event-id') || crypto.createHash('sha256').update(raw).digest('hex');
    const [ins] = await pool.execute('INSERT IGNORE INTO webhook_event (event_id, event_type) VALUES (?, ?)', [eventId, String(event.event || '').slice(0, 60)]);
    if (!ins.affectedRows) return res.json({ success: true, message: 'Already processed' });

    try {
      const payment = event.payload && event.payload.payment && event.payload.payment.entity;
      switch (event.event) {
        case 'payment.captured':
        case 'order.paid': {
          const orderId = (payment && payment.order_id) || (event.payload.order && event.payload.order.entity && event.payload.order.entity.id);
          if (orderId && payment && payment.id) await orders.markPaid({ razorpayOrderId: orderId, paymentId: payment.id, signatureVerified: true });
          break;
        }
        case 'payment.failed':
          if (payment && payment.order_id) await orders.markPaymentFailed({ razorpayOrderId: payment.order_id, paymentId: payment.id, message: payment.error_description });
          break;
        case 'refund.processed': {
          const refund = event.payload.refund && event.payload.refund.entity;
          if (refund) await orders.recordExternalRefund({ paymentId: refund.payment_id, refundId: refund.id, amountPaise: refund.amount });
          break;
        }
        default: break; // other events are acknowledged and ignored
      }
    } catch (err) {
      await pool.execute('DELETE FROM webhook_event WHERE event_id = ?', [eventId]).catch(() => {}); // let Razorpay retry
      throw err;
    }
    res.json({ success: true });
  } catch (err) { next(err); }
};
