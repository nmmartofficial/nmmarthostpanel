
export const calculateItemGST = (price, gstRate) => {
  return (price * gstRate) / 100;
};

export const calculateTotalGST = (cart) => {
  const gstBreakdown = {};
  let totalGST = 0;

  cart.forEach((item) => {
    const itemTotal = item.price * item.quantity;
    const discountAmount = item.discount
      ? item.discount.type === 'percentage'
        ? itemTotal * (item.discount.value / 100)
        : item.discount.value
      : 0;
    const taxableAmount = itemTotal - discountAmount;
    const gstAmount = calculateItemGST(taxableAmount, item.gst || 0);

    if (!gstBreakdown[item.gst]) {
      gstBreakdown[item.gst] = 0;
    }
    gstBreakdown[item.gst] += gstAmount;
    totalGST += gstAmount;
  });

  return { totalGST, gstBreakdown };
};
