function buildDeleteCheckedOutCartItemsSql({ userId, cartItemIds }) {
  if (!Array.isArray(cartItemIds) || cartItemIds.length === 0) {
    throw new Error('cartItemIds must not be empty');
  }

  if (!cartItemIds.every((id) => Number.isFinite(id))) {
    throw new Error('cartItemIds must contain only finite numbers');
  }

  const placeholders = cartItemIds.map(() => '?').join(',');

  return {
    sql: `DELETE FROM cart_items WHERE user_id = ? AND id IN (${placeholders})`,
    params: [userId, ...cartItemIds],
  };
}

module.exports = {
  buildDeleteCheckedOutCartItemsSql,
};
