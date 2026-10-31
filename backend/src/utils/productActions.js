const ApiError = require('./ApiError');

// Money is handled in paise (integers) so totals never suffer floating-point drift.
const toPaise = (rupees) => Math.round(Number(rupees) * 100);
const toRupees = (paise) => paise / 100;

/** Stock is limited by stock_quantity only when stock is managed and backorders are not allowed. */
const isStockLimited = (product) => product.manage_stock !== false && product.backorders === 'no';

/** Why a product cannot be bought right now, or null when it can. */
function unavailableReason(product) {
  if (product.status !== 1) return 'PRODUCT_INACTIVE'; // draft and inactive products cannot be bought
  if (product.manage_stock === false) return product.stock_status === 'outofstock' ? 'OUT_OF_STOCK' : null;
  if (product.stock_quantity < 1 && product.backorders === 'no') return 'OUT_OF_STOCK';
  return null;
}

/** The price the customer pays now: the sale price while a sale is in force, otherwise the regular price. */
const unitPrice = (product) => (product.effective_price !== undefined ? product.effective_price : product.selling_price);

/**
 * The add_to_cart / buy_now buttons the frontend shows for one product.
 * `enabled` / `disabled_reason` tell it whether to enable the button; `endpoint` + `body` tell it what to call.
 * baseUrl is the mount path of the product routes (e.g. /api/v1/products).
 */
function buildActions(product, baseUrl) {
  const reason = unavailableReason(product);
  const common = {
    visible: true,
    enabled: reason === null,
    disabled_reason: reason,
    method: 'POST',
    default_quantity: 1,
    min_quantity: 1,
    max_quantity: reason !== null ? 0 : (isStockLimited(product) ? product.stock_quantity : null), // null = no limit
    body: { quantity: 1 },
  };
  return {
    add_to_cart: { ...common, label: 'Add to Cart', endpoint: `${baseUrl}/${product.id}/add-to-cart` },
    buy_now: { ...common, label: 'Buy Now', endpoint: `${baseUrl}/${product.id}/buy-now`, completes_purchase: false },
  };
}

/**
 * Stock / quantity rules shared by Add to Cart and Buy Now (and reusable by a future cart or order module).
 * Throws 409 when the product is inactive, out of stock, or fewer units are in stock than requested.
 * This is a check at one moment in time: the step that really takes the stock (placing the order) must
 * re-check inside its own database transaction.
 */
function assertPurchasable(product, quantity) {
  const reason = unavailableReason(product);
  if (reason === 'PRODUCT_INACTIVE') throw new ApiError(409, 'Product is not available', ['This product is currently inactive']);
  if (reason === 'OUT_OF_STOCK') throw new ApiError(409, 'Product is out of stock', ['No stock is available for this product']);
  if (isStockLimited(product) && quantity > product.stock_quantity) {
    throw new ApiError(409, 'Insufficient stock', [`Only ${product.stock_quantity} unit(s) available, requested ${quantity}`]);
  }
}

/** One purchasable line: unit prices from the product, totals for the validated quantity. */
function buildLine(product, quantity) {
  return {
    product_id: product.id,
    product_name: product.product_name,
    brand: product.brand,
    image_url: product.image_url,
    quantity,
    unit_price: unitPrice(product),
    mrp: product.mrp,
    gst_percent: product.gst_percent,
    line_total: toRupees(toPaise(unitPrice(product)) * quantity),
    stock_quantity: product.stock_quantity,
  };
}

/** Checkout price summary for one line (prices are GST-inclusive). */
function buildPriceSummary(product, quantity) {
  const mrpTotal = toPaise(product.mrp) * quantity;
  const total = toPaise(unitPrice(product)) * quantity;
  return { mrp_total: toRupees(mrpTotal), discount_total: toRupees(mrpTotal - total), total_payable: toRupees(total) };
}

module.exports = { unavailableReason, buildActions, assertPurchasable, buildLine, buildPriceSummary };
  