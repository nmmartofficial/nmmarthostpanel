export const buildBannerActionFields = ({ linkType, productIds = [], categoryId, targetUrl }) => {
  if (linkType === 'product') {
    const uniqueProductIds = [...new Set(productIds.map((id) => String(id).trim()).filter(Boolean))];
    return {
      link_type: 'product',
      link_id: JSON.stringify(uniqueProductIds),
      linked_product_id: uniqueProductIds[0] || null,
      action_type: 'product',
      action_value: uniqueProductIds[0] || null,
      link_url: null
    };
  }

  if (linkType === 'category') {
    const id = String(categoryId || '').trim();
    return {
      link_type: 'category',
      link_id: id,
      linked_product_id: null,
      action_type: 'category',
      action_value: id,
      link_url: null
    };
  }

  if (linkType === 'url') {
    const url = String(targetUrl || '').trim();
    return {
      link_type: 'url',
      link_id: null,
      linked_product_id: null,
      action_type: 'url',
      action_value: url,
      link_url: url
    };
  }

  return {
    link_type: 'none',
    link_id: null,
    linked_product_id: null,
    action_type: 'none',
    action_value: null,
    link_url: null
  };
};
